# DSH 成就殿堂

[English](README.md)

为 DeepSeek Harness 提供本地使用统计和 36 项成就。数据来自已保存的会话事件，成就鼓励实际使用 DSH 的不同功能，并显示下一项挑战的进度。

## 安装

需要 DSH `0.1.7-rc.2`、Web profile，以及 Node `^22.19.0 || >=24`。DSH API 尚未稳定，其他版本需另行验证。

下载 Release 中的安装包后运行：

```sh
dsh plugin --profile web add ./local-dsh-achievements-0.2.0.tgz
dsh --profile web
```

已运行的 DSH 需要重启 Host 并刷新网页。在侧栏点击**成就殿堂**。

从 GitHub 源码安装：

```sh
git clone https://github.com/oiuv/dsh-achievements.git
dsh plugin --profile web add ./dsh-achievements
dsh --profile web
```

仓库包含构建好的 `client.js`，安装无需执行构建脚本。package.json 和 cordis.patch.yml 中的包名 `@local/dsh-achievements` 必须保持一致。卸载命令：`dsh plugin --profile web remove @local/dsh-achievements`。

## 统计与成就规则

- 手动追加的用户消息决定活跃日期和小时分布。工具消息、替换消息和子代理提示不计入手动活跃。
- 输出 Token 累计已记录的 `assistant/message.usage.outputTokens`。缺失用量不估算；此数值不代表账单，不包含输入 Token、失败尝试或供应商内部重试。
- 包含已结束步骤的会话计数一次。子会话贡献自身的步骤和工具使用；分叉继承的历史前缀不重复累计。
- 工具调用与非错误返回分别统计。成就使用没有 `isError` 的返回；这不代表 shell 中的测试通过，也不评价交付物质量。
- 目标按已完成的目标 ID 去重；工作流按完成的运行 ID 去重。创建目标或运行失败不会获得完成奖励。
- 组合挑战要求在同一会话按顺序使用功能，例如读取 → 编辑/写入 → bash/pwsh。在同一会话重复此流程只计一次。
- 4 个入门成就引导有效使用；高阶成就要求更多会话、活跃日期和功能种类。共 32 个公开成就、3 个隐藏成就，公开成就全部解锁可获得白金。经验只来自首次解锁。
- 启动时静默导入历史，不连续弹出历史解锁提示。解锁日期记录检测时间，不回溯历史达成日期。统计在重启及源会话删除后保留；分叉或重复导入不会再次累计同一前缀。
- 日期使用配置的时区。连续活跃天数允许最近活跃日为今天或昨天；更换时区需要新的统计数据库。
- 功能成就识别 DSH 的标准工具名。改名后的工具仍计入使用总量，但不满足对应功能成就。Skill、工作流、LSP 等可选能力需在 DSH 中启用，插件不会安装或调用这些能力。

数据在会话写入磁盘及轮询后更新，不跟随每个流式片段即时变化。部分历史无法读取时显示导入不完整，并提供重试。插件没有远程分析、对话上传或模型工具。

## 配置与数据

默认数据库为 `$DSH_HOME/achievements/stats.sqlite`，使用系统时区。在 profile 的 `cordis.patch.yml` 中覆盖完整配置：

```yaml
- id: dsh-achievements
  config:
    database: !!js dshHomePath('achievements', 'stats.sqlite')
    timeZone: Asia/Shanghai
    pollMs: 3000
    pageSize: 512
    busyTimeoutMs: 5000
```

数据库必须使用绝对路径；轮询至少 1000 毫秒；每页 1–4096 条事件；SQLite 等待超时为 1–30000 毫秒。IANA 时区名称在加载时验证。共享会话历史的 profile 应使用同一数据库。

SQLite 保存计数、会话读取位置、活跃日期、工具和 Skill 标识，以及目标和工作流 ID。不保存提示词、回复、工具参数或工具输出。仪表盘接口经过 DSH 连接层认证。卸载时先停止轮询并等待读取关闭，再关闭数据库。

重建统计时，先停止所有使用此数据库的 Host，再删除统计文件并重启；现存会话历史会重新导入。开发期浏览器旧计数 `dsh-ach-s-v4` 和 `dsh-ach-u-v2` 在激活时清除。

## 开发与发布

```sh
npm ci
npm test
npm run build
npm run check
npm pack
```

界面源码为 `src/client.js`、`src/client.css` 和双语字典；`src/catalog.js` 管理成就条件和经验。提交源码时同步提交生成的 `client.js`。构建显式设置编译选项，不继承父目录的 tsconfig。CI 在 Windows、Linux 的 Node 22.19 和 24 上检查测试、可重复构建及打包。

`src/engine.js` 负责事件统计、读取位置和成就的事务持久化；`src/collector.js` 负责历史读取与取消。插件自身测试覆盖重放、失败、时区和卸载。插件不新增模型输入或会话事件，不修改 DSH 持久化格式。统计状态和读取位置在同一个 SQLite 事务内提交，无需另设运行时不变量插件。

将本目录作为独立仓库发布，并把生成的 tarball 附加到 Release。不要提交统计数据库、DSH home、node_modules 或本地测试输出。采用 [MIT 许可证](LICENSE)。
