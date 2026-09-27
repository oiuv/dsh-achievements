# DSH Achievement Hall

[中文](README.zh-CN.md)

Local usage statistics and 36 achievements for DeepSeek Harness. The Hall counts persisted session events, recognizes work across DSH capabilities, and shows progress toward the next challenge.

## Install

Requires DSH `0.1.7-rc.2`, its Web profile, and Node `^22.19.0 || >=24`. DSH APIs are pre-stable; other releases require verification.

Download the release tarball, then run:

```sh
dsh plugin --profile web add ./local-dsh-achievements-0.2.0.tgz
dsh --profile web
```

Restart an already running DSH Host and reload the page. Open **Achievement Hall** in the sidebar.

Install from a GitHub checkout:

```sh
git clone https://github.com/oiuv/dsh-achievements.git
dsh plugin --profile web add ./dsh-achievements
dsh --profile web
```

The repository includes the built `client.js`; installation does not run a build script. Keep the package name `@local/dsh-achievements` consistent in package.json and cordis.patch.yml. Remove with `dsh plugin --profile web remove @local/dsh-achievements`.

## Statistics and achievement rules

- Manual, appended user messages determine activity dates and the hourly chart. Tool messages, replacement messages, and subagent prompts do not count as manual activity.
- Output tokens sum recorded `assistant/message.usage.outputTokens`. Missing usage stays uncounted. This is not a billing estimate or a count of input tokens, failed attempts, or provider-side retries.
- Sessions count once they contain a completed step. Child sessions contribute their own steps and tool usage; inherited fork prefixes are excluded.
- Tool attempts and non-error results are tracked separately. Challenges use results without `isError`. This does not certify that shell tests passed or that an artifact is good.
- Goals count distinct completed goal IDs; workflows count distinct runs whose stop reason is completed. Goal creation and failed runs earn no completion credit.
- Composite challenges require a sequence inside one session, such as read → edit/write → bash/pwsh. Repeating the sequence in the same session counts once.
- Four onboarding challenges introduce meaningful work. Higher tiers require more sessions, active days and capabilities. There are 32 public achievements, three secrets, and platinum for all public achievements. XP comes only from first unlocks.
- Historical sessions import on startup without a notification burst. Unlock timestamps record detection, not the original event date. Counts survive restarts and deleted source sessions; a fork or repeated import does not add the same prefix again.
- Dates use the configured timezone. The current streak allows today or yesterday as its last active date. Changing timezone requires a new statistics database.
- Feature achievements recognize DSH's canonical tool names. Renamed tools remain in usage totals but do not satisfy the corresponding feature challenges. Optional skills, workflows, LSP and other capabilities must be enabled in DSH; the plugin does not install or invoke them.

Statistics follow persistence flushes and polling rather than every live streaming chunk. Unreadable history displays a partial-import status with a retry action. There is no remote analytics, conversation upload, or model-facing tool.

## Configuration and data

The bundle stores statistics at `$DSH_HOME/achievements/stats.sqlite`, using the system timezone. Override the complete plugin configuration in the profile's `cordis.patch.yml`:

```yaml
- id: dsh-achievements
  config:
    database: !!js dshHomePath('achievements', 'stats.sqlite')
    timeZone: Asia/Shanghai
    pollMs: 3000
    pageSize: 512
    busyTimeoutMs: 5000
```

The database path must be absolute. Polling accepts at least 1000 ms; pages contain 1–4096 events; SQLite busy timeout accepts 1–30000 ms. The timezone is an IANA name validated at load. Use the same database for profiles sharing one session history.

SQLite stores counters, session checkpoints, activity dates, tool/skill identifiers and goal/workflow IDs. It does not store prompts, responses, tool arguments or tool output. The authenticated DSH connection owns the dashboard endpoint. On unload, polling stops, pending reads close, and then SQLite closes.

To rebuild statistics, stop every Host using this database and remove that statistics file, then restart. Existing session history is imported again. Development-only browser counters `dsh-ach-s-v4` and `dsh-ach-u-v2` are discarded on activation.

## Develop and release

```sh
npm ci
npm test
npm run build
npm run check
npm pack
```

Edit `src/client.js`, `src/client.css`, and the bilingual dictionaries for UI work. `src/catalog.js` owns achievement requirements and XP. Commit the generated `client.js` with its sources. The build uses explicit compiler options and ignores parent tsconfig files. CI verifies tests, reproducible builds and packaging on Windows and Linux using Node 22.19 and 24.

`src/engine.js` owns atomic event reduction/checkpoints and unlocks. `src/collector.js` reads DSH history and handles cancellation. Their owner-local tests cover replay, failures, timezone changes and teardown. No new model-visible input or session event is introduced. The plugin does not modify DSH persistence schemas and needs no separate runtime-invariant installer: its checkpoint and reduced state commit in one SQLite transaction.

Publish the sources as a standalone repository and attach the generated tarball to its release. Never include a statistics database, DSH home, node_modules, or local test output. The [MIT license](LICENSE) applies.
