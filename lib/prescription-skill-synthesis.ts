/**
 * 处方「音频合成」的 ffmpeg-skill 实现（原逻辑之外的另一条路径）。
 *
 * 触发条件：处方提示词里包含「ffmpeg-skill」。此时不再走 lib/ai-music-client 的
 * AI 音乐控制，而是把选中的音频素材从对象存储下载到本地，交给通用技能运行器
 * （lib/skill-runner）驱动 ffmpeg-skill 完成合成，再把产物传回对象存储。
 *
 * 本模块只做「搬运文件 + 组织提示词」，不含任何 ffmpeg 专属硬编码：
 * 具体用哪个脚本、怎么混音，全部由 ffmpeg-skill 的 SKILL.md + 运行器里的 LLM 决定。
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { downloadFile, uploadFile } from '@/lib/oss';
import { runSkillTask, cleanupWorkDir } from '@/lib/skill-runner';

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';

/** 触发词：提示词包含它（不区分大小写）就走 ffmpeg-skill 合成 */
export const FFMPEG_SKILL_TRIGGER = 'ffmpeg-skill';

/** 判断提示词是否要求使用 ffmpeg-skill */
export function usesFfmpegSkill(prompt?: string | null): boolean {
  return !!prompt && prompt.toLowerCase().includes(FFMPEG_SKILL_TRIGGER);
}

/** 去掉触发词与 [音频: xxx] 引用标签，得到给技能看的纯指令文本 */
function cleanInstruction(prompt: string): string {
  return prompt
    .replace(/使用\s*ffmpeg-skill/gi, '')
    .replace(/ffmpeg-skill/gi, '')
    .replace(/\[音频:[^\]]*\]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** 常见音频扩展名 → Content-Type */
function contentTypeForAudio(ext: string): string {
  switch (ext) {
    case '.wav':
      return 'audio/wav';
    case '.m4a':
    case '.aac':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    default:
      return 'audio/mpeg';
  }
}

export interface SkillSynthesisInput {
  name: string;
  prompt: string;
  audioFiles: Array<{ id: string; name?: string | null }>;
  totalDuration?: number;
}

export interface SkillSynthesisResult {
  /** 上传到对象存储后的 key */
  key: string;
  etag: string;
  /** 存进 Prescription.arguments 的 JSON 字符串（记录本次技能合成的过程） */
  argumentsStr: string;
  /** 技能给出的面向用户的最终答复 */
  finalAnswer: string;
}

/**
 * 用 ffmpeg-skill 合成音频：下载素材 → 运行技能 → 上传产物。
 * 失败时抛错（调用方决定是否回退），不静默吞掉。
 */
export async function synthesizeWithFfmpegSkill(
  input: SkillSynthesisInput
): Promise<SkillSynthesisResult> {
  console.log('\n========== 🎬 ffmpeg-skill 音频合成 ==========');
  console.log(`📌 处方名称: ${input.name}`);
  console.log(`📌 素材数量: ${input.audioFiles.length}`);

  // 1) 把选中的素材从对象存储下载到本地临时目录（技能只能操作本地文件）
  const inputDir = path.join(process.cwd(), 'temp', 'skill-inputs', uuidv4());
  await fs.mkdir(inputDir, { recursive: true });
  const localFiles: Array<{ name: string; path: string }> = [];
  let workDir: string | undefined;

  try {
    let idx = 0;
    for (const f of input.audioFiles) {
      const toc = await prisma.tocData.findUnique({ where: { id: f.id } });
      if (!toc?.key) throw new Error(`音频素材不存在或缺少存储 key: ${f.id}`);
      const { content } = await downloadFile({ bucket: BUCKET_NAME, key: toc.key });
      const ext = path.extname(toc.key).toLowerCase() || '.mp3';
      idx += 1;
      // 用序号命名，避免素材名里的特殊字符影响命令行
      const localPath = path.join(inputDir, `input_${idx}${ext}`);
      await fs.writeFile(localPath, content);
      localFiles.push({ name: f.name || toc.name || `input_${idx}${ext}`, path: localPath });
      console.log(`📥 已下载素材 ${idx}: ${localFiles[localFiles.length - 1].name} → ${localPath}`);
    }
    if (localFiles.length === 0) throw new Error('没有可用于合成的音频素材');

    // 2) 组织给技能运行器的提示词（说明任务、输入路径、用户指令、时长、输出要求）
    const instruction = cleanInstruction(input.prompt);
    const fileList = localFiles.map((f, i) => `${i + 1}. ${f.name} —— ${f.path}`).join('\n');
    const skillPrompt = [
      '调用 ffmpeg-skill 把下面这些本地音频文件合成为一个成品音频。',
      '',
      '可用输入音频（绝对路径，均为本地已下载文件）：',
      fileList,
      '',
      `合成要求（用户指令）：${instruction || '把这些音频按顺序自然衔接、融合成一段连贯的成品音频'}`,
      input.totalDuration ? `期望成品总时长：约 ${input.totalDuration} 秒（尽量贴近，达不到就如实说明）。` : '',
      '',
      '若用户指令提到背景曲/主音轨/在某时间点插入等，请据此处理（例如背景曲音量更低、循环铺底、主音轨在上）。',
      '最终成品请输出为 mp3，写到工作目录；完成前按手册对成品做一次探测校验。',
    ]
      .filter(Boolean)
      .join('\n');

    // 3) 驱动通用技能运行器完成合成（LLM 读 SKILL.md 后自主决定用哪个脚本/命令）
    const result = await runSkillTask(skillPrompt, {
      skill: FFMPEG_SKILL_TRIGGER,
      maxIterations: 12,
      commandTimeoutMs: 180000,
      context: `本次共 ${localFiles.length} 个输入音频，输入目录：${inputDir}`,
      events: {
        onProgress: (stage, detail) => console.log(`  ▶ [skill] ${stage}${detail ? ` — ${detail}` : ''}`),
        onLog: (level, message) => {
          if (level === 'error' || level === 'warn') console.log(`  ⚠ [skill:${level}] ${message}`);
        },
      },
    });
    workDir = result.workDir;

    console.log(`📌 技能结束: success=${result.success}, 迭代=${result.iterations}, 命令数=${result.commandCount}`);
    if (!result.success) {
      throw new Error(`ffmpeg-skill 合成未完成：${result.error || result.finalAnswer || '未知原因'}`);
    }

    // 4) 从产物里挑出成品音频（优先 mp3）
    const audioExts = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac'];
    const audios = result.artifacts.filter((a) => audioExts.includes(path.extname(a).toLowerCase()));
    const output = audios.find((a) => path.extname(a).toLowerCase() === '.mp3') || audios[0];
    if (!output) throw new Error('ffmpeg-skill 未产出可识别的音频文件');
    console.log(`📌 成品音频: ${output}`);

    const outBuf = await fs.readFile(output);
    const outExt = path.extname(output).toLowerCase() || '.mp3';

    // 5) 上传成品到对象存储（沿用原逻辑的 toc-data/ 前缀）
    const fileId = uuidv4();
    const key = `toc-data/${fileId}${outExt}`;
    const upload = await uploadFile({
      bucket: BUCKET_NAME,
      key,
      body: outBuf,
      contentType: contentTypeForAudio(outExt),
    });
    console.log(`📤 已上传成品: ${upload.key} (${outBuf.length} bytes)`);

    const argumentsStr = JSON.stringify({
      mode: 'ffmpeg-skill',
      instruction,
      totalDuration: input.totalDuration,
      inputs: localFiles.map((f) => f.name),
      output: path.basename(output),
      finalAnswer: result.finalAnswer,
      iterations: result.iterations,
      commandCount: result.commandCount,
    });

    return { key: upload.key, etag: upload.etag, argumentsStr, finalAnswer: result.finalAnswer };
  } finally {
    // 6) 清理本地临时文件（下载的素材 + 技能工作目录），best-effort
    fs.rm(inputDir, { recursive: true, force: true }).catch(() => {});
    if (workDir) cleanupWorkDir(workDir).catch(() => {});
    console.log('=============================================\n');
  }
}
