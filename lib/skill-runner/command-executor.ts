/**
 * 通用命令执行器。
 *
 * 由 LLM 决定要跑什么命令，这里只负责安全地执行并捕获结果：
 * - 默认 argv 直跑（不经 shell），避免 `; | $()` 等 shell 注入
 * - 超时控制（SIGTERM → 宽限 → SIGKILL）
 * - stdout/stderr 大小上限与截断标记
 * - 实时事件回调（onStdout/onStderr）
 * - 尽力把 stdout 解析为 JSON（脚本用 --json 时可直接拿到结构化结果）
 */
import { spawn } from 'child_process';
import type { CommandObservation, SkillRunnerEvents } from './types';

export interface ExecuteOptions {
  /** 工作目录（默认技能目录，使 SKILL.md 里的相对脚本路径可用） */
  cwd: string;
  /** 子进程环境变量 */
  env: Record<string, string>;
  /** 超时（毫秒） */
  timeoutMs: number;
  /** stdout/stderr 各自最大字节 */
  maxOutputBytes: number;
  /** 是否允许用 shell 执行（默认 false） */
  shell?: boolean;
  /** 事件回调 */
  events?: SkillRunnerEvents;
  /** 运行 ID（日志用） */
  runId?: string;
}

/**
 * 把 LLM 给出的命令规范化为 argv 数组。
 * 支持：已是数组则原样返回；字符串则做 shell 风格拆分（尊重引号）。
 */
export function normalizeCommand(command: string[] | string): string[] {
  if (Array.isArray(command)) {
    return command.map((c) => String(c)).filter((c) => c.length > 0);
  }
  return splitCommandString(String(command));
}

/** shell 风格的命令字符串拆分（支持单/双引号，不支持转义换行等复杂语法） */
export function splitCommandString(input: string): string[] {
  const args: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m[1] !== undefined) args.push(m[1]);
    else if (m[2] !== undefined) args.push(m[2]);
    else if (m[3] !== undefined) args.push(m[3]);
  }
  return args;
}

/** 尽力从 stdout 解析出 JSON（整体解析，或提取首个平衡的 {...} / [...] 片段） */
export function tryParseJson(stdout: string): unknown | undefined {
  const text = stdout.trim();
  if (!text) return undefined;
  // 1) 整体就是 JSON
  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']'))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      // 落到扫描逻辑
    }
  }
  // 2) 扫描首个平衡的 JSON 片段（容忍前后有普通日志行）
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  let start = -1;
  let open = '';
  let close = '';
  if (startObj === -1 && startArr === -1) return undefined;
  if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
    start = startObj;
    open = '{';
    close = '}';
  } else {
    start = startArr;
    open = '[';
    close = ']';
  }
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/**
 * 执行一条命令，返回观察结果。永不 reject（错误体现在 exitCode/stderr 上），
 * 以便 agentic loop 把失败也当作观察喂回 LLM 继续决策。
 */
export function executeCommand(
  command: string[] | string,
  options: ExecuteOptions
): Promise<CommandObservation> {
  const argv = normalizeCommand(command);
  const startTime = Date.now();
  const { cwd, env, timeoutMs, maxOutputBytes, shell = false, events, runId } = options;

  if (argv.length === 0) {
    return Promise.resolve({
      command: [],
      exitCode: -1,
      stdout: '',
      stderr: '空命令：未提供任何参数',
      timedOut: false,
      durationMs: Date.now() - startTime,
    });
  }

  const tag = runId ? `[${runId}] ` : '';
  events?.onLog?.('info', `${tag}执行命令: ${argv.join(' ')}`);

  return new Promise<CommandObservation>((resolve) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    let settled = false;

    const exe = argv[0];
    const args = argv.slice(1);

    let proc;
    try {
      proc = spawn(exe, args, {
        cwd,
        env: env as NodeJS.ProcessEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      resolve({
        command: argv,
        exitCode: -1,
        stdout: '',
        stderr: `进程启动失败: ${message}`,
        timedOut: false,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    const finish = (exitCode: number, timedOut: boolean, extraStderr = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
      const stderr = Buffer.concat(stderrChunks).toString('utf-8') + extraStderr;
      const observation: CommandObservation = {
        command: argv,
        exitCode,
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startTime,
        truncated,
      };
      const parsed = tryParseJson(stdout);
      if (parsed !== undefined) observation.json = parsed;
      resolve(observation);
    };

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= maxOutputBytes) {
        stdoutChunks.push(chunk);
        events?.onStdout?.(chunk.toString('utf-8'));
      } else if (!truncated) {
        truncated = true;
        events?.onLog?.('warn', `${tag}stdout 超过 ${maxOutputBytes} 字节，已截断`);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= maxOutputBytes) {
        stderrChunks.push(chunk);
        events?.onStderr?.(chunk.toString('utf-8'));
      } else if (!truncated) {
        truncated = true;
      }
    });

    // 超时：先 SIGTERM，宽限 3s 后 SIGKILL
    let killTimer: NodeJS.Timeout;
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      killTimer = setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL');
      }, 3000);
      // 标记超时，close 事件里据此判定
      (proc as unknown as { __timedOut?: boolean }).__timedOut = true;
    }, timeoutMs);

    proc.on('error', (err: Error) => {
      finish(-1, false, `\n进程错误: ${err.message}`);
    });

    proc.on('close', (code, signal) => {
      const timedOut =
        (proc as unknown as { __timedOut?: boolean }).__timedOut === true ||
        signal === 'SIGTERM' ||
        signal === 'SIGKILL';
      if (timedOut) {
        events?.onLog?.('warn', `${tag}命令超时 (${timeoutMs}ms)，已终止`);
      }
      finish(code ?? -1, timedOut);
    });
  });
}
