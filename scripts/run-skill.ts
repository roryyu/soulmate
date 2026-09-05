#!/usr/bin/env tsx
/**
 * 技能运行器 CLI —— 端到端测试 / 手动驱动一个技能完成任务。
 *
 * 用法:
 *   npx tsx scripts/run-skill.ts --list
 *   npx tsx scripts/run-skill.ts "调用 ffmpeg 技能探测 /abs/video.mp4 的信息"
 *   npx tsx scripts/run-skill.ts --skill ffmpeg-skill --max-iter 12 "把 /abs/in.mp4 剪成 9:16 竖屏 15 秒，输出到工作目录"
 *
 * 选项:
 *   --list                 仅列出 skills/ 下发现的技能
 *   --skill <name>         指定技能名（跳过 LLM 选择）
 *   --skills-dir <path>    技能根目录（默认 <cwd>/skills）
 *   --max-iter <n>         loop 最大迭代次数（默认 10）
 *   --timeout <ms>         单条命令超时（默认 120000）
 *   --shell                允许 LLM 用 shell 执行命令（默认关闭，仅 argv）
 *   --context <text>       传给 LLM 的附加上下文（如可用文件清单）
 *   --quiet                只打印最终结果，不打印每步日志
 */
import * as dotenv from 'dotenv';
import { runSkillTask, listSkills } from '../lib/skill-runner';
import type { SkillRunnerEvents } from '../lib/skill-runner';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

interface CliOptions {
  list: boolean;
  prompt: string;
  skill?: string;
  skillsDir?: string;
  maxIterations?: number;
  commandTimeoutMs?: number;
  allowShell: boolean;
  context?: string;
  quiet: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { list: false, prompt: '', allowShell: false, quiet: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--list':
        opts.list = true;
        break;
      case '--shell':
        opts.allowShell = true;
        break;
      case '--quiet':
        opts.quiet = true;
        break;
      case '--skill':
        opts.skill = argv[++i];
        break;
      case '--skills-dir':
        opts.skillsDir = argv[++i];
        break;
      case '--max-iter':
        opts.maxIterations = parseInt(argv[++i], 10);
        break;
      case '--timeout':
        opts.commandTimeoutMs = parseInt(argv[++i], 10);
        break;
      case '--context':
        opts.context = argv[++i];
        break;
      default:
        positional.push(a);
    }
  }
  opts.prompt = positional.join(' ').trim();
  return opts;
}

function buildEvents(quiet: boolean): SkillRunnerEvents {
  if (quiet) return {};
  return {
    onLog: (level, message) => {
      const icon = level === 'error' ? '✖' : level === 'warn' ? '⚠' : level === 'debug' ? '·' : '•';
      console.log(`  ${icon} [${level}] ${message}`);
    },
    onProgress: (stage, detail) => {
      console.log(`\n▶ ${stage}${detail ? ` — ${detail}` : ''}`);
    },
    onStdout: () => {
      /* CLI 下不逐块打印，观察结果在 onStep 汇总 */
    },
    onStderr: () => {
      /* 同上 */
    },
    onStep: (step) => {
      const a = step.action;
      console.log(`\n── 第 ${step.index} 步 (LLM ${step.llmDurationMs}ms) ──`);
      if (a.thought) console.log(`  💭 ${a.thought}`);
      if (a.action === 'run') {
        console.log(`  ▶ run: ${(a.command as string[] | string | undefined) ?? ''}`);
        if (Array.isArray(a.command)) console.log(`     argv: ${a.command.join(' ')}`);
        const obs = step.observation;
        if (obs) {
          console.log(`  ⇐ 退出码 ${obs.exitCode}${obs.timedOut ? ' (超时)' : ''}，耗时 ${obs.durationMs}ms`);
          const out = (obs.json !== undefined ? JSON.stringify(obs.json) : obs.stdout).trim();
          if (out) console.log(`     stdout: ${out.slice(0, 400)}${out.length > 400 ? ' …' : ''}`);
          if (obs.stderr.trim()) console.log(`     stderr: ${obs.stderr.trim().slice(-300)}`);
        }
      } else if (a.action === 'finish') {
        console.log(`  ✅ finish`);
      } else if (a.action === 'ask_user') {
        console.log(`  ❓ ask_user: ${a.question}`);
      }
    },
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.list) {
    const skills = await listSkills(opts.skillsDir);
    if (skills.length === 0) {
      console.log('未发现任何技能。请在 skills/ 下放置含 SKILL.md 的目录。');
      return;
    }
    console.log(`发现 ${skills.length} 个技能：\n`);
    for (const s of skills) {
      console.log(`  ● ${s.name}`);
      console.log(`    目录: ${s.dir}`);
      console.log(`    描述: ${s.description.slice(0, 160)}${s.description.length > 160 ? ' …' : ''}\n`);
    }
    return;
  }

  if (!opts.prompt) {
    console.error('请提供任务提示词，例如: npx tsx scripts/run-skill.ts "调用 ffmpeg 技能探测 /abs/x.mp4"');
    console.error('或用 --list 查看可用技能。');
    process.exit(1);
  }

  console.log('══════════ 技能运行器 ══════════');
  console.log(`任务: ${opts.prompt}`);
  if (opts.skill) console.log(`指定技能: ${opts.skill}`);
  console.log('────────────────────────────────\n');

  const result = await runSkillTask(opts.prompt, {
    skill: opts.skill,
    skillsDir: opts.skillsDir,
    maxIterations: opts.maxIterations,
    commandTimeoutMs: opts.commandTimeoutMs,
    allowShell: opts.allowShell,
    context: opts.context,
    events: buildEvents(opts.quiet),
  });

  console.log('\n══════════ 结果 ══════════');
  console.log(`技能: ${result.skill}`);
  console.log(`成功: ${result.success}  (stopReason=${result.stopReason})`);
  console.log(`迭代: ${result.iterations}  命令数: ${result.commandCount}  耗时: ${result.durationMs}ms`);
  console.log(`工作目录: ${result.workDir}`);
  console.log(`\n最终答复:\n${result.finalAnswer}`);
  if (result.artifacts.length) {
    console.log(`\n产物文件:`);
    result.artifacts.forEach((f) => console.log(`  - ${f}`));
  }
  if (result.error) console.log(`\n错误: ${result.error}`);
  if (result.question) console.log(`\n待用户回答: ${result.question}`);

  process.exit(result.success ? 0 : 2);
}

main().catch((err) => {
  console.error('运行器异常:', err);
  process.exit(1);
});
