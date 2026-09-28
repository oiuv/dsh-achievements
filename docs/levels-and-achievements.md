---
description: Spoiler-free reference for player ranks, XP thresholds, cumulative achievement levels and every public achievement.
---

# Player levels and public achievements

[简体中文](levels-and-achievements.zh-CN.md) · [Back to README](../README.md)

## Summary

Look up player titles, the XP needed for each level, and public achievement requirements and difficulty. Player levels measure first unlocks, while achievement levels record continued use of particular capabilities; the two systems are independent. This page contains no hidden achievement names, requirements or discovery hints.

## Contents

- [Player levels](#player-levels)
- [Achievement levels](#achievement-levels)
- [Collections and platinum](#collections-and-platinum)
- [Counting terms](#counting-terms)
- [Public achievement catalog](#public-achievement-catalog)
- [Maintenance](#maintenance)

## Player levels

Players start at level 1, Explorer, with 0 XP. Each achievement contributes XP only on its first unlock, and player level depends on cumulative XP. Reaching a threshold below grants that title; leveling up does not spend XP, and importing history can advance several levels at once.

| Player level | Title | Cumulative XP threshold | Increase from previous threshold |
| --- | --- | ---: | ---: |
| 1 | Explorer | 0 | — |
| 2 | Apprentice | 50 | 50 |
| 3 | Practitioner | 150 | 100 |
| 4 | Builder | 400 | 250 |
| 5 | Engineer | 800 | 400 |
| 6 | Specialist | 1,500 | 700 |
| 7 | Expert | 2,500 | 1,000 |
| 8 | Master | 4,000 | 1,500 |
| 9 | Grandmaster | 6,000 | 2,000 |
| 10 | Legend | 8,000 | 2,000 |

### XP sources

An achievement's difficulty determines its first-unlock XP. This table shows counts and rewards without revealing hidden challenge content.

<!-- generated:xp:start -->

| Difficulty or award | Achievements | XP per first unlock |
| --- | ---: | ---: |
| Apprentice | 9 | 25 |
| Practitioner | 24 | 75 |
| Expert | 27 | 150 |
| Legend | 11 | 300 |
| Secret | 9 | 100 |
| Platinum | 1 | 500 |

All public first unlocks total **9,875 XP**, enough for player level 10; all first unlocks including hidden achievements total **10,775 XP**. Discovering hidden content is not required to reach the highest player level.

<!-- generated:xp:end -->

Messages, tool calls, output tokens and active dates do not directly award XP; they advance the corresponding achievement requirements. Achievement upgrades award no additional XP either. One activity can satisfy several distinct achievements, each contributing XP on its first unlock.

For example, first unlocking Developer online and Prepared earns 50 XP and reaches player level 2, Apprentice. Unlocking Small iterations then adds 75 XP for a total of 125 XP, leaving 25 XP to reach level 3.

### Level progress

The player progress bar divides current XP minus the current level's threshold by the difference between the next and current thresholds. At 200 XP, for example, the player is level 3 with `(200 - 150) / (400 - 150) = 20%` progress and needs another 200 XP for level 4.

The maximum player level is 10. The interface then shows Highest player level; remaining first unlocks still contribute XP, but there is no player level 11. Upgradeable achievements record continued growth through their own levels.

## Achievement levels

Only the 19 cumulative achievements marked Upgradeable in the catalog have levels. Reaching the base target unlocks Lv. 1, and every doubling of the cumulative value adds a level. There is no predefined achievement-level cap; importing many records can also advance several levels at once.

For a base target B, Lv. N requires a cumulative `B × 2^(N - 1)`; after reaching Lv. N, the next target is `B × 2^N`. Targets always compare the historical total, and leveling up never clears the count.

| Achievement level | Relative to base target | Words accumulated: output tokens | Practice in motion: build turns |
| --- | ---: | ---: | ---: |
| Lv. 1 | B | 1,000,000 | 25 |
| Lv. 2 | 2B | 2,000,000 | 50 |
| Lv. 3 | 4B | 4,000,000 | 100 |
| Lv. 4 | 8B | 8,000,000 | 200 |
| Lv. 5 | 16B | 16,000,000 | 400 |

Cards show Upgradeable before unlocking, then the current Lv. and next target. Their progress bar uses cumulative value / next target: at 60 build turns, Practice in motion is Lv. 2 and shows 60 / 100, or 60%. This calculation differs from the player-level progress bar.

Achievement upgrades neither increase the unlocked count nor contribute more player XP. The same statistic can advance an upgradeable achievement and other independent achievements; at 100 build turns, for example, Practice in motion reaches Lv. 3, while Engineering craft also requires build turns completed on 30 active dates.

Eligibility is explicit for each achievement; a numeric requirement alone does not make it upgradeable. First experiences, single-run records, capability diversity, day streaks, secrets and platinum do not level up; some cumulative milestones also remain one-time challenges. Levels use persisted cumulative statistics, so replaying a record or restarting normally does not count it again.

## Collections and platinum

The 81 achievements comprise three collections and one platinum award. Player level, earning platinum, collecting every achievement and cumulative achievement levels are separate measures of progress.

| Collection or award | Count | Scope |
| --- | ---: | --- |
| Core challenges | 24 | Standard development, planning, delivery and sustained practice |
| Specialty challenges | 47 | Specific DSH capabilities and combinations; corresponding features must be enabled |
| Platinum award | 1 | First unlocks of all 24 core challenges |
| Hidden challenges | 9 | Content left for players to discover |

There are 72 public achievements: 24 core, 47 specialty and one platinum. Platinum does not require specialties, hidden challenges or achievement upgrades; earning it does not mean collecting all 81 achievements. Hidden challenges conceal their names and requirements until unlocked, and this page does not publish those details after unlocking either.

## Counting terms

The catalog describes behavior that can be checked against session logs. Every listed requirement must be met. Cumulative requirements may span sessions, while requirements for one turn or one main session must be met within that scope. Active dates and months need not be consecutive unless explicitly stated.

- **Normally completed turn**: a turn that starts and records normal completion. Each combination measured in turns counts at most once per turn; cancelled, blocked or failed turns earn no completed-turn credit. One turn can advance different achievements.
- **Build turn**: read a file, modify or write a file, then run a shell command in one normally completed turn. Each later call must start after the previous result; calls must return without error flags. The modified file need not be the file previously read, and the sequence does not certify passing tests.
- **Research turn**: search the web, fetch a page, then modify or write a file or actually deliver files, in order within one normally completed turn.
- **Active dates and months**: calendar dates and months with manually appended user messages in main sessions, using the configured timezone. An active date with development, research or delivery also needs the corresponding work recorded that day.
- **File delivery**: a non-empty delivery event, deduplicated by call ID within its session. Delivery counts are not counts of files or distinct works.
- **Skill practice**: successfully load a Skill before modifying files or running a command in the same normally completed turn. Multi-Skill practice requires at least two distinct Skills loaded before those actions.
- **All-completed workflow**: the overall run ends normally and at least three recorded members all complete. A multi-phase requirement additionally needs at least two named phases; distinct workflows are counted by name.
- **Multi-capability PTC program**: a program covering at least three recognized capability groups, excluding the outer programming tool itself. A batch program contains at least ten subcalls; the program and all subcalls must finish without error flags.
- **Collaborative delivery**: a linked child response completes normally within the main turn before file delivery, and the main turn ends normally. The response from starting a subagent is insufficient by itself.
- **Capability groups and non-error calls**: classification uses recognized shipped tool names and includes native calls and PTC subcalls. A missing error flag does not certify exit code zero or work quality.
- **Recorded output tokens**: only the output usage attached to assistant messages is summed. Input tokens are excluded, missing usage is not estimated, and the count is not a billing total.

Actual work in main and child sessions contributes to totals; requirements that explicitly name main sessions only count those sessions. Data updates after logs are persisted and polled. See the README's [counting rules](../README.md#statistics-and-achievement-rules) and [configuration and data](../README.md#configuration-and-data) for counting scope, deduplication, unreadable history, rebuilding and storage.

## Public achievement catalog

Only the 72 public achievements appear below, grouped by capability path and ordered from lower to higher difficulty within each group. Upgradeable means the first-unlock requirement is also the Lv. 1 base target; — means a one-time unlock. Names and first-unlock requirements match the interface, with counting terms defined above.

<!-- generated:catalog:start -->

- [Developer journey](#path-journey)
- [Engineering craft](#path-craft)
- [Research & delivery](#path-research)
- [Collaboration & workflows](#path-orchestration)
- [Skills & planning](#path-skills)
- [PTC & terminals](#path-automation)
- [Mastery](#path-mastery)

<a id="path-journey"></a>

### Developer journey

11 public achievements; 2 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| Developer online | Core | Apprentice | Read, modify a file and run a command in order in one normally completed turn | — |
| Prepared | Core | Apprentice | Record unfinished todos, then finish 5 non-todo calls in the same normally completed turn | — |
| First delivery | Core | Apprentice | Record your first non-empty file delivery | — |
| See it through | Core | Apprentice | Record a completed goal for the first time | — |
| Goals recorded | Core | Practitioner | Record 5 distinct completed goals | — |
| Ten active days | Core | Practitioner | Send user messages on 10 dates and complete 10 build turns overall | — |
| Keep returning | Core | Practitioner | Send user messages on 7 consecutive dates and record 5 deliveries overall | — |
| Words accumulated | Specialty | Practitioner | Accumulate 1 million recorded output tokens; excludes input, missing usage and failed attempts | Upgradeable |
| Goal by goal | Core | Expert | Accumulate 50 distinct completed goals | Upgradeable |
| A longer journey | Core | Expert | Be active on 30 dates and complete 50 build turns overall | — |
| A month of returning | Specialty | Expert | Send user messages on 30 consecutive dates | — |

<a id="path-craft"></a>

### Engineering craft

9 public achievements; 3 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| Small iterations | Core | Practitioner | Complete 5 read→modify→command turns | — |
| Practice in motion | Core | Practitioner | Accumulate 25 read→modify→command turns | Upgradeable |
| Code navigator | Core | Practitioner | Finish 50 grep and 30 glob calls; use both in each of 10 main sessions | — |
| Semantic view | Specialty | Practitioner | Finish 25 non-error LSP calls and be active on 5 dates | — |
| Engineering craft | Core | Expert | Complete 100 build turns, with completed build turns on 30 active dates | — |
| Code cartographer | Core | Expert | Use grep and glob in each of 50 main sessions; complete 50 build turns overall | — |
| Semantic practice | Specialty | Expert | Accumulate 25 completed turns with LSP use and file delivery | Upgradeable |
| Navigate and build | Specialty | Expert | Accumulate 25 completed turns with grep, glob, a build sequence and file delivery | Upgradeable |
| Stay with the work | Specialty | Expert | Normally complete 100 turns in a single main session containing a file delivery | — |

<a id="path-research"></a>

### Research & delivery

12 public achievements; 4 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| Check the source | Specialty | Apprentice | Search, fetch, then write or deliver in one normally completed turn | — |
| Visible deliverables | Core | Practitioner | Record 15 file deliveries, with deliveries in at least 10 main sessions | — |
| Research practice | Specialty | Practitioner | Complete 5 research turns and 25 web fetches overall | — |
| History explorer | Specialty | Practitioner | Search history 25 times, with history searches in at least 10 main sessions | — |
| Visual research | Specialty | Practitioner | Read images and deliver files in each of 5 normally completed turns | — |
| Resource librarian | Specialty | Practitioner | Accumulate 10 completed turns with MCP resource reading and file delivery | Upgradeable |
| Browser explorer | Specialty | Practitioner | Accumulate 10 completed turns with Stagehand browser tools and file delivery | Upgradeable |
| Delivery distance | Core | Expert | Record 100 file deliveries, with deliveries on 30 active dates | — |
| Researcher | Specialty | Expert | Complete 50 research turns, 150 web fetches and 20 active dates | — |
| History into delivery | Specialty | Expert | Accumulate 50 completed turns that search history before delivering files | Upgradeable |
| Visual explorer | Specialty | Expert | Accumulate 50 completed turns with image reading and file delivery | Upgradeable |
| Research expedition | Specialty | Legend | Complete 200 research turns, with research turns completed on 100 active dates | — |

<a id="path-orchestration"></a>

### Collaboration & workflows

10 public achievements; 3 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| First delegation | Specialty | Apprentice | Receive a non-error return from a standard delegation tool; this does not certify child completion | — |
| First workflow | Specialty | Apprentice | Record one normally completed workflow run | — |
| Two in step | Specialty | Practitioner | In one completed main turn, deliver files after a linked child completes a response | — |
| Collaborative delivery | Specialty | Practitioner | Complete 10 main turns with a child response completed before file delivery | — |
| Workflow practice | Specialty | Practitioner | Accumulate 5 normally completed workflow runs | Upgradeable |
| A small squad | Specialty | Expert | Reach 3 responding children before delivery in one turn; complete 10 collaborative delivery turns overall | — |
| Workflow coordination | Specialty | Expert | Complete 25 workflows with at least 3 members, every member completed and the run completed | Upgradeable |
| Relay conductor | Specialty | Expert | Accumulate 50 main turns with a linked child response completed before delivery | Upgradeable |
| Eight in concert | Specialty | Legend | Reach 8 responding children before delivery in one turn; complete 100 collaborative delivery turns overall | — |
| Workflow architect | Specialty | Legend | Complete 50 all-completed workflows with 3+ members across 2+ named phases; reach 8 completed members in one run; complete 10 workflow names | — |

<a id="path-skills"></a>

### Skills & planning

12 public achievements; 3 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| Put it to work | Specialty | Apprentice | Load a Skill before modifying files or running a command in a normally completed turn | — |
| Plan into action | Core | Practitioner | Accumulate 15 completed turns with unfinished todos followed by at least 5 other tool calls | Upgradeable |
| All checked | Core | Practitioner | In one completed turn, change an unfinished list of at least 3 items to all completed without changing its text or order | — |
| Beyond tools | Specialty | Practitioner | Load 3 distinct Skills and complete 5 Skill-practice turns overall | — |
| Skills combined | Specialty | Practitioner | Load at least 2 distinct Skills before modifying files or running a command in one completed turn | — |
| Method in practice | Core | Expert | Complete 100 planned turns and 50 build turns overall | — |
| Checklist practice | Core | Expert | Accumulate 25 completed turns that finish an unchanged checklist of at least 3 items | Upgradeable |
| Knowledge in practice | Specialty | Expert | Load 5 distinct Skills and complete 25 Skill-practice turns overall | — |
| Four Skills together | Specialty | Expert | Practice with 4 Skills in one turn; complete 25 multi-Skill practice turns overall | — |
| Parallel checklist | Specialty | Expert | In 10 completed turns, finish an unchanged 3+ item list that recorded 2 items in progress together | Upgradeable |
| Finishing specialist | Core | Legend | Accumulate 100 completed turns that finish an unchanged checklist of at least 3 items | — |
| Many disciplines | Specialty | Legend | Load 12 distinct Skills; complete 100 practice turns, including 25 with at least 2 Skills loaded before practice | — |

<a id="path-automation"></a>

### PTC & terminals

8 public achievements; 4 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| First program | Specialty | Apprentice | Finish a PTC program with tool subcalls and no error flags in the program or subcalls | — |
| Program coordinator | Specialty | Practitioner | Accumulate 5 PTC programs covering at least 3 capability groups without error flags | Upgradeable |
| Batch practice | Specialty | Practitioner | Accumulate 5 PTC programs with at least 10 subcalls and no error flags | Upgradeable |
| Terminal practice | Specialty | Practitioner | Send, read and close the same terminal in order, 5 times | — |
| Capability composition | Specialty | Expert | Cover 6 capability groups in one error-free PTC program; complete 25 three-group programs overall | — |
| Terminal veteran | Specialty | Expert | Accumulate 50 send→read→close cycles on matching terminal identities | Upgradeable |
| Programs to artifacts | Specialty | Expert | Accumulate 25 completed turns that finish an error-free PTC program before delivering files | Upgradeable |
| Program maestro | Specialty | Legend | Complete 100 three-group PTC programs and 50 programs with 10+ subcalls, all without error flags | — |

<a id="path-mastery"></a>

### Mastery

10 public achievements; 0 upgradeable.

| Achievement | Collection | Difficulty | First-unlock requirements | Upgrades |
| --- | --- | --- | --- | --- |
| A body of work | Core | Expert | Accumulate 3000 non-error tool returns, 50 deliveries and 30 active dates | — |
| Capability toolbox | Specialty | Expert | Use 20 distinct tools across 10 recognized capability groups | — |
| Broad exploration | Specialty | Expert | Use 12 recognized capability groups and be active on 30 dates | — |
| A broad expedition | Specialty | Expert | Complete 25 turns using at least 6 capability groups; reach 8 groups in one turn | — |
| Hundred-day developer | Core | Legend | Complete build turns on 100 active dates, 250 build turns overall and 50 goals | — |
| A thousand iterations | Core | Legend | Complete 1000 build turns, with completed build turns on 180 active dates | — |
| Across the seasons | Specialty | Legend | Be active in 12 distinct calendar months, with deliveries on 100 active dates | — |
| The long journey | Specialty | Legend | Be active on 365 dates, complete 1500 build turns and record 300 deliveries | — |
| Developer mastery | Specialty | Legend | Complete 1000 build turns, 200 research turns, 100 collaborative deliveries, 50 all-completed workflows, 100 multi-group PTC programs and 180 active dates | — |
| Hall of mastery | Platinum | Platinum | Unlock all 24 core achievements; specialties, secrets and achievement levels do not block platinum | — |

<!-- generated:catalog:end -->

## Maintenance

The achievement catalog generates the public tables and XP summary; level explanations are maintained alongside the implementation.

<details>
<summary>Syncing documentation</summary>

From the plugin source directory, run `npm run docs:sync` to refresh generated sections and `npm run docs:check` to check them against the code. When changing the player-level algorithm or counting semantics, review this page and its Chinese counterpart, including the examples. The generator emits only public achievement entries; hidden challenges contribute only their count and common XP reward.

</details>

<details>
<summary>Dev Note</summary>

None.

</details>
