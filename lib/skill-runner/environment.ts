/**
 * 通用运行环境准备。
 *
 * 不含任何技能专属逻辑，只做对所有技能都通用的事：
 * 1. 建立本次运行的工作目录（产物/临时文件默认落这里）
 * 2. 补全 PATH（Next 服务进程的 PATH 常常很窄，需补上 homebrew/系统目录、node 目录）
 * 3. 探测常见解释器/工具是否可用（python3 / node / bash / ffmpeg ...），结果告知 LLM
 * 4. 组装一份「安全」的子进程环境变量（透传必要宿主变量 + 注入 SKILL_* + 技能声明的 env）
 */
import * as fs from 'fs/promises';
import { accessSync, statSync, constants as fsConstants } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Skill, SkillRunEnvironment } from './types';

/** macOS / Linux 常见可执行目录，用于补全过窄的 PATH */
const COMMON_BIN_DIRS = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];

/** 需要探测并告知 LLM 的常见工具 */
const PROBE_TOOLS = ['python3', 'python', 'node', 'bash', 'sh', 'ffmpeg', 'ffprobe', 'git', 'curl'];

/** 允许透传给子进程的宿主环境变量（避免把 API Key 等敏感值泄露给技能脚本） */
const PASSTHROUGH_ENV_KEYS = [
  'HOME',
  'USER',
  'LOGNAME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'SHELL',
  'TMPDIR',
  'TEMP',
  'TMP',
  'TZ',
  'FFMPEG_PATH',
  'FFPROBE_PATH',
  'PYTHONUNBUFFERED',
  'NODE_OPTIONS',
];

/** 生成运行 ID */
export function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${ts}_${rand}`;
}

/** 在给定 PATH 目录列表中查找可执行文件，返回绝对路径或 null */
function resolveTool(name: string, pathDirs: string[]): string | null {
  // 绝对路径直接判断
  if (name.includes('/')) {
    try {
      accessSync(name, fsConstants.X_OK);
      return name;
    } catch {
      return null;
    }
  }
  for (const dir of pathDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      accessSync(candidate, fsConstants.X_OK);
      // 排除目录
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // 继续找下一个目录
    }
  }
  return null;
}

/** 构建补全后的 PATH 目录数组 */
function buildPathDirs(extraEnv: Record<string, string> = {}): string[] {
  const hostPath = process.env.PATH ?? '';
  const dirs = hostPath.split(path.delimiter).filter(Boolean);

  // FFMPEG_PATH / FFPROBE_PATH 所在目录
  for (const key of ['FFMPEG_PATH', 'FFPROBE_PATH']) {
    const p = extraEnv[key] ?? process.env[key];
    if (p) dirs.push(path.dirname(p));
  }
  // node 二进制所在目录（保证子进程能找到 node/npx）
  if (process.execPath) dirs.push(path.dirname(process.execPath));
  // 系统常见目录
  dirs.push(...COMMON_BIN_DIRS);

  // 去重（保序）
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of dirs) {
    const abs = path.resolve(d);
    if (!seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
}

/**
 * 准备一次技能运行的环境。
 * @param skill 已加载的技能
 * @param baseWorkDir 工作目录根（默认 <cwd>/temp/skill-runs）
 * @param extraEnv 额外注入子进程的环境变量
 */
export async function prepareEnvironment(
  skill: Skill,
  baseWorkDir?: string,
  extraEnv: Record<string, string> = {}
): Promise<SkillRunEnvironment> {
  const runId = generateRunId();

  // 1) 工作目录
  const base = path.resolve(baseWorkDir ?? path.join(process.cwd(), 'temp', 'skill-runs'));
  const workDir = path.join(base, skill.name, runId);
  await fs.mkdir(workDir, { recursive: true });

  // 2) PATH 补全
  const pathDirs = buildPathDirs(extraEnv);
  const joinedPath = pathDirs.join(path.delimiter);

  // 3) 工具探测
  const tools: Record<string, string | null> = {};
  for (const t of PROBE_TOOLS) {
    tools[t] = resolveTool(t, pathDirs);
  }
  // python 缺省时用 python3 兜底
  if (!tools.python && tools.python3) tools.python = tools.python3;

  // 4) 组装环境变量（安全透传 + 注入）
  const env: Record<string, string> = {};
  for (const key of PASSTHROUGH_ENV_KEYS) {
    const v = extraEnv[key] ?? process.env[key];
    if (v !== undefined) env[key] = v;
  }
  // 透传所有 LC_* （语言环境）
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('LC_') && v !== undefined && env[k] === undefined) env[k] = v;
  }
  env.PATH = joinedPath;
  env.HOME = env.HOME ?? os.homedir();
  env.PYTHONUNBUFFERED = env.PYTHONUNBUFFERED ?? '1';
  env.PYTHONIOENCODING = 'utf-8';

  // 注入技能相关变量（脚本可通过环境变量拿到路径）
  env.SKILL_DIR = skill.dir;
  env.SKILL_NAME = skill.name;
  env.SKILL_WORK_DIR = workDir;
  env.SKILL_RUN_ID = runId;

  // 技能 frontmatter 里声明的 env（通用能力：若存在则注入，支持 ${HOST_VAR} 引用）
  const declaredEnv = (skill.frontmatter as Record<string, unknown>)?.env;
  if (declaredEnv && typeof declaredEnv === 'object') {
    for (const [k, v] of Object.entries(declaredEnv as Record<string, unknown>)) {
      env[k] = String(v).replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? '');
    }
  }

  // 调用方额外注入（优先级最高，但保护 PATH/SKILL_* 不被误覆盖）
  for (const [k, v] of Object.entries(extraEnv)) {
    if (k === 'PATH' || k.startsWith('SKILL_')) continue;
    env[k] = v;
  }

  return { runId, skillDir: skill.dir, workDir, workRoot: base, env, tools };
}

/** 把工作目录里新生成的文件列为候选产物（顶层，按修改时间倒序） */
export async function listArtifacts(workDir: string, max = 100): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 3 || out.length >= max) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= max) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) await walk(full, depth + 1);
      } else {
        out.push(full);
      }
    }
  }
  await walk(workDir, 0);
  return out;
}

const IGNORE_DIRS = new Set(['node_modules', '.git', '__pycache__', '.venv']);

/** 清理工作目录（可选调用） */
export async function cleanupWorkDir(workDir: string): Promise<void> {
  try {
    await fs.rm(workDir, { recursive: true, force: true });
  } catch {
    // 忽略清理失败
  }
}
