/** The fixed public collection, optional specialties and hidden challenges. */
export const catalogVersion = 2;
export const tierPoints = { bronze: 25, silver: 75, gold: 150, legendary: 300, secret: 100, platinum: 500 };
const make = (track, rows) => rows.map(([id, category, tier, zh, en, zhDescription, enDescription, requirements, upgrade = false]) => ({
  id, category, tier, track, points: tierPoints[tier], name: { zh, en },
  description: { zh: zhDescription, en: enDescription }, requirements: Object.entries(requirements), upgrade,
}));

/** Core awards use the standard development tools; optional specialties never block platinum. */
export const coreAchievements = make('core', [
  ['first-loop','journey','bronze','开发者上线','Developer online','在一轮中依次读取、修改文件、运行命令，并正常结束该轮','Read, modify a file and run a command in order in one normally completed turn',{buildLoops:1}],
  ['first-plan','journey','bronze','有备而来','Prepared','记录未完成的待办后，再完成 5 次非待办工具调用，并正常结束该轮','Record unfinished todos, then finish 5 non-todo calls in the same normally completed turn',{plannedTurns:1}],
  ['first-delivery','journey','bronze','开门见山','First delivery','首次产生非空的文件交付记录','Record your first non-empty file delivery',{deliveries:1}],
  ['first-goal','journey','bronze','有始有终','See it through','首次将一个目标记录为完成','Record a completed goal for the first time',{goals:1}],
  ['craft-5','craft','silver','小步迭代','Small iterations','完成 5 轮读取→修改→命令流程','Complete 5 read→modify→command turns',{buildLoops:5}],
  ['craft-25','craft','silver','熟能生巧','Practice in motion','累计完成 25 轮读取→修改→命令流程','Accumulate 25 read→modify→command turns',{buildLoops:25},true],
  ['craft-master','craft','gold','工程匠人','Engineering craft','完成 100 轮开发流程；30 个活跃日期有开发流程完成','Complete 100 build turns, with completed build turns on 30 active dates',{buildLoops:100,practiceDays:30}],
  ['search-map','craft','silver','代码导航员','Code navigator','grep 返回 50 次、glob 返回 30 次；10 个主会话各使用过两者','Finish 50 grep and 30 glob calls; use both in each of 10 main sessions',{ 'tool.grep':50,'tool.glob':30,searchSessions:10}],
  ['code-cartographer','craft','gold','代码制图师','Code cartographer','在 50 个主会话各使用 grep 与 glob，并累计完成 50 轮开发流程','Use grep and glob in each of 50 main sessions; complete 50 build turns overall',{searchSessions:50,buildLoops:50}],
  ['deliver','research','silver','成果可见','Visible deliverables','记录 15 次文件交付，分布在至少 10 个主会话','Record 15 file deliveries, with deliveries in at least 10 main sessions',{deliveries:15,deliverySessions:10}],
  ['deliver-100','research','gold','交付长跑','Delivery distance','记录 100 次文件交付；30 个活跃日期有交付记录','Record 100 file deliveries, with deliveries on 30 active dates',{deliveries:100,deliveryDays:30}],
  ['planner','skills','silver','任务拆解师','Plan into action','累计完成 15 轮先记待办、再调用至少 5 次其他工具的流程','Accumulate 15 completed turns with unfinished todos followed by at least 5 other tool calls',{plannedTurns:15},true],
  ['planner-100','skills','gold','章法渐成','Method in practice','完成 100 轮先规划后执行的流程，并累计完成 50 轮开发流程','Complete 100 planned turns and 50 build turns overall',{plannedTurns:100,buildLoops:50}],
  ['checklist','skills','silver','一项不落','All checked','一轮内将至少 3 项的未完成清单更新为全完成，保持内容及顺序不变','In one completed turn, change an unfinished list of at least 3 items to all completed without changing its text or order',{checklistTurns:1}],
  ['checklist-25','skills','gold','清单达人','Checklist practice','累计完成 25 轮同一份至少 3 项清单从未完成到全完成的流程','Accumulate 25 completed turns that finish an unchanged checklist of at least 3 items',{checklistTurns:25},true],
  ['checklist-100','skills','legendary','收尾专家','Finishing specialist','累计完成 100 轮同一份至少 3 项清单从未完成到全完成的流程','Accumulate 100 completed turns that finish an unchanged checklist of at least 3 items',{checklistTurns:100}],
  ['goal','journey','silver','目标达成','Goals recorded','记录 5 个不同目标完成','Record 5 distinct completed goals',{goals:5}],
  ['goal-50','journey','gold','步步为营','Goal by goal','累计记录 50 个不同目标完成','Accumulate 50 distinct completed goals',{goals:50},true],
  ['active-10','journey','silver','十日练习','Ten active days','在 10 个日期发送用户消息，并累计完成 10 轮开发流程','Send user messages on 10 dates and complete 10 build turns overall',{activeDays:10,buildLoops:10}],
  ['active-30','journey','gold','长期项目','A longer journey','活跃 30 天，并累计完成 50 轮开发流程','Be active on 30 dates and complete 50 build turns overall',{activeDays:30,buildLoops:50}],
  ['returning','journey','silver','持续推进','Keep returning','连续 7 天发送用户消息，并累计记录 5 次交付','Send user messages on 7 consecutive dates and record 5 deliveries overall',{bestStreak:7,deliveries:5}],
  ['veteran','mastery','legendary','百日开发者','Hundred-day developer','100 个活跃日期有开发流程完成，累计完成 250 轮开发流程及 50 个目标','Complete build turns on 100 active dates, 250 build turns overall and 50 goals',{practiceDays:100,buildLoops:250,goals:50}],
  ['reliable','mastery','gold','积累成章','A body of work','累计 3000 次非错误工具返回、50 次交付，活跃 30 天','Accumulate 3000 non-error tool returns, 50 deliveries and 30 active dates',{successfulCalls:3000,deliveries:50,activeDays:30}],
  ['craft-legend','mastery','legendary','千锤百炼','A thousand iterations','完成 1000 轮开发流程，且 180 个活跃日期有开发流程完成','Complete 1000 build turns, with completed build turns on 180 active dates',{buildLoops:1000,practiceDays:180}],
]);
const specialties = make('specialty', [
  ['first-research','research','bronze','查证之后','Check the source','一轮内依次搜索网页、读取网页、写入文件或交付，并正常结束','Search, fetch, then write or deliver in one normally completed turn',{researchLoops:1}],
  ['research-5','research','silver','证据链','Research practice','完成 5 轮研究流程，并累计读取 25 次网页','Complete 5 research turns and 25 web fetches overall',{researchLoops:5,'tool.web_fetch':25}],
  ['research-master','research','gold','研究员','Researcher','完成 50 轮研究流程，累计读取 150 次网页，活跃 20 天','Complete 50 research turns, 150 web fetches and 20 active dates',{researchLoops:50,'tool.web_fetch':150,activeDays:20}],
  ['research-legend','research','legendary','求知无涯','Research expedition','完成 200 轮研究流程，且 100 个活跃日期有研究流程完成','Complete 200 research turns, with research turns completed on 100 active dates',{researchLoops:200,researchDays:100}],
  ['archive','research','silver','经验检索员','History explorer','检索历史 25 次，至少 10 个主会话有历史检索','Search history 25 times, with history searches in at least 10 main sessions',{historySearches:25,historySessions:10}],
  ['archive-master','research','gold','温故知新','History into delivery','累计完成 50 轮先检索历史、后交付文件的流程','Accumulate 50 completed turns that search history before delivering files',{archiveTurns:50},true],
  ['visual','research','silver','图文并读','Visual research','在 5 个正常完成的轮次中既读取图片又交付文件','Read images and deliver files in each of 5 normally completed turns',{visionDeliveryTurns:5}],
  ['visual-master','research','gold','视界开拓者','Visual explorer','累计完成 50 轮同时读取图片与交付文件的流程','Accumulate 50 completed turns with image reading and file delivery',{visionDeliveryTurns:50},true],
  ['delegate','orchestration','bronze','分工初成','First delegation','通过任一标准子代理入口获得首次非错误返回；不代表子代理已完成','Receive a non-error return from a standard delegation tool; this does not certify child completion',{delegationCalls:1}],
  ['team-delivery','orchestration','silver','双人成行','Two in step','主会话一轮内，关联子代理完成响应后再交付文件，并正常结束该轮','In one completed main turn, deliver files after a linked child completes a response',{collaborationTurns:1}],
  ['relay-delivery','orchestration','silver','协作交付','Collaborative delivery','完成 10 轮有子代理完成响应后再交付的主会话流程','Complete 10 main turns with a child response completed before file delivery',{collaborationTurns:10}],
  ['team-3','orchestration','gold','三人小队','A small squad','单轮交付前有 3 个关联子代理完成响应，累计完成 10 轮协作交付','Reach 3 responding children before delivery in one turn; complete 10 collaborative delivery turns overall',{maxTeamSize:3,collaborationTurns:10}],
  ['team-8','orchestration','legendary','八方协作','Eight in concert','单轮交付前有 8 个关联子代理完成响应，累计完成 100 轮协作交付','Reach 8 responding children before delivery in one turn; complete 100 collaborative delivery turns overall',{maxTeamSize:8,collaborationTurns:100}],
  ['workflow','orchestration','bronze','流程起步','First workflow','记录一次正常结束的工作流','Record one normally completed workflow run',{workflows:1}],
  ['workflow-5','orchestration','silver','流程设计师','Workflow practice','累计记录 5 次正常结束的工作流','Accumulate 5 normally completed workflow runs',{workflows:5},true],
  ['workflow-master','orchestration','gold','流程统筹','Workflow coordination','完成 25 次至少 3 名成员全部完成、整体正常结束的工作流','Complete 25 workflows with at least 3 members, every member completed and the run completed',{cleanWorkflows:25},true],
  ['workflow-architect','orchestration','legendary','编排架构师','Workflow architect','完成 50 次至少 3 名成员、2 个具名阶段且成员全完成的工作流；单次达到 8 名成员全完成；完成 10 种名称的工作流','Complete 50 all-completed workflows with 3+ members across 2+ named phases; reach 8 completed members in one run; complete 10 workflow names',{stagedWorkflows:50,maxWorkflowMembers:8,distinctWorkflows:10}],
  ['first-skill','skills','bronze','学以致用','Put it to work','加载 Skill 后再修改文件或运行命令，并正常结束该轮','Load a Skill before modifying files or running a command in a normally completed turn',{skillTurns:1}],
  ['skills-3','skills','silver','工具之外','Beyond tools','加载 3 种 Skill，累计完成 5 轮加载后修改或运行命令的流程','Load 3 distinct Skills and complete 5 Skill-practice turns overall',{distinctSkills:3,skillTurns:5}],
  ['skills-5','skills','gold','知识应用者','Knowledge in practice','加载 5 种 Skill，累计完成 25 轮 Skill 实践','Load 5 distinct Skills and complete 25 Skill-practice turns overall',{distinctSkills:5,skillTurns:25}],
  ['skills-master','skills','legendary','多领域实践','Many disciplines','加载 12 种 Skill，完成 100 轮实践，其中 25 轮在操作前加载至少 2 种 Skill','Load 12 distinct Skills; complete 100 practice turns, including 25 with at least 2 Skills loaded before practice',{distinctSkills:12,skillTurns:100,skillComboTurns:25}],
  ['skill-combo','skills','silver','融会贯通','Skills combined','一轮内加载至少 2 种 Skill，再修改文件或运行命令，并正常结束','Load at least 2 distinct Skills before modifying files or running a command in one completed turn',{maxSkillsPerTurn:2}],
  ['skill-orchestra','skills','gold','四艺协奏','Four Skills together','单轮实践前加载至少 4 种 Skill，累计完成 25 轮多 Skill 实践','Practice with 4 Skills in one turn; complete 25 multi-Skill practice turns overall',{maxSkillsPerTurn:4,skillComboTurns:25}],
  ['first-program','automation','bronze','程序开场','First program','完成一次含工具子调用的 PTC 程序，程序及子调用均无错误标记','Finish a PTC program with tool subcalls and no error flags in the program or subcalls',{ptcPrograms:1}],
  ['ptc-combo','automation','silver','程序调度员','Program coordinator','累计完成 5 次覆盖至少 3 类能力且无错误标记的 PTC 程序','Accumulate 5 PTC programs covering at least 3 capability groups without error flags',{ptcMultiPrograms:5},true],
  ['ptc-batch','automation','silver','批量处理','Batch practice','累计完成 5 次至少含 10 个子调用且无错误标记的 PTC 程序','Accumulate 5 PTC programs with at least 10 subcalls and no error flags',{ptcBatchPrograms:5},true],
  ['ptc-polymath','automation','gold','能力交响','Capability composition','单次 PTC 程序覆盖 6 类能力且无错误标记，累计完成 25 次三类能力程序','Cover 6 capability groups in one error-free PTC program; complete 25 three-group programs overall',{maxPtcFeatures:6,ptcMultiPrograms:25}],
  ['ptc-maestro','automation','legendary','程序编排大师','Program maestro','完成 100 次三类能力程序及 50 次至少 10 个子调用的程序，均无错误标记','Complete 100 three-group PTC programs and 50 programs with 10+ subcalls, all without error flags',{ptcMultiPrograms:100,ptcBatchPrograms:50}],
  ['terminal','automation','silver','终端掌舵','Terminal practice','对同一终端依次发送输入、读取输出并关闭，累计 5 次','Send, read and close the same terminal in order, 5 times',{terminalCycles:5}],
  ['terminal-master','automation','gold','终端老手','Terminal veteran','累计完成 50 次同一终端的发送→读取→关闭流程','Accumulate 50 send→read→close cycles on matching terminal identities',{terminalCycles:50},true],
  ['lsp','craft','silver','语义视野','Semantic view','完成 25 次非错误 LSP 调用，活跃 5 天','Finish 25 non-error LSP calls and be active on 5 dates',{ 'tool.lsp':25,activeDays:5}],
  ['semantic-delivery','craft','gold','语义实践','Semantic practice','累计完成 25 轮同时使用 LSP 和交付文件的流程','Accumulate 25 completed turns with LSP use and file delivery',{semanticDeliveryTurns:25},true],
  ['mcp-librarian','research','silver','资源管理员','Resource librarian','累计完成 10 轮同时读取 MCP 资源和交付文件的流程','Accumulate 10 completed turns with MCP resource reading and file delivery',{resourceDeliveryTurns:10},true],
  ['browser-pioneer','research','silver','浏览器探索者','Browser explorer','累计完成 10 轮同时使用 Stagehand 浏览器工具和交付文件的流程','Accumulate 10 completed turns with Stagehand browser tools and file delivery',{browserDeliveryTurns:10},true],
  ['toolbox','mastery','gold','能力工具箱','Capability toolbox','使用 20 种工具，覆盖 10 类已识别能力','Use 20 distinct tools across 10 recognized capability groups',{toolKinds:20,featureKinds:10}],
  ['breadth','mastery','gold','横向探索','Broad exploration','覆盖 12 类已识别能力，活跃 30 天','Use 12 recognized capability groups and be active on 30 dates',{featureKinds:12,activeDays:30}],
  ['expedition','mastery','gold','全能远征','A broad expedition','完成 25 轮至少六类能力的流程，其中单轮达到八类能力','Complete 25 turns using at least 6 capability groups; reach 8 groups in one turn',{broadTurns:25,maxTurnFeatures:8}],
  ['full-calendar','mastery','legendary','四季同行','Across the seasons','在 12 个不同月份活跃，且 100 个活跃日期有交付记录','Be active in 12 distinct calendar months, with deliveries on 100 active dates',{activeMonths:12,deliveryDays:100}],
  ['marathon','mastery','legendary','开发长征','The long journey','活跃 365 天，完成 1500 轮开发流程并记录 300 次交付','Be active on 365 dates, complete 1500 build turns and record 300 deliveries',{activeDays:365,buildLoops:1500,deliveries:300}],
  ['master','mastery','legendary','开发者大师','Developer mastery','完成千轮开发、200 轮研究、100 轮协作交付、50 次成员全完成工作流、100 次多能力 PTC，并活跃 180 天','Complete 1000 build turns, 200 research turns, 100 collaborative deliveries, 50 all-completed workflows, 100 multi-group PTC programs and 180 active dates',{buildLoops:1000,researchLoops:200,collaborationTurns:100,cleanWorkflows:50,ptcMultiPrograms:100,activeDays:180}],
  ['mapped-route','craft','gold','循图施工','Navigate and build','累计完成 25 轮同时有 grep、glob、开发流程及文件交付的流程','Accumulate 25 completed turns with grep, glob, a build sequence and file delivery',{mappedBuildTurns:25},true],
  ['long-session','craft','gold','深耕一隅','Stay with the work','在同一个有交付记录的主会话中，正常完成 100 轮','Normally complete 100 turns in a single main session containing a file delivery',{maxDeliveredSessionTurns:100}],
  ['planner-parallel','skills','gold','齐头并进','Parallel checklist','累计 10 轮将至少 3 项、曾有两项同时进行中的同一清单更新为全完成','In 10 completed turns, finish an unchanged 3+ item list that recorded 2 items in progress together',{parallelChecklistTurns:10},true],
  ['program-delivery','automation','gold','程序到成果','Programs to artifacts','累计完成 25 轮先完成无错误 PTC 程序、后交付文件的流程','Accumulate 25 completed turns that finish an error-free PTC program before delivering files',{ptcDeliveryTurns:25},true],
  ['token-scribe','journey','silver','字里行间','Words accumulated','累计记录 100 万输出 Token；不含输入、缺失用量或失败尝试','Accumulate 1 million recorded output tokens; excludes input, missing usage and failed attempts',{tokens:1000000},true],
  ['team-conductor','orchestration','gold','接力指挥','Relay conductor','累计完成 50 轮有子代理完成响应后再交付的主会话流程','Accumulate 50 main turns with a linked child response completed before delivery',{collaborationTurns:50},true],
  ['monthly-streak','journey','gold','月度连载','A month of returning','连续 30 天发送用户消息','Send user messages on 30 consecutive dates',{bestStreak:30}],
]);
const secrets = make('secret', [
  ['secret-archive','research','secret','旧知新解','Old knowledge, new insight','完成 5 轮先检索历史、后交付文件的流程','Complete 5 turns with history search before file delivery',{archiveTurns:5}],
  ['secret-method','craft','secret','章法','Method','完成 10 轮同时有先规划后执行、grep、开发流程及交付的流程','Complete 10 turns combining plan-first execution, grep, a build sequence and delivery',{methodTurns:10}],
  ['secret-relay','orchestration','secret','接力赛','Relay','完成 3 轮同时有 Skill 实践、正常结束的工作流、子代理完成响应及随后交付的主会话流程','Complete 3 main turns with Skill practice, a completed workflow and a child response before delivery',{relayTurns:3}],
  ['secret-comeback','orchestration','secret','重整旗鼓','Try again','某工作流出错后，再启动同名工作流并正常完成','After a workflow fails, start and complete a later run with the same name',{workflowRecoveries:1}],
  ['secret-allrounder','mastery','secret','十项全能','Ten capabilities','在同一正常完成的轮次中使用 10 类能力','Use 10 recognized capability groups in one normally completed turn',{maxTurnFeatures:10}],
  ['secret-quiet','craft','secret','顺畅协奏','A smooth sequence','完成 10 轮有开发流程及交付、且所有工具返回均无错误标记的流程；不代表测试通过','Complete 10 build-and-delivery turns with no tool error flags; this does not certify passing tests',{quietBuildTurns:10}],
  ['secret-study','skills','secret','知行相接','Study into practice','完成 10 轮同时加载 Skill、完成研究流程并交付文件的流程','Complete 10 turns combining a loaded Skill, research sequence and file delivery',{skillResearchTurns:10}],
  ['secret-unblocked','journey','secret','破局','Past the block','将一个曾记录为阻塞的同一目标记录为完成','Record a goal as completed after that same goal was recorded as blocked',{recoveredGoals:1}],
  ['secret-finish','skills','secret','收官有序','An orderly finish','完成 10 轮同时完成同一清单、开发流程并交付文件的流程','Complete 10 turns combining an unchanged finished checklist, build sequence and file delivery',{checklistBuildTurns:10}],
]);
export const achievements = [...coreAchievements, ...specialties, ...secrets, ...make('core', [
  ['platinum','mastery','platinum','成就殿堂','Hall of mastery','解锁全部 24 项核心成就；专项、隐藏和成就升级不影响白金','Unlock all 24 core achievements; specialties, secrets and achievement levels do not block platinum',{}],
])];

/** Each base requirement must pass; no amount of progress on one replaces another.
 * @param achievement - Catalog item.
 * @param stats - Aggregate statistics.
 * @returns Base requirements, completion and mean progress.
 */
export function progressOf(achievement, stats) {
  const requirements = achievement.requirements.map(([metric, target]) => ({
    metric, target, value: metric.startsWith('tool.') ? stats.successfulTools?.[metric.slice(5)] ?? 0 : stats[metric] ?? 0,
  }));
  return { requirements, complete: requirements.length > 0 && requirements.every(r => r.value >= r.target),
    fraction: requirements.length === 0 ? 0 : requirements.reduce((sum, r) => sum + Math.min(1, r.value / r.target), 0) / requirements.length };
}

/** Only explicitly marked cumulative awards level up; each level doubles the target.
 * @param achievement - Catalog item with one cumulative requirement when upgradeable.
 * @param stats - Aggregate statistics.
 * @returns Current level and next target, or null for a one-time award.
 */
export function achievementLevel(achievement, stats) {
  if (!achievement.upgrade) return null;
  const { metric, value, target: base } = progressOf(achievement, stats).requirements[0];
  let level = 0, target = base;
  while (value >= target && Number.isFinite(target * 2)) { level++; target *= 2; }
  return { level, metric, value, target, fraction: Math.min(1, value / target) };
}

/** Player XP comes from first unlocks, independent of repeatable achievement levels.
 * @param unlocked - Unlock records keyed by catalog ID.
 * @returns Earned XP and player rank thresholds.
 */
export function playerLevel(unlocked) {
  const xp = achievements.reduce((sum, item) => sum + (unlocked[item.id] ? item.points : 0), 0);
  const thresholds = [0,50,150,400,800,1500,2500,4000,6000,8000];
  const level = thresholds.filter(value => xp >= value).length;
  return { xp, level, current: thresholds[level - 1], next: thresholds[level] ?? null };
}
