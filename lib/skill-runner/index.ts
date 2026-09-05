/**
 * 通用技能运行器（Skill Runner）统一出口。
 *
 * 用法（服务端 / 脚本）：
 *   import { runSkillTask } from '@/lib/skill-runner';
 *   const result = await runSkillTask('调用 ffmpeg 技能把这个视频剪成 9:16 竖屏 15 秒', {
 *     events: { onLog: (lvl, msg) => console.log(lvl, msg) },
 *   });
 *   console.log(result.finalAnswer, result.artifacts);
 *
 * 新增技能：只需在 skills/ 下放一个含 SKILL.md 的目录，无需改动本模块任何代码。
 */

export { runSkillTask } from './skill-agent';

export {
  listSkills,
  loadSkill,
  matchSkillByName,
  defaultSkillsDir,
} from './skill-registry';

export {
  prepareEnvironment,
  listArtifacts,
  cleanupWorkDir,
  generateRunId,
} from './environment';

export {
  executeCommand,
  normalizeCommand,
  splitCommandString,
  tryParseJson,
} from './command-executor';

export {
  createLLMProvider,
  extractJsonObject,
  resolveModel,
  resolveProviderName,
} from './llm-provider';

export { parseSkillMarkdown, parseFrontmatter, splitFrontmatter } from './mini-yaml';

export type {
  Skill,
  SkillMeta,
  SkillFrontmatter,
  SkillRunEnvironment,
  AgentAction,
  AgentActionType,
  AgentStep,
  CommandObservation,
  SkillTaskResult,
  SkillRunnerEvents,
  SkillRunnerStage,
  RunSkillTaskOptions,
  LLMProvider,
  LLMCompleteOptions,
} from './types';

export type { LLMProviderConfig, AIProviderName } from './llm-provider';
