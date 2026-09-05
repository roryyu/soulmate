/**
 * 通用技能运行器（Skill Runner）类型定义
 *
 * 设计目标：与具体技能无关。新增一个技能（在 skills/ 下放一个含 SKILL.md 的目录）
 * 不需要改动这里的任何代码。整个执行流程由「大模型读 SKILL.md → 决定命令 → 执行 →
 * 观察结果 → 再决定」的 loop 驱动。
 *
 * 参考实现：/Users/roryyu/Downloads/code/mycode/doubao/skill-runner
 * 与之区别：参考实现是「声明式单脚本 + LLM 检查点」；这里是「Agent Skill 格式 +
 * 由 LLM 自主编排命令的 agentic loop」，因此对任意技能通用。
 */

// ─── 技能元信息（来自 SKILL.md 的 YAML frontmatter） ──────────────────────────

/** SKILL.md frontmatter 解析后的原始键值对（保留全部字段，供扩展使用） */
export type SkillFrontmatter = Record<string, unknown>;

/** 技能摘要：用于「让 LLM 选择技能」阶段，只包含发现/选择所需的最小信息 */
export interface SkillMeta {
  /** 技能名（frontmatter.name，缺省时用目录名） */
  name: string;
  /** 一句话描述（frontmatter.description），LLM 依据它判断该用哪个技能 */
  description: string;
  /** 技能目录的绝对路径 */
  dir: string;
  /** SKILL.md 的绝对路径 */
  skillMdPath: string;
  /** frontmatter 里的其它字段（如 license / allowed-tools / metadata 等） */
  frontmatter: SkillFrontmatter;
}

/** 已完整加载的技能：包含 SKILL.md 正文（给 LLM 看的说明书） */
export interface Skill extends SkillMeta {
  /** SKILL.md 去掉 frontmatter 后的正文（Markdown 说明书） */
  instructions: string;
  /** 技能目录下的可执行脚本相对路径清单（scripts/*.py|*.sh|*.js 等，尽力探测） */
  scripts: string[];
  /** 技能目录下的一级文件/目录名，帮助 LLM 了解结构 */
  entries: string[];
}

// ─── 运行环境 ────────────────────────────────────────────────────────────────

/** 一次运行的环境上下文（通用，不含任何技能专属字段） */
export interface SkillRunEnvironment {
  /** 本次运行唯一 ID */
  runId: string;
  /** 技能目录绝对路径 */
  skillDir: string;
  /** 本次运行的工作目录（产物/临时文件默认写这里），绝对路径 */
  workDir: string;
  /** 所有运行工作目录的根（自动建产物父目录时的安全边界），绝对路径 */
  workRoot: string;
  /** 传给子进程的环境变量（已补全 PATH 并注入 SKILL_* 变量） */
  env: Record<string, string>;
  /** 探测到的可用解释器/工具（python3 / node / bash / ffmpeg ...）→ 绝对路径或 null */
  tools: Record<string, string | null>;
}

// ─── LLM 交互协议 ─────────────────────────────────────────────────────────────

/** LLM 每一轮返回的动作（约定为单个 JSON 对象） */
export type AgentActionType = 'run' | 'finish' | 'ask_user';

/**
 * LLM 规划出的一步动作。
 * - action='run'：执行 command（argv 数组，或可被拆分的命令字符串）
 * - action='finish'：任务完成，给出 final_answer（可选 artifacts 产物路径）
 * - action='ask_user'：需要用户补充信息，给出 question
 */
export interface AgentAction {
  /** LLM 的推理说明（可选，仅用于日志/调试） */
  thought?: string;
  action: AgentActionType;
  /** 要执行的命令：优先 argv 数组；也接受字符串（内部做 shell 风格拆分） */
  command?: string[] | string;
  /** 任务完成时的最终答复 */
  final_answer?: string;
  /** 任务完成时产出的文件（绝对路径，可选） */
  artifacts?: string[];
  /** 需要向用户追问时的问题 */
  question?: string;
}

/** 一次命令执行的观察结果 */
export interface CommandObservation {
  /** 实际执行的 argv */
  command: string[];
  /** 进程退出码（超时/启动失败为 -1） */
  exitCode: number;
  /** 标准输出（可能被截断） */
  stdout: string;
  /** 标准错误（可能被截断） */
  stderr: string;
  /** 是否超时被杀 */
  timedOut: boolean;
  /** 若 stdout 是合法 JSON，则解析后的对象（脚本用 --json 时常见） */
  json?: unknown;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** stdout/stderr 是否因超过上限被截断 */
  truncated?: boolean;
}

/** loop 中的一步（一次 LLM 决策 + 可选的命令执行观察） */
export interface AgentStep {
  /** 第几步（从 1 开始） */
  index: number;
  /** LLM 返回的动作 */
  action: AgentAction;
  /** 若 action='run'，对应的执行观察结果 */
  observation?: CommandObservation;
  /** 本步 LLM 调用耗时（毫秒） */
  llmDurationMs: number;
}

// ─── 最终结果 ────────────────────────────────────────────────────────────────

export interface SkillTaskResult {
  /** 任务是否成功完成（LLM 明确 finish 且未触发错误/超上限） */
  success: boolean;
  /** 运行 ID */
  runId: string;
  /** 选中的技能名 */
  skill: string;
  /** 技能目录 */
  skillDir: string;
  /** 工作目录（产物位置） */
  workDir: string;
  /** LLM 的最终答复 */
  finalAnswer: string;
  /** 产物文件（绝对路径） */
  artifacts: string[];
  /** 完整的执行步骤（含每步命令与观察结果） */
  steps: AgentStep[];
  /** 实际执行的命令条数 */
  commandCount: number;
  /** loop 迭代次数 */
  iterations: number;
  /** 总耗时（毫秒） */
  durationMs: number;
  /** 结束原因 */
  stopReason: 'finished' | 'ask_user' | 'max_iterations' | 'error' | 'aborted';
  /** 失败/中断时的错误信息 */
  error?: string;
  /** 若 ask_user，待用户回答的问题 */
  question?: string;
}

// ─── LLM Provider（解耦，便于测试与替换） ─────────────────────────────────────

export interface LLMCompleteOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** 请求 JSON 输出（provider 支持时启用 response_format） */
  jsonMode?: boolean;
}

/**
 * 大模型调用抽象。核心只依赖 complete(messages)，返回文本。
 * 默认实现见 llm-provider.ts（基于 openai SDK + 环境变量，不耦合数据库）。
 */
export interface LLMProvider {
  complete(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: LLMCompleteOptions
  ): Promise<string>;
}

// ─── 事件回调（用于把 loop 进度实时暴露给调用方/前端） ─────────────────────────

export type SkillRunnerStage =
  | 'listing_skills'
  | 'selecting_skill'
  | 'loading_skill'
  | 'preparing_env'
  | 'planning'
  | 'executing'
  | 'observing'
  | 'finished';

export interface SkillRunnerEvents {
  /** 结构化日志 */
  onLog?: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => void;
  /** 阶段进度 */
  onProgress?: (stage: SkillRunnerStage, detail?: string) => void;
  /** 命令实时 stdout */
  onStdout?: (chunk: string) => void;
  /** 命令实时 stderr */
  onStderr?: (chunk: string) => void;
  /** 每完成一步（LLM 决策 + 执行观察）回调，便于流式展示 */
  onStep?: (step: AgentStep) => void;
}

// ─── 运行选项 ────────────────────────────────────────────────────────────────

export interface RunSkillTaskOptions {
  /** 技能根目录，默认 <cwd>/skills */
  skillsDir?: string;
  /** 直接指定技能名，跳过「LLM 选技能」阶段 */
  skill?: string;
  /** 自定义 LLM Provider（默认用 env 构建） */
  llm?: LLMProvider;
  /** 事件回调 */
  events?: SkillRunnerEvents;
  /** loop 最大迭代次数，默认 8 */
  maxIterations?: number;
  /** 单条命令超时（毫秒），默认 120000 */
  commandTimeoutMs?: number;
  /** 单次命令 stdout/stderr 最大字节，默认 1MB */
  maxOutputBytes?: number;
  /** 工作目录根，默认 <cwd>/temp/skill-runs */
  baseWorkDir?: string;
  /** 额外注入子进程的环境变量 */
  extraEnv?: Record<string, string>;
  /** 传给 LLM 的附加上下文（如当前用户可用的媒体文件绝对路径清单） */
  context?: string;
  /** 允许 LLM 用 shell 执行命令（默认 false，仅 argv，更安全） */
  allowShell?: boolean;
  /** 规划温度，默认 0.2 */
  temperature?: number;
  /** 模型名覆盖（默认取 provider 默认模型） */
  model?: string;
}
