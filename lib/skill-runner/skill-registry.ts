/**
 * 技能注册表：发现、加载 skills/ 目录下的技能。
 *
 * 完全通用——只认「一个目录 + 一份 SKILL.md」这一约定（Anthropic Agent Skill 格式）。
 * 新增技能无需改任何代码：把技能目录丢进 skills/ 即可被自动发现。
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseSkillMarkdown } from './mini-yaml';
import type { Skill, SkillMeta } from './types';

/** 技能根目录默认值：<项目根>/skills */
export function defaultSkillsDir(): string {
  return path.join(process.cwd(), 'skills');
}

/** 可执行脚本的扩展名（用于给 LLM 提示技能里有哪些可跑的东西） */
const SCRIPT_EXT = new Set(['.py', '.sh', '.bash', '.js', '.mjs', '.cjs', '.ts', '.rb', '.pl']);
/** 扫描脚本时忽略的目录 */
const IGNORE_DIRS = new Set(['node_modules', '.git', '.venv', '__pycache__', 'dist', 'build', '.next']);

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** 判断一个目录是否是技能目录（含 SKILL.md，大小写不敏感） */
async function findSkillMd(dir: string): Promise<string | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const hit = entries.find((e) => e.toLowerCase() === 'skill.md');
  return hit ? path.join(dir, hit) : null;
}

/**
 * 列出所有可用技能（只读 frontmatter，开销小）。
 * 扫描 skillsDir 的一级子目录；若 skillsDir 本身就是技能目录也纳入。
 */
export async function listSkills(skillsDir: string = defaultSkillsDir()): Promise<SkillMeta[]> {
  const absDir = path.resolve(skillsDir);
  if (!(await pathExists(absDir))) return [];

  const skills: SkillMeta[] = [];

  // skillsDir 自身即技能
  const selfMd = await findSkillMd(absDir);
  if (selfMd) {
    const meta = await readSkillMeta(path.dirname(selfMd), selfMd);
    if (meta) skills.push(meta);
    return skills;
  }

  // 一级子目录
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const subDir = path.join(absDir, entry.name);
    const md = await findSkillMd(subDir);
    if (!md) continue;
    const meta = await readSkillMeta(subDir, md);
    if (meta) skills.push(meta);
  }
  return skills;
}

/** 读取单个技能的 frontmatter → SkillMeta */
async function readSkillMeta(dir: string, skillMdPath: string): Promise<SkillMeta | null> {
  try {
    const raw = await fs.readFile(skillMdPath, 'utf-8');
    const { data } = parseSkillMarkdown(raw);
    const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : path.basename(dir);
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    return { name, description, dir, skillMdPath, frontmatter: data };
  } catch {
    return null;
  }
}

/**
 * 完整加载一个技能：读取 SKILL.md 正文（说明书）+ 探测脚本清单。
 * @param nameOrDir 技能名（在 skillsDir 下查找）或技能目录绝对/相对路径
 */
export async function loadSkill(
  nameOrDir: string,
  skillsDir: string = defaultSkillsDir()
): Promise<Skill | null> {
  // 1) 先当作目录路径处理
  const asDir = path.isAbsolute(nameOrDir) ? nameOrDir : path.resolve(nameOrDir);
  let dir: string | null = null;
  let mdPath: string | null = null;

  if (await pathExists(asDir)) {
    mdPath = await findSkillMd(asDir);
    if (mdPath) dir = asDir;
  }

  // 2) 再当作技能名在 skillsDir 下查找
  if (!dir) {
    const all = await listSkills(skillsDir);
    const hit = all.find((s) => s.name === nameOrDir) ?? all.find((s) => normalize(s.name) === normalize(nameOrDir));
    if (hit) {
      dir = hit.dir;
      mdPath = hit.skillMdPath;
    }
  }

  if (!dir || !mdPath) return null;

  const raw = await fs.readFile(mdPath, 'utf-8');
  const { data, body } = parseSkillMarkdown(raw);
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : path.basename(dir);
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const scripts = await collectScripts(dir);
  const entries = await topEntries(dir);

  return {
    name,
    description,
    dir,
    skillMdPath: mdPath,
    frontmatter: data,
    instructions: body.trim(),
    scripts,
    entries,
  };
}

/** 列出技能目录下的一级文件/目录名（帮助 LLM 了解结构） */
async function topEntries(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
  } catch {
    return [];
  }
}

/**
 * 递归探测技能里的可执行脚本（相对技能目录的路径）。
 * 优先 scripts/ 与 bin/ 目录；限制数量与深度，避免大目录拖慢。
 */
async function collectScripts(dir: string, maxResults = 200): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string, depth: number) {
    if (depth > 4 || results.length >= maxResults) return;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (SCRIPT_EXT.has(path.extname(entry.name).toLowerCase())) {
        // 跳过以 _ 开头的内部模块（如 _common.py / _contract.py），它们通常不是入口
        results.push(path.relative(dir, full));
      }
    }
  }

  // scripts/ 与 bin/ 优先
  for (const preferred of ['scripts', 'bin']) {
    const p = path.join(dir, preferred);
    if (await pathExists(p)) await walk(p, 1);
  }
  // 其余（根目录等）
  await walk(dir, 1);

  // 去重 + 排序，入口脚本（非 _ 前缀）排前面
  const unique = Array.from(new Set(results)).sort((a, b) => {
    const au = path.basename(a).startsWith('_') ? 1 : 0;
    const bu = path.basename(b).startsWith('_') ? 1 : 0;
    if (au !== bu) return au - bu;
    return a.localeCompare(b);
  });
  return unique;
}

/** 归一化名称：小写、去分隔符，用于宽松匹配 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]/g, '');
}

/**
 * 依据用户提示词快速匹配技能名（LLM 选择前的 fast-path）。
 * 命中返回技能名，否则返回 null（交给 LLM 依据 description 选择）。
 */
export function matchSkillByName(prompt: string, skills: SkillMeta[]): string | null {
  const lower = prompt.toLowerCase();
  const norm = normalize(prompt);
  // 1) 精确名出现在提示词里
  for (const s of skills) {
    if (s.name && lower.includes(s.name.toLowerCase())) return s.name;
  }
  // 2) 归一化名匹配（去空格/连字符）
  for (const s of skills) {
    const n = normalize(s.name);
    if (n && n.length >= 3 && norm.includes(n)) return s.name;
  }
  return null;
}
