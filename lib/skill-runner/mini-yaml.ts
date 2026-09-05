/**
 * 轻量 YAML frontmatter 解析器（零第三方依赖）
 *
 * 只覆盖 SKILL.md frontmatter 常见语法，够用且稳健：
 * - 顶层 `key: value` 标量（字符串/数字/布尔/null）
 * - 引号字符串（单/双引号）
 * - 缩进嵌套 map：`key:` 后跟更深缩进的若干 `子key: 值`
 * - 列表：`- item`，item 可为标量或嵌套 map
 * - 块标量：`key: |`（保留换行）与 `key: >`（折叠为空格）
 * - 行内流式：`[a, b]` 与 `{a: 1, b: 2}`（基础支持）
 * - `#` 注释与空行
 *
 * 不追求完整 YAML 规范（锚点/多文档/复杂类型等不支持），因为技能清单只需
 * name / description 等简单字段。若未来需要完整 YAML，可替换为 js-yaml。
 */

/** 拆分 Markdown 的 YAML frontmatter 与正文 */
export function splitFrontmatter(markdown: string): {
  frontmatter: string | null;
  body: string;
} {
  const text = markdown.replace(/^\uFEFF/, ''); // 去掉可能的 BOM
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: null, body: text };
  }
  // 第一行必须是 ---（允许 --- 后有空白）
  const firstNl = trimmed.indexOf('\n');
  if (firstNl === -1) return { frontmatter: null, body: text };
  const firstLine = trimmed.slice(0, firstNl).trim();
  if (firstLine !== '---' && !/^---\s/.test(firstLine)) {
    return { frontmatter: null, body: text };
  }
  // 寻找结束分隔线：单独一行的 --- 或 ...
  const rest = trimmed.slice(firstNl + 1);
  const lines = rest.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === '---' || l === '...') {
      const frontmatter = lines.slice(0, i).join('\n');
      const body = lines.slice(i + 1).join('\n');
      return { frontmatter, body };
    }
  }
  // 没有结束线：视为无 frontmatter
  return { frontmatter: null, body: text };
}

interface Line {
  indent: number;
  content: string; // 去掉注释、trim 后的内容
  raw: string; // 原始行（块标量需要保留原样）
}

/** 把标量字符串转成 JS 值 */
function parseScalar(input: string): unknown {
  const s = input.trim();
  if (s === '') return '';
  // 引号字符串
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    const inner = s.slice(1, -1);
    if (s[0] === '"') {
      return inner.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return inner.replace(/''/g, "'");
  }
  // 行内流式列表 / map
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitFlow(inner).map((x) => parseScalar(x));
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    const obj: Record<string, unknown> = {};
    if (!inner) return obj;
    for (const part of splitFlow(inner)) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const k = part.slice(0, idx).trim().replace(/^["']|["']$/g, '');
      obj[k] = parseScalar(part.slice(idx + 1));
    }
    return obj;
  }
  // 布尔 / null
  const lower = s.toLowerCase();
  if (['true', 'yes', 'on'].includes(lower)) return true;
  if (['false', 'no', 'off'].includes(lower)) return false;
  if (['null', '~', 'none'].includes(lower)) return null;
  // 数字
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s) || /^-?\d+\.\d*$/.test(s)) return parseFloat(s);
  return s;
}

/** 拆分行内流式集合的顶层逗号（忽略引号与嵌套括号内的逗号） */
function splitFlow(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let buf = '';
  for (const ch of inner) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 去掉行尾注释（忽略引号内的 #） */
function stripComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** 把 frontmatter 文本预处理成带缩进的行数组 */
function toLines(text: string): Line[] {
  const rawLines = text.split('\n');
  const lines: Line[] = [];
  for (const raw of rawLines) {
    if (raw.trim() === '') continue;
    const noTab = raw.replace(/\t/g, '  ');
    const stripped = stripComment(noTab);
    if (stripped.trim() === '' && noTab.trim() !== '') continue; // 纯注释行
    const indent = noTab.length - noTab.trimStart().length;
    lines.push({ indent, content: stripped.trim(), raw: noTab });
  }
  return lines;
}

/**
 * 递归解析一个缩进块。
 * @param lines 行数组
 * @param pos 起始下标（引用对象，函数内会推进）
 * @param indent 当前块的缩进层级
 */
function parseBlock(lines: Line[], pos: { i: number }, indent: number): unknown {
  // 判断这个块是列表还是 map
  const first = lines[pos.i];
  if (!first) return null;
  const isList = first.content === '-' || first.content.startsWith('- ');

  if (isList) {
    const arr: unknown[] = [];
    while (pos.i < lines.length) {
      const line = lines[pos.i];
      if (line.indent < indent) break;
      if (line.indent > indent) {
        // 理论上不该发生（列表项应同缩进），跳过以防死循环
        pos.i++;
        continue;
      }
      if (!(line.content === '-' || line.content.startsWith('- '))) break;
      const dashIndent = line.indent;
      const after = line.content === '-' ? '' : line.content.slice(2).trim();
      pos.i++;
      if (after === '') {
        // `-` 后为空：其值是更深缩进的嵌套块
        arr.push(parseNested(lines, pos, dashIndent));
      } else if (findKeyColon(after) !== -1) {
        // `- key: value`：内联 map，其余键对齐在 dashIndent + 2
        const itemIndent = dashIndent + 2;
        const map: Record<string, unknown> = {};
        const keyIdx = findKeyColon(after);
        const key = after.slice(0, keyIdx).trim().replace(/^["']|["']$/g, '');
        const valueStr = after.slice(keyIdx + 1).trim();
        assignValue(map, key, valueStr, lines, pos, itemIndent);
        // 吸收该列表项其余同缩进的键（type / required 等）
        parseMapEntries(lines, pos, itemIndent, map);
        arr.push(map);
      } else {
        arr.push(parseScalar(after));
      }
    }
    return arr;
  }

  // map 块
  const map: Record<string, unknown> = {};
  parseMapEntries(lines, pos, indent, map);
  return map;
}

/** 解析连续处于同一缩进层级的 `key: value` 条目，写入 map */
function parseMapEntries(
  lines: Line[],
  pos: { i: number },
  indent: number,
  map: Record<string, unknown>
): void {
  while (pos.i < lines.length) {
    const line = lines[pos.i];
    if (line.indent < indent) break;
    if (line.indent > indent) {
      pos.i++;
      continue;
    }
    const keyIdx = findKeyColon(line.content);
    if (keyIdx === -1) {
      pos.i++;
      continue;
    }
    const key = line.content.slice(0, keyIdx).trim().replace(/^["']|["']$/g, '');
    const valueStr = line.content.slice(keyIdx + 1).trim();
    pos.i++;
    assignValue(map, key, valueStr, lines, pos, indent);
  }
}

/** 找到 `key:` 的冒号位置（忽略引号内与 URL 里的冒号，如 http://） */
function findKeyColon(content: string): number {
  let quote: string | null = null;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ':') {
      // 冒号后必须是空格或行尾，才算 key: value（排除 http:// 之类）
      if (i === content.length - 1 || content[i + 1] === ' ') return i;
    }
  }
  return -1;
}

/** 处理列表项 `- ` 后跟嵌套块的情况 */
function parseNested(lines: Line[], pos: { i: number }, parentIndent: number): unknown {
  if (pos.i >= lines.length) return null;
  const next = lines[pos.i];
  if (next.indent <= parentIndent) return null;
  return parseBlock(lines, pos, next.indent);
}

/** 根据 value 字符串决定是标量、块标量还是嵌套块 */
function assignValue(
  map: Record<string, unknown>,
  key: string,
  valueStr: string,
  lines: Line[],
  pos: { i: number },
  indent: number
): void {
  if (valueStr === '|' || valueStr === '>' || valueStr === '|-' || valueStr === '>-') {
    map[key] = readBlockScalar(lines, pos, indent, valueStr);
    return;
  }
  if (valueStr === '') {
    // 可能是嵌套块（map/list），也可能就是空值
    if (pos.i < lines.length && lines[pos.i].indent > indent) {
      map[key] = parseBlock(lines, pos, lines[pos.i].indent);
    } else {
      map[key] = '';
    }
    return;
  }
  map[key] = parseScalar(valueStr);
}

/** 读取块标量（| 保留换行 / > 折叠空格） */
function readBlockScalar(
  lines: Line[],
  pos: { i: number },
  parentIndent: number,
  marker: string
): string {
  const fold = marker.startsWith('>');
  const collected: string[] = [];
  let blockIndent = -1;
  // 用原始行（含缩进）来还原块标量内容
  while (pos.i < lines.length) {
    const line = lines[pos.i];
    if (blockIndent === -1) {
      if (line.indent <= parentIndent) break;
      blockIndent = line.indent;
    }
    if (line.indent < blockIndent && line.raw.trim() !== '') break;
    collected.push(line.raw.slice(Math.min(blockIndent, line.raw.length)));
    pos.i++;
  }
  const text = fold
    ? collected.join(' ').replace(/\s+\n/g, '\n').trim()
    : collected.join('\n').replace(/\n+$/, '');
  return text;
}

/** 解析 frontmatter 文本为对象；失败返回空对象 */
export function parseFrontmatter(frontmatter: string): Record<string, unknown> {
  const lines = toLines(frontmatter);
  if (lines.length === 0) return {};
  const pos = { i: 0 };
  const result = parseBlock(lines, pos, lines[0].indent);
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return {};
}

/** 一步到位：从 Markdown 解析出 frontmatter 对象与正文 */
export function parseSkillMarkdown(markdown: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const { frontmatter, body } = splitFrontmatter(markdown);
  if (!frontmatter) return { data: {}, body: markdown };
  return { data: parseFrontmatter(frontmatter), body };
}
