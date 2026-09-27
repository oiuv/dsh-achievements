/** Versioned achievement rules: explicit capabilities and transparent numeric requirements. */
export const catalogVersion = 1;
const rows = [
  [
    "first-loop",
    "journey",
    "bronze",
    "开发者上线",
    "Developer online",
    "在同一会话依次成功读取文件、修改文件、运行命令",
    "Read a file, modify a file, then run a command successfully in one session",
    [
      [
        "buildLoops",
        1
      ]
    ]
  ],
  [
    "first-plan",
    "journey",
    "bronze",
    "有备而来",
    "Prepared",
    "在一个会话使用待办工具，并成功完成至少 5 次工具调用",
    "Use todos and finish at least 5 successful tool calls in one session",
    [
      [
        "plannedSessions",
        1
      ]
    ]
  ],
  [
    "first-research",
    "journey",
    "bronze",
    "查证之后",
    "Check the source",
    "同一会话依次成功搜索网页、读取网页、写入文件或展示交付物",
    "Search the web, fetch a page, then write a file or present an artifact in one session",
    [
      [
        "researchLoops",
        1
      ]
    ]
  ],
  [
    "first-skill",
    "journey",
    "bronze",
    "学以致用",
    "Put it to work",
    "加载 Skill 后，在同一会话成功修改文件或运行命令",
    "Load a Skill, then modify a file or run a command in the same session",
    [
      [
        "skillSessions",
        1
      ]
    ]
  ],
  [
    "craft-5",
    "craft",
    "silver",
    "小步交付",
    "Small iterations",
    "完成 5 个读取→修改→命令会话，并在 3 个日期发送过消息",
    "Complete 5 read→modify→command sessions; send messages on 3 dates",
    [
      [
        "buildLoops",
        5
      ],
      [
        "activeDays",
        3
      ]
    ]
  ],
  [
    "search-map",
    "craft",
    "silver",
    "代码导航员",
    "Code navigator",
    "成功使用 grep 50 次、glob 30 次，覆盖至少 10 个活跃会话",
    "Succeed with grep 50 times and glob 30 times across at least 10 active sessions",
    [
      [
        "tool.grep",
        50
      ],
      [
        "tool.glob",
        30
      ],
      [
        "sessions",
        10
      ]
    ]
  ],
  [
    "lsp",
    "craft",
    "silver",
    "语义视野",
    "Semantic vision",
    "成功使用 LSP 25 次，并在 5 个日期发送过消息",
    "Use LSP successfully 25 times; send messages on 5 dates",
    [
      [
        "tool.lsp",
        25
      ],
      [
        "activeDays",
        5
      ]
    ]
  ],
  [
    "terminal",
    "craft",
    "silver",
    "终端掌舵",
    "Terminal pilot",
    "在 5 个不同会话完成 terminal_open→terminal_send→terminal_close",
    "Complete terminal_open→terminal_send→terminal_close in 5 sessions",
    [
      [
        "terminalSessions",
        5
      ]
    ]
  ],
  [
    "craft-master",
    "craft",
    "gold",
    "工程匠人",
    "Engineering craft",
    "完成 30 个读取→修改→命令会话，成功修改文件 200 次，活跃 20 天",
    "Complete 30 build-loop sessions, 200 successful file modifications and 20 active dates",
    [
      [
        "buildLoops",
        30
      ],
      [
        "fileChanges",
        200
      ],
      [
        "activeDays",
        20
      ]
    ]
  ],
  [
    "research-5",
    "research",
    "silver",
    "证据链",
    "Evidence trail",
    "完成 5 个搜索→网页→交付会话，并成功读取网页 25 次",
    "Complete 5 research-loop sessions and 25 successful web fetches",
    [
      [
        "researchLoops",
        5
      ],
      [
        "tool.web_fetch",
        25
      ]
    ]
  ],
  [
    "archive",
    "research",
    "silver",
    "经验检索员",
    "Archive explorer",
    "成功检索历史会话或事件 25 次，活跃 5 天",
    "Search past sessions or events successfully 25 times; be active on 5 dates",
    [
      [
        "historySearches",
        25
      ],
      [
        "activeDays",
        5
      ]
    ]
  ],
  [
    "visual",
    "research",
    "silver",
    "图文并读",
    "Visual reader",
    "成功读取图片 20 次、读取文件 100 次",
    "Read images successfully 20 times and files 100 times",
    [
      [
        "tool.read_image",
        20
      ],
      [
        "tool.read",
        100
      ]
    ]
  ],
  [
    "deliver",
    "research",
    "silver",
    "成果可见",
    "Visible deliverables",
    "成功展示交付物 15 次，覆盖至少 10 个活跃会话",
    "Present artifacts successfully 15 times across at least 10 active sessions",
    [
      [
        "tool.present",
        15
      ],
      [
        "sessions",
        10
      ]
    ]
  ],
  [
    "research-master",
    "research",
    "gold",
    "研究员",
    "Researcher",
    "完成 25 个搜索→网页→交付会话，成功读取网页 150 次，活跃 20 天",
    "Complete 25 research-loop sessions, 150 web fetches and 20 active dates",
    [
      [
        "researchLoops",
        25
      ],
      [
        "tool.web_fetch",
        150
      ],
      [
        "activeDays",
        20
      ]
    ]
  ],
  [
    "delegate",
    "orchestration",
    "silver",
    "分工初成",
    "Delegation practice",
    "成功调用 subagent 10 次，覆盖至少 5 个活跃会话",
    "Invoke subagent successfully 10 times across at least 5 active sessions",
    [
      [
        "tool.subagent",
        10
      ],
      [
        "sessions",
        5
      ]
    ]
  ],
  [
    "relay-delivery",
    "orchestration",
    "silver",
    "协作交付",
    "Collaborative delivery",
    "在 5 个不同会话中，成功调用子代理后展示交付物",
    "Invoke a subagent, then present an artifact successfully in 5 sessions",
    [
      [
        "delegationSessions",
        5
      ]
    ]
  ],
  [
    "workflow",
    "orchestration",
    "silver",
    "流程设计师",
    "Workflow designer",
    "完成 5 次工作流，活跃 5 天；取消或出错不计入",
    "Complete 5 workflows on a profile with workflow support; be active on 5 dates",
    [
      [
        "workflows",
        5
      ],
      [
        "activeDays",
        5
      ]
    ]
  ],
  [
    "goal",
    "orchestration",
    "silver",
    "有始有终",
    "Finish the objective",
    "将 5 个不同目标推进到 complete 状态",
    "Bring 5 distinct goals to the complete phase",
    [
      [
        "goals",
        5
      ]
    ]
  ],
  [
    "orchestration-master",
    "orchestration",
    "gold",
    "编排大师",
    "Orchestrator",
    "完成 30 次工作流、20 个目标，以及 20 个子代理→交付会话",
    "Complete 30 workflows, 20 goals and 20 delegation→delivery sessions",
    [
      [
        "workflows",
        30
      ],
      [
        "goals",
        20
      ],
      [
        "delegationSessions",
        20
      ]
    ]
  ],
  [
    "skills-3",
    "skills",
    "silver",
    "工具之外",
    "Beyond tools",
    "成功加载 3 种 Skill，并完成 5 个 Skill→修改或命令会话",
    "Load 3 distinct Skills successfully and complete 5 Skill-practice sessions",
    [
      [
        "distinctSkills",
        3
      ],
      [
        "skillSessions",
        5
      ]
    ]
  ],
  [
    "skills-5",
    "skills",
    "silver",
    "知识应用者",
    "Knowledge in action",
    "成功加载 5 种 Skill，完成 20 个 Skill 实践会话，活跃 10 天",
    "Load 5 Skills, complete 20 Skill-practice sessions and be active on 10 dates",
    [
      [
        "distinctSkills",
        5
      ],
      [
        "skillSessions",
        20
      ],
      [
        "activeDays",
        10
      ]
    ]
  ],
  [
    "planner",
    "skills",
    "silver",
    "任务拆解师",
    "Task planner",
    "在 15 个会话使用待办工具，且每个会话至少成功调用工具 5 次",
    "Use todos in 15 sessions with at least 5 successful tool calls each",
    [
      [
        "plannedSessions",
        15
      ]
    ]
  ],
  [
    "toolbox",
    "skills",
    "silver",
    "能力工具箱",
    "Capability toolbox",
    "成功使用 15 种工具，累计成功调用 500 次",
    "Use 15 different tools successfully and finish 500 successful calls",
    [
      [
        "toolKinds",
        15
      ],
      [
        "successfulCalls",
        500
      ]
    ]
  ],
  [
    "skills-master",
    "skills",
    "gold",
    "多领域实践",
    "Cross-domain practice",
    "加载 8 种 Skill，完成 50 个 Skill 实践会话，活跃 25 天",
    "Load 8 Skills, complete 50 Skill-practice sessions and be active on 25 dates",
    [
      [
        "distinctSkills",
        8
      ],
      [
        "skillSessions",
        50
      ],
      [
        "activeDays",
        25
      ]
    ]
  ],
  [
    "active-10",
    "journey",
    "silver",
    "十日练习",
    "Ten days of practice",
    "在 10 个不同日期发送消息，并完成 10 个读取→修改→命令会话",
    "Send messages on 10 dates and complete 10 build-loop sessions",
    [
      [
        "activeDays",
        10
      ],
      [
        "buildLoops",
        10
      ]
    ]
  ],
  [
    "active-30",
    "journey",
    "gold",
    "长期项目",
    "Long-term project",
    "活跃 30 天，完成 50 个活跃会话及 20 个读取→修改→命令会话",
    "Be active on 30 dates, finish 50 active sessions and 20 build-loop sessions",
    [
      [
        "activeDays",
        30
      ],
      [
        "sessions",
        50
      ],
      [
        "buildLoops",
        20
      ]
    ]
  ],
  [
    "returning",
    "journey",
    "silver",
    "持续推进",
    "Steady progress",
    "最长连续活跃 7 天，且成功使用 8 种工具",
    "Reach a 7-day activity streak and use 8 tools successfully",
    [
      [
        "bestStreak",
        7
      ],
      [
        "toolKinds",
        8
      ]
    ]
  ],
  [
    "veteran",
    "journey",
    "legendary",
    "百日开发者",
    "Hundred-day developer",
    "活跃 100 天，完成 100 个读取→修改→命令会话及 50 个目标",
    "Be active on 100 dates; complete 100 build-loop sessions and 50 goals",
    [
      [
        "activeDays",
        100
      ],
      [
        "buildLoops",
        100
      ],
      [
        "goals",
        50
      ]
    ]
  ],
  [
    "reliable",
    "journey",
    "gold",
    "积累成章",
    "A body of work",
    "成功使用工具 3000 次、展示交付物 50 次，活跃 30 天",
    "Finish 3,000 successful calls, present artifacts 50 times and be active on 30 dates",
    [
      [
        "successfulCalls",
        3000
      ],
      [
        "tool.present",
        50
      ],
      [
        "activeDays",
        30
      ]
    ]
  ],
  [
    "breadth",
    "mastery",
    "gold",
    "横向探索",
    "Broad explorer",
    "成功使用 8 个能力类别，活跃 15 天",
    "Use 8 capability categories successfully; be active on 15 dates",
    [
      [
        "featureKinds",
        8
      ],
      [
        "activeDays",
        15
      ]
    ]
  ],
  [
    "expedition",
    "mastery",
    "gold",
    "全能远征",
    "Full-stack expedition",
    "在 5 个不同会话中，各成功使用至少 6 个能力类别",
    "Use at least 6 capability categories successfully in each of 5 sessions",
    [
      [
        "broadSessions",
        5
      ]
    ]
  ],
  [
    "master",
    "mastery",
    "legendary",
    "开发者大师",
    "Developer master",
    "完成 50 个开发闭环、20 个研究闭环、20 个目标和 10 次工作流，活跃 40 天",
    "Complete 50 build loops, 20 research loops, 20 goals, 10 workflows and 40 active dates",
    [
      [
        "buildLoops",
        50
      ],
      [
        "researchLoops",
        20
      ],
      [
        "goals",
        20
      ],
      [
        "workflows",
        10
      ],
      [
        "activeDays",
        40
      ]
    ]
  ],
  [
    "secret-archive",
    "research",
    "secret",
    "旧知新解",
    "Old knowledge, new insight",
    "在 5 个会话中同时成功检索历史、读取网页并展示交付物",
    "Search history, fetch the web and present artifacts in 5 sessions",
    [
      [
        "archiveSessions",
        5
      ]
    ]
  ],
  [
    "secret-method",
    "craft",
    "secret",
    "章法",
    "Method",
    "在 10 个会话完成开发闭环，同时使用 grep 和待办工具",
    "Complete a build loop with grep and todos in each of 10 sessions",
    [
      [
        "methodSessions",
        10
      ]
    ]
  ],
  [
    "secret-relay",
    "orchestration",
    "secret",
    "接力赛",
    "Relay",
    "在 3 个会话中成功加载 Skill、调用子代理、完成工作流并展示交付物",
    "Load a Skill, invoke a subagent, complete a workflow and present an artifact in 3 sessions",
    [
      [
        "relaySessions",
        3
      ]
    ]
  ],
  [
    "platinum",
    "mastery",
    "platinum",
    "成就殿堂",
    "Hall of mastery",
    "解锁全部 32 个公开成就；隐藏成就不影响白金",
    "Unlock all 32 public achievements; secrets do not block platinum",
    []
  ]
];
export const tierPoints = { bronze: 25, silver: 75, gold: 150, legendary: 300, secret: 100, platinum: 500 };
export const achievements = rows.map(([id, category, tier, zh, en, zhDescription, enDescription, requirements]) => ({
  id, category, tier, points: tierPoints[tier], name: { zh, en },
  description: { zh: zhDescription, en: enDescription }, requirements,
}));
/** Each requirement must pass; progress remains visible for every public achievement.
 * @param achievement - Achievement definition.
 * @param stats - Current aggregate metrics.
 * @returns Per-requirement progress, mean fraction and completion status.
 */
export function progressOf(achievement, stats) {
  const requirements = achievement.requirements.map(([metric, target]) => ({
    metric, target, value: metric.startsWith('tool.')
      ? stats.successfulTools?.[metric.slice(5)] ?? 0 : stats[metric] ?? 0,
  }));
  return { requirements, complete: requirements.length > 0 && requirements.every(r => r.value >= r.target),
    fraction: requirements.length === 0 ? 0 : requirements.reduce((sum,r) => sum + Math.min(1,r.value/r.target),0) / requirements.length };
}
/** XP comes only from unlocked achievements, never from repeatable token spending.
 * @param unlocked - Unlock records keyed by achievement ID.
 * @returns Earned XP, current level and the next level threshold or null.
 */
export function playerLevel(unlocked) {
  const xp = achievements.reduce((sum, item) => sum + (unlocked[item.id] ? item.points : 0), 0);
  const thresholds = [0,150,600,1500,2500,3500];
  const level = thresholds.filter(value => xp >= value).length;
  return { xp, level, next: thresholds[level] ?? null };
}
