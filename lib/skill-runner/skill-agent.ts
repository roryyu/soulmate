/**
 * 技能执行代理（agentic loop 编排器）。
 *
 * 完整链路：
 *   提示词「调用 xxx 技能实现 xxx 功能」
 *     → 列出 skills/ 下所有技能（name + description）
 *     → 调 LLM 选出该用哪个技能（或 fast-path 名称匹配）
 *     → 读取该技能 SKILL.md 正文（说明书）
 *     → 通用环境准备（工作目录 / PATH / 工具探测）
 *     → loop：把「说明书 + 环境 + 历史执行结果」交给 LLM，LLM 返回要执行的命令
 *             → 执行脚本 → 捕获输出作为观察 → 再交回 LLM → 直到 finish / ask_user / 超上限
 *     → 汇总最终答复 + 产物 + 每步记录
 *
 * 通用性保证：本文件不含任何具体技能（如 ffmpeg）的专属逻辑，全部由 SKILL.md 驱动。
 */
import { listSkills, loadSkill, matchSkillByName, defaultSkillsDir } from './skill-registry';
import { prepareEnvironment, listArtifacts } from './environment';
import { executeCommand, normalizeCommand } from './command-executor';
import { createLLMProvider, extractJsonObject } from './llm-provider';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  AgentAction,
  AgentStep,
  CommandObservation,
  LLMProvider,
  RunSkillTaskOptions,
  Skill,
  SkillMeta,
  SkillRunEnvironment,
  SkillRunnerEvents,
  SkillTaskResult,
} from './types';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** 主入口：用自然语言提示词驱动一个技能完成任务 */
export async function runSkillTask(
  prompt: string,
  options: RunSkillTaskOptions = {}
): Promise<SkillTaskResult> {
  const startedAt = Date.now();
  const events = options.events ?? {};
  const skillsDir = options.skillsDir ?? defaultSkillsDir();
  const maxIterations = options.maxIterations ?? 10;
  const llm: LLMProvider = options.llm ?? createLLMProvider({ model: options.model });

  const emit = (level: 'info' | 'warn' | 'error' | 'debug', msg: string) => events.onLog?.(level, msg);

  // ─── 阶段 1：列出可用技能 ─────────────────────────────────
  events.onProgress?.('listing_skills', skillsDir);
  const skills = await listSkills(skillsDir);
  if (skills.length === 0) {
    return errorResult('unknown', '', startedAt, `在 ${skillsDir} 下没有找到任何技能（需包含 SKILL.md 的子目录）`);
  }
  emit('info', `发现 ${skills.length} 个技能: ${skills.map((s) => s.name).join(', ')}`);

  // ─── 阶段 2：选择技能 ─────────────────────────────────────
  let skillName = options.skill ?? matchSkillByName(prompt, skills);
  let selectReason = options.skill ? '调用方显式指定' : skillName ? '名称快速匹配' : '';
  if (!skillName) {
    events.onProgress?.('selecting_skill');
    const selection = await selectSkillByLLM(prompt, skills, llm, options.temperature);
    skillName = selection.skill;
    selectReason = selection.reason;
    if (!skillName) {
      return errorResult(
        'unknown',
        '',
        startedAt,
        `没有匹配的技能可完成该请求。可用技能: ${skills.map((s) => s.name).join(', ')}`,
        'finished'
      );
    }
  }
  emit('info', `选中技能: ${skillName}（${selectReason}）`);

  // ─── 阶段 3：加载技能（读取 SKILL.md 正文） ────────────────
  events.onProgress?.('loading_skill', skillName);
  const skill = await loadSkill(skillName, skillsDir);
  if (!skill) {
    return errorResult(skillName, '', startedAt, `技能 "${skillName}" 加载失败（找不到 SKILL.md）`);
  }

  // ─── 阶段 4：环境准备 ─────────────────────────────────────
  events.onProgress?.('preparing_env', skill.name);
  const env = await prepareEnvironment(skill, options.baseWorkDir, options.extraEnv);
  emit('info', `工作目录: ${env.workDir}`);
  emit(
    'info',
    `可用工具: ${Object.entries(env.tools)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ') || '(无)'}`
  );

  // ─── 阶段 5：agentic loop ─────────────────────────────────
  const systemPrompt = buildSystemPrompt(skill, env, options.context);
  const messages: ChatMessage[] = [{ role: 'user', content: buildFirstUserMessage(prompt, options.context) }];

  const steps: AgentStep[] = [];
  const repeated = new Map<string, number>();
  let iterations = 0;
  let commandCount = 0;
  let stopReason: SkillTaskResult['stopReason'] = 'max_iterations';
  let finalAnswer = '';
  let question: string | undefined;
  let declaredArtifacts: string[] = [];
  let runError: string | undefined;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    events.onProgress?.('planning', `第 ${iterations} 轮`);

    // 5.1 让 LLM 决策下一步
    const llmStart = Date.now();
    let raw = '';
    try {
      raw = await llm.complete(messages, {
        systemPrompt,
        jsonMode: true,
        temperature: options.temperature ?? 0.2,
        maxTokens: 2048,
      });
    } catch (err: unknown) {
      runError = err instanceof Error ? err.message : String(err);
      emit('error', `LLM 调用失败: ${runError}`);
      stopReason = 'error';
      break;
    }
    const llmDurationMs = Date.now() - llmStart;

    const action = extractJsonObject<AgentAction>(raw);
    if (!action || !action.action) {
      // JSON 不合法：提示纠正一次
      emit('warn', `第 ${iterations} 轮 LLM 未返回合法 JSON，提示纠正`);
      messages.push({ role: 'assistant', content: raw });
      messages.push({
        role: 'user',
        content: '你的上一条回复不是合法 JSON。请严格只输出一个 JSON 对象（action 为 run/finish/ask_user）。',
      });
      // 不消耗 step，直接进入下一轮（但受 maxIterations 限制）
      continue;
    }

    messages.push({ role: 'assistant', content: JSON.stringify(action) });

    // 5.2 finish
    if (action.action === 'finish') {
      finalAnswer = String(action.final_answer ?? '').trim();
      declaredArtifacts = Array.isArray(action.artifacts) ? action.artifacts.map(String) : [];
      stopReason = 'finished';
      steps.push({ index: iterations, action, llmDurationMs });
      events.onStep?.(steps[steps.length - 1]);
      events.onProgress?.('finished');
      break;
    }

    // 5.3 ask_user
    if (action.action === 'ask_user') {
      question = String(action.question ?? '需要更多信息').trim();
      finalAnswer = question;
      stopReason = 'ask_user';
      steps.push({ index: iterations, action, llmDurationMs });
      events.onStep?.(steps[steps.length - 1]);
      break;
    }

    // 5.4 run
    if (action.action === 'run') {
      if (!action.command) {
        messages.push({ role: 'user', content: 'action=run 必须提供 command（argv 数组）。请修正后重新输出 JSON。' });
        steps.push({ index: iterations, action, llmDurationMs });
        continue;
      }
      // 通用护栏：把 LLM 偶发漏抄技能层的输出路径规整回本次 workDir，再预建父目录。
      const argv = normalizeOutputPaths(normalizeCommand(action.command), env);
      // 重复失败命令的护栏
      const key = argv.join(' ');
      const seen = (repeated.get(key) ?? 0) + 1;
      repeated.set(key, seen);

      events.onProgress?.('executing', key);
      await ensureOutputDirs(argv, env.workRoot);
      const observation = await executeCommand(argv, {
        cwd: skill.dir, // 命令 cwd = 技能目录，使 SKILL.md 里的相对脚本路径可用
        env: env.env,
        timeoutMs: options.commandTimeoutMs ?? 120000,
        maxOutputBytes: options.maxOutputBytes ?? 1024 * 1024,
        shell: options.allowShell ?? false,
        events,
        runId: env.runId,
      });
      commandCount++;
      events.onProgress?.('observing', `退出码 ${observation.exitCode}`);

      const step: AgentStep = { index: iterations, action, observation, llmDurationMs };
      steps.push(step);
      events.onStep?.(step);

      // 把观察结果喂回 LLM
      let obsText = formatObservation(observation);
      if (observation.exitCode !== 0 && seen >= 2) {
        obsText += `\n\n[系统提示] 这已经是第 ${seen} 次执行同一条失败命令。请改变策略（换参数/换脚本/先探测），或用 action=finish 说明无法完成的原因，不要重复同样的命令。`;
      }
      if (seen >= 4) {
        emit('warn', `命令重复失败 ${seen} 次，强制结束 loop`);
        runError = `命令重复失败 ${seen} 次: ${key}`;
        stopReason = 'aborted';
        break;
      }
      messages.push({ role: 'user', content: obsText + '\n\n请决定下一步，只输出 JSON。' });
      continue;
    }

    // 未知 action
    messages.push({ role: 'user', content: `未知的 action: "${action.action}"。只能是 run/finish/ask_user。请重新输出 JSON。` });
  }

  // ─── 阶段 6：汇总产物与结果 ───────────────────────────────
  const workDirArtifacts = await listArtifacts(env.workDir);
  const artifacts = dedup([...declaredArtifacts.filter(Boolean), ...workDirArtifacts]);

  if (stopReason === 'max_iterations' && !runError) {
    runError = `达到最大迭代次数 (${maxIterations}) 仍未完成`;
    finalAnswer = finalAnswer || '任务在限定步数内未完成。';
  }

  const result: SkillTaskResult = {
    success: stopReason === 'finished',
    runId: env.runId,
    skill: skill.name,
    skillDir: skill.dir,
    workDir: env.workDir,
    finalAnswer,
    artifacts,
    steps,
    commandCount,
    iterations,
    durationMs: Date.now() - startedAt,
    stopReason,
    error: runError,
    question,
  };
  emit('info', `任务结束: stopReason=${stopReason}, 命令数=${commandCount}, 迭代=${iterations}, 耗时=${result.durationMs}ms`);
  return result;
}

// ─── 内部：LLM 选技能 ────────────────────────────────────────────────────────

async function selectSkillByLLM(
  prompt: string,
  skills: SkillMeta[],
  llm: LLMProvider,
  temperature?: number
): Promise<{ skill: string | null; reason: string }> {
  const catalog = skills.map((s) => `- ${s.name}: ${truncate(s.description, 500) || '(无描述)'}`).join('\n');
  const system =
    '你是技能路由器。根据用户请求，从可用技能清单中选出最合适的一个技能名。' +
    '如果没有合适的技能，返回 null。只输出 JSON：{"skill": "技能名或null", "reason": "一句话理由"}';
  const user = `可用技能清单：\n${catalog}\n\n用户请求：${prompt}\n\n请选出最合适的技能，只输出 JSON。`;
  try {
    const raw = await llm.complete([{ role: 'user', content: user }], {
      systemPrompt: system,
      jsonMode: true,
      temperature: temperature ?? 0.1,
      maxTokens: 300,
    });
    const parsed = extractJsonObject<{ skill?: string | null; reason?: string }>(raw);
    const name = parsed?.skill && parsed.skill !== 'null' ? String(parsed.skill) : null;
    // 校验名字确实在清单里（防幻觉）
    const valid = name && skills.some((s) => s.name === name) ? name : null;
    return { skill: valid, reason: parsed?.reason ? String(parsed.reason) : 'LLM 选择' };
  } catch {
    return { skill: null, reason: 'LLM 选择失败' };
  }
}

// ─── 内部：系统提示词 ────────────────────────────────────────────────────────

function buildSystemPrompt(skill: Skill, env: SkillRunEnvironment, context?: string): string {
  const toolsLine = Object.entries(env.tools)
    .map(([k, v]) => `${k}=${v ?? '不可用'}`)
    .join(', ');
  const scriptsLine = skill.scripts.length ? skill.scripts.slice(0, 60).join('\n  ') : '(未发现脚本文件)';

  return `你是一个「技能执行代理」。你要使用下面这个技能来完成用户请求，通过多轮「执行命令 → 观察结果」的循环推进，直到任务完成。

# 技能
名称: ${skill.name}
简介: ${skill.description || '(无)'}

# 技能使用手册（SKILL.md 正文，务必严格遵循其中的工作流与约定）
${skill.instructions}

# 技能目录
技能根目录(绝对路径): ${skill.dir}
一级条目: ${skill.entries.join(', ') || '(空)'}
可执行脚本(相对技能根目录):
  ${scriptsLine}

# 运行环境
- 命令的工作目录(cwd)已设为技能根目录，因此可直接用相对路径调用脚本，例如 \`python3 scripts/xxx.py\`。
- 产物工作目录(绝对路径): ${env.workDir} —— 所有输出文件请用 -o/--output 等参数写成该目录下的绝对路径（请原样复制这个路径，不要省略或改写其中任何一层目录）。
- 可用工具探测: ${toolsLine}
- 脚本可读取环境变量: SKILL_DIR=${skill.dir}, SKILL_WORK_DIR=${env.workDir}

# 执行规则
1. 严格遵循上面的技能使用手册；手册若规定了步骤顺序（如先探测、再处理、最后校验），照做。
2. 所有输入文件路径必须用绝对路径；不要修改或覆盖用户的原始文件。
3. 一次只执行一条命令；command 用 argv 数组表示，禁止使用 shell 管道/&&/;/重定向（需要时把整条命令放进 ["bash","-c","..."]）。
4. 若本机缺少某能力（上面探测为“不可用”，或脚本报缺少依赖/滤镜），要么换可行方案，要么在最终答复里如实说明限制，不要假装成功。
5. 命令失败时，阅读 stderr 判断原因并修正（路径、参数、缺依赖等），不要原样重复同一条失败命令。
6. 若关键信息不足以做出会实质影响结果的选择，用 action=ask_user 提一个简短问题，不要臆测。
7. 完成后用 action=finish 给出面向用户的简洁中文答复，并在 artifacts 里列出产物文件的绝对路径。

# 输出格式（每一轮只输出一个 JSON 对象，禁止输出任何额外文字或代码块围栏）
{
  "thought": "本轮简短推理",
  "action": "run" | "finish" | "ask_user",
  "command": ["python3", "scripts/probe.py", "/abs/input.mp4", "--json"],
  "final_answer": "action=finish 时给用户的最终答复",
  "artifacts": ["/abs/output.mp4"],
  "question": "action=ask_user 时要问用户的问题"
}
其中：action=run 必须给 command；action=finish 必须给 final_answer（artifacts 可选）；action=ask_user 必须给 question。
${context ? `\n# 附加上下文\n${context}\n` : ''}`;
}

function buildFirstUserMessage(prompt: string, context?: string): string {
  return `用户请求：${prompt}

请开始执行。先按技能手册规划，然后输出本轮的 JSON 动作（通常是先探测/确认输入，再逐步处理）。`;
}

// ─── 内部：观察结果格式化 ────────────────────────────────────────────────────

function formatObservation(obs: CommandObservation): string {
  const parts: string[] = [];
  parts.push(`命令: ${obs.command.join(' ')}`);
  parts.push(`退出码: ${obs.exitCode}${obs.timedOut ? ' (超时被终止)' : ''}`);
  if (obs.json !== undefined) {
    parts.push('结构化输出(JSON):');
    parts.push(truncate(JSON.stringify(obs.json, null, 2), 6000));
  } else if (obs.stdout.trim()) {
    parts.push('stdout:');
    parts.push(truncate(obs.stdout.trim(), 4000));
  }
  if (obs.stderr.trim()) {
    parts.push('stderr(尾部):');
    parts.push(tail(obs.stderr.trim(), 1500));
  }
  if (obs.truncated) parts.push('(注意：输出过大已被截断)');
  return parts.join('\n');
}

// ─── 小工具 ──────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n...[截断 ${s.length - max} 字符]`;
}

function tail(s: string, max: number): string {
  if (s.length <= max) return s;
  return `...[省略前 ${s.length - max} 字符]\n` + s.slice(-max);
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * 通用输出路径护栏（与具体技能无关，只用 runId / workRoot / workDir 这些每次运行都有的概念）：
 * LLM 常把产物写到 workRoot 下、含本次 runId 但漏掉了技能层的路径，这里把它规整回真正的
 * workDir，保证产物集中，可被 listArtifacts 收集、被 cleanupWorkDir 清理。
 * 安全边界：只处理 workRoot（我们自己的 temp 区）之下、且含本次 runId 的路径，不碰用户其它目录。
 */
function normalizeOutputPaths(
  argv: string[],
  env: { workRoot: string; workDir: string; runId: string }
): string[] {
  const root = path.resolve(env.workRoot);
  const workDir = path.resolve(env.workDir);
  return argv.map((token) => {
    if (typeof token !== 'string' || !token.startsWith('/')) return token;
    const abs = path.resolve(token);
    // 不在工作根之下 → 不动（用户输入文件等）
    if (abs === root || !abs.startsWith(root + path.sep)) return token;
    // 已在真正的 workDir 之下 → 正确，不动
    if (abs === workDir || abs.startsWith(workDir + path.sep)) return token;
    // 在 workRoot 下但不在 workDir 下：若路径里含本次 runId，把它接到 workDir 之后
    const segs = abs.split(path.sep);
    const idx = segs.lastIndexOf(env.runId);
    if (idx === -1) return token; // 不含本次 runId，保持原样（仍由 ensureOutputDirs 兜底建目录）
    const tail = segs.slice(idx + 1);
    if (tail.length === 0) return token;
    return path.join(workDir, ...tail);
  });
}

/**
 * 为命令 argv 中「位于工作根目录之下」的绝对路径预建父目录。
 * mkdir 幂等，对已存在目录/输入文件无副作用。与具体技能无关。
 */
async function ensureOutputDirs(argv: string[], workRoot: string): Promise<void> {
  const root = path.resolve(workRoot);
  for (const token of argv) {
    if (typeof token !== 'string' || !token.startsWith('/')) continue;
    const abs = path.resolve(token);
    if (abs === root || !abs.startsWith(root + path.sep)) continue;
    try {
      await fs.mkdir(path.dirname(abs), { recursive: true });
    } catch {
      // 建目录失败不阻断执行，交由脚本自行报错
    }
  }
}

function errorResult(
  skill: string,
  skillDir: string,
  startedAt: number,
  message: string,
  stopReason: SkillTaskResult['stopReason'] = 'error'
): SkillTaskResult {
  return {
    success: false,
    runId: 'none',
    skill,
    skillDir,
    workDir: '',
    finalAnswer: message,
    artifacts: [],
    steps: [],
    commandCount: 0,
    iterations: 0,
    durationMs: Date.now() - startedAt,
    stopReason,
    error: message,
  };
}
