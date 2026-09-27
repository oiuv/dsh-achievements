/** Flat dictionaries registered with DSH Locale; English and Chinese share the same keys. */
import { achievements } from './catalog.js';
const en = {
  title: 'DSH Achievement Hall', button: 'Achievements', close: 'Close',
  intro: 'Build useful habits. Explore more of DSH. Make the work count.',
  overview: 'Overview', achievements: 'Achievements', all: 'All paths', locked: 'In progress', unlocked: 'Unlocked',
  allStatus: 'All progress', secret: 'Hidden challenge', secretHint: 'Explore combinations of capabilities to reveal this challenge.',
  completed: 'Complete', progress: '{count} / {total} unlocked', xp: '{xp} XP', level: 'Level {level}',
  nextLevel: '{xp} XP to next level', maxLevel: 'Highest level', unlockNotice: '{count} new achievements unlocked',
  loading: 'Loading statistics', offline: 'Statistics could not be refreshed. Your last results are still shown.',
  importing: 'Reading session history · {count} sessions remaining', partial: '{count} sessions could not be read. Totals are incomplete.',
  ready: 'Synced from session logs', retry: 'Retry history import', timezone: 'Activity timezone: {zone}',
  coverage: 'Counts include stored sessions available to this DSH profile. Inherited fork history is excluded.',
  privacy: 'Stored locally: counters and achievement progress. No prompts, file contents or tool results are copied.',
  noData: 'Your adventure starts with your next session.', rules: 'How progress works',
  rulesText: 'Capability progress uses tool results without an error flag. A build loop means read → modify → command in one session; it does not certify that tests passed. Optional tools must be enabled in DSH. XP is awarded once per achievement.',
  oldCleared: 'Development counters have been reset. Statistics are rebuilt from session logs.',
  toolUsage: 'Successful tool calls', activity: 'User messages by hour', paths: 'Choose your next challenge',
  earnedAt: 'Unlocked {date}', requirement: '{metric}: {value} / {target}',
  'category.journey':'Developer journey', 'category.craft':'Engineering craft', 'category.research':'Research & delivery',
  'category.orchestration':'Collaboration & workflows', 'category.skills':'Skills & planning', 'category.mastery':'Mastery',
  'tier.bronze':'Apprentice', 'tier.silver':'Practitioner', 'tier.gold':'Expert', 'tier.legendary':'Legend', 'tier.secret':'Secret', 'tier.platinum':'Platinum',
  'rank.1':'Explorer','rank.2':'Apprentice','rank.3':'Practitioner','rank.4':'Engineer','rank.5':'Expert','rank.6':'Master',
  'metric.sessions':'Active sessions','metric.messages':'User messages','metric.toolCalls':'Tool calls','metric.tokens':'Output tokens',
  'metric.steps':'Closed steps','metric.successfulCalls':'Successful calls','metric.activeDays':'Active dates','metric.bestStreak':'Best day streak',
  'metric.buildLoops':'Build-loop sessions','metric.researchLoops':'Research-loop sessions','metric.plannedSessions':'Planned sessions',
  'metric.skillSessions':'Skill-practice sessions','metric.delegationSessions':'Delegation→delivery sessions',
  'metric.terminalSessions':'Terminal-cycle sessions','metric.fileChanges':'File modifications','metric.historySearches':'History searches',
  'metric.distinctSkills':'Distinct Skills','metric.toolKinds':'Different tools','metric.featureKinds':'Capability categories',
  'metric.goals':'Completed goals','metric.workflows':'Completed workflows','metric.broadSessions':'Broad-capability sessions',
  'metric.archiveSessions':'History→research sessions','metric.methodSessions':'Methodical sessions','metric.relaySessions':'Relay sessions',
};
const zh = {
  title:'DSH 成就殿堂',button:'成就',close:'关闭',intro:'把开发练成技艺，让每一次探索留下足迹',
  overview:'数据总览',achievements:'成就图鉴',all:'全部路线',locked:'进行中',unlocked:'已解锁',allStatus:'全部进度',
  secret:'隐藏挑战',secretHint:'探索不同能力的组合，揭开这个挑战的面纱',
  completed:'已达成',progress:'已解锁 {count} / {total}',xp:'{xp} XP',level:'等级 {level}',
  nextLevel:'距离下一级 {xp} XP',maxLevel:'已达最高等级',unlockNotice:'解锁了 {count} 个新成就',
  loading:'正在读取统计',offline:'暂时无法刷新统计，已保留上次结果',
  importing:'正在读取会话历史 · 剩余 {count} 个会话',partial:'有 {count} 个会话读取失败，统计尚不完整',
  ready:'已从会话日志同步',retry:'重新导入历史',timezone:'活跃时区：{zone}',
  coverage:'统计当前 DSH 配置可读取的历史会话；分叉继承的历史不重复计数',
  privacy:'数据保存在本机，仅记录计数与成就进度，不复制提示词、文件内容或工具结果',
  noData:'下一次开发，就是冒险的起点',rules:'进度如何计算',
  rulesText:'能力进度依据未标记错误的工具结果。开发闭环指同一会话内依次读取、修改、运行命令，不代表测试一定通过。可选工具需要在 DSH 中启用。每项成就仅奖励一次 XP。',
  oldCleared:'开发版计数已清除，正在根据会话日志重新统计',
  toolUsage:'成功工具调用',activity:'用户消息的小时分布',paths:'选择下一项挑战',
  earnedAt:'解锁于 {date}',requirement:'{metric}：{value} / {target}',
  'category.journey':'开发者旅程','category.craft':'工程技艺','category.research':'研究与交付',
  'category.orchestration':'协作与编排','category.skills':'技能与规划','category.mastery':'精通之路',
  'tier.bronze':'入门','tier.silver':'进阶','tier.gold':'精通','tier.legendary':'传说','tier.secret':'隐藏','tier.platinum':'白金',
  'rank.1':'探索者','rank.2':'学徒','rank.3':'实践者','rank.4':'工程师','rank.5':'专家','rank.6':'大师',
  'metric.sessions':'活跃会话','metric.messages':'用户消息','metric.toolCalls':'工具调用','metric.tokens':'输出 Tokens',
  'metric.steps':'完成的步骤','metric.successfulCalls':'成功调用','metric.activeDays':'活跃天数','metric.bestStreak':'最长连续天数',
  'metric.buildLoops':'开发闭环会话','metric.researchLoops':'研究闭环会话','metric.plannedSessions':'规划会话',
  'metric.skillSessions':'Skill 实践会话','metric.delegationSessions':'子代理→交付会话','metric.terminalSessions':'终端闭环会话',
  'metric.fileChanges':'文件修改','metric.historySearches':'历史检索','metric.distinctSkills':'不同 Skill','metric.toolKinds':'不同工具',
  'metric.featureKinds':'能力类别','metric.goals':'已完成目标','metric.workflows':'已完成工作流','metric.broadSessions':'多能力会话',
  'metric.archiveSessions':'历史研究会话','metric.methodSessions':'章法会话','metric.relaySessions':'接力会话',
};
for (const achievement of achievements) {
  en['achievement.' + achievement.id + '.name'] = achievement.name.en;
  zh['achievement.' + achievement.id + '.name'] = achievement.name.zh;
  en['achievement.' + achievement.id + '.description'] = achievement.description.en;
  zh['achievement.' + achievement.id + '.description'] = achievement.description.zh;
}
export const dictionaries = { en, zh };
