/** Generate spoiler-free achievement tables from the catalog and interface dictionaries. */
import { readFile, writeFile } from 'node:fs/promises';
import { achievements, playerLevel, tierPoints } from '../src/catalog.js';
import { dictionaries } from '../src/locales.js';

const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/sync-docs.mjs [--check]');
const publicAchievements = achievements.filter(item => item.track !== 'secret');
const tiers = Object.keys(tierPoints);
const categories = Object.keys(dictionaries.en).filter(key => key.startsWith('category.')).map(key => key.slice('category.'.length));
for (const item of publicAchievements) {
  if (!categories.includes(item.category)) throw new Error(`Unknown public achievement category: ${item.category}`);
}
const cell = value => String(value).replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
const row = values => `| ${values.map(cell).join(' | ')} |`;
const format = value => value.toLocaleString('en-US');
const levelFor = items => playerLevel(Object.fromEntries(items.map(item => [item.id, true])));
const publicLevel = levelFor(publicAchievements), fullLevel = levelFor(achievements);
let stale = false;

for (const [lang, filename] of [['en', 'levels-and-achievements.md'], ['zh', 'levels-and-achievements.zh-CN.md']]) {
  const d = dictionaries[lang], zh = lang === 'zh';
  const xp = [row(zh ? ['难度或奖励', '成就数量', '每项首次解锁 XP'] : ['Difficulty or award', 'Achievements', 'XP per first unlock']),
    '| --- | ---: | ---: |',
    ...tiers.map(tier => row([d['tier.' + tier], achievements.filter(item => item.tier === tier).length, tierPoints[tier]])), '',
    zh ? `全部公开成就首次解锁合计 **${format(publicLevel.xp)} XP**，可达到玩家等级 ${publicLevel.level}；包含隐藏成就的全部首次解锁合计 **${format(fullLevel.xp)} XP**。探索隐藏内容不是达到最高玩家等级的前提。`
      : `All public first unlocks total **${format(publicLevel.xp)} XP**, enough for player level ${publicLevel.level}; all first unlocks including hidden achievements total **${format(fullLevel.xp)} XP**. Discovering hidden content is not required to reach the highest player level.`];
  const anchor = category => `path-${category}`;
  const catalog = categories.map(category => `- [${d['category.' + category]}](#${anchor(category)})`);
  for (const category of categories) {
    const items = publicAchievements.filter(item => item.category === category).sort((a, b) => tiers.indexOf(a.tier) - tiers.indexOf(b.tier));
    catalog.push('', `<a id="${anchor(category)}"></a>`, '', `### ${d['category.' + category]}`, '',
      zh ? `${items.length} 项公开成就，${items.filter(item => item.upgrade).length} 项可升级。` : `${items.length} public achievements; ${items.filter(item => item.upgrade).length} upgradeable.`, '',
      row(zh ? ['成就', '分册', '难度', '首次解锁条件', '升级'] : ['Achievement', 'Collection', 'Difficulty', 'First-unlock requirements', 'Upgrades']),
      '| --- | --- | --- | --- | --- |',
      ...items.map(item => row([item.name[lang], item.tier === 'platinum' ? d['tier.platinum'] : d['track.' + item.track],
        d['tier.' + item.tier], item.description[lang], item.upgrade ? d.upgradeable : '—'])));
  }
  const url = new URL('../docs/' + filename, import.meta.url);
  const current = await readFile(url, 'utf8');
  let next = current;
  for (const [name, lines] of [['xp', xp], ['catalog', catalog]]) {
    const start = `<!-- generated:${name}:start -->`, end = `<!-- generated:${name}:end -->`;
    const from = next.indexOf(start), to = next.indexOf(end);
    if (from < 0 || to < from || next.indexOf(start, from + 1) !== -1 || next.indexOf(end, to + 1) !== -1) {
      throw new Error(`Missing or duplicate ${name} markers in ${filename}`);
    }
    next = next.slice(0, from) + start + '\n\n' + lines.join('\n') + '\n\n' + next.slice(to);
  }
  if (next === current) continue;
  if (check) {
    console.error(`${filename} is stale. Run npm run docs:sync.`);
    stale = true;
  } else {
    await writeFile(url, next, 'utf8');
    console.log(`Updated ${filename}`);
  }
}
if (stale) process.exitCode = 1;
else if (check) console.log('Public achievement documentation matches the catalog.');
