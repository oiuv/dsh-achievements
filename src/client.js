/** Browser dashboard: locale-owned copy, shared Modal/Toast, and Host-owned statistics. */
import React from 'react';
import {
  Modal, Toast, Tooltip, Button, SegmentedControl,
  IconCheckCircleOutlineRegular, IconCheckCircleFillRegular, IconCheckOutlineRegular,
  IconBrowseOutlineRegular, IconCodeOutlineRegular, IconSearchOutlineRegular,
  IconBranchOutlineRegular, IconSkillOutlineRegular, IconSparkleRegular,
  IconNewChatOutlineRegular, IconSendOutlineRegular,
  IconDataOutlineRegular, IconChecklistOutlineRegular, IconClockOutlineRegular,
  IconGoalOutlineRegular, IconQuestionOutlineRegular, IconChevronRightOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { achievements, coreAchievements, playerLevel, progressOf, achievementLevel } from './catalog.js';
import { dictionaries } from './locales.js';
import { createDashboard } from './client-state.js';
import css from './client.css';
const h = React.createElement;
const NS = 'dsh-achievements';
const categoryIcons = {
  journey: IconBrowseOutlineRegular, craft: IconCodeOutlineRegular, research: IconSearchOutlineRegular,
  orchestration: IconBranchOutlineRegular, skills: IconSkillOutlineRegular, automation: IconCodeOutlineRegular, mastery: IconSparkleRegular,
};
const statIcons = {
  sessions: IconNewChatOutlineRegular, subagent: IconBranchOutlineRegular, successfulCalls: IconCodeOutlineRegular,
  tokens: IconDataOutlineRegular, completedTurns: IconChecklistOutlineRegular, activeDays: IconClockOutlineRegular,
  buildLoops: IconCodeOutlineRegular, deliveries: IconSendOutlineRegular, goals: IconGoalOutlineRegular,
  workflows: IconBranchOutlineRegular, ptcPrograms: IconCodeOutlineRegular, collaborationTurns: IconBranchOutlineRegular,
};

export const name = 'dsh-achievements-client';
export const inject = ['slots', 'locale', 'connection'];

/** Register the Hall and its background notification owner for this plugin activation.
 * @param ctx - DSH browser context with locale, slots and connection services.
 */
export function apply(ctx) {
  const locale = ctx.locale;
  ctx.effect(() => locale.register(NS, dictionaries), 'achievement dictionaries');
  const t = locale.bind(NS);
  ctx.effect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'achievement styles');
  try {
    localStorage.removeItem('dsh-ach-s-v4');
    localStorage.removeItem('dsh-ach-u-v2');
  } catch (error) {
    ctx.logger.warn('dsh-achievements: unable to remove development counters', error);
  }
  const dashboard = createDashboard({
    async fetchSnapshot(signal, retry) {
      const response = await fetch(new URL('api/dsh-achievements', document.baseURI), {
        signal, method: retry ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) throw new Error('Achievement statistics request failed: ' + response.status);
      return response.json();
    },
    onError: error => ctx.logger.warn('dsh-achievements: refresh failed', error),
  });
  ctx.effect(() => { void dashboard.refresh(); return () => dashboard.dispose(); }, 'achievement polling');
  ctx.on('connection/reset', () => { void dashboard.refresh(); });
  const subscribeLocale = listener => locale.subscribe(listener);
  const localeSnapshot = () => locale.getLocale();
  function useState() {
    React.useSyncExternalStore(subscribeLocale, localeSnapshot, localeSnapshot);
    return React.useSyncExternalStore(dashboard.subscribe, dashboard.getSnapshot, dashboard.getSnapshot);
  }
  const fmt = value => new Intl.NumberFormat(locale.getLocale().active, { maximumFractionDigits: 1 }).format(value);
  // Reserve 100% for completed requirements.
  const percent = value => new Intl.NumberFormat(locale.getLocale().active, { style: 'percent', maximumFractionDigits: 0 })
    .format(value < 1 ? Math.min(value, 0.99) : value);
  const metric = key => key.startsWith('tool.') ? key.slice(5) : t('metric.' + key);

  function Card({ item, data }) {
    const unlocked = data.unlocked[item.id];
    const hidden = item.tier === 'secret' && !unlocked;
    const progress = progressOf(item, data.stats);
    const publicItems = coreAchievements;
    const advancement = achievementLevel(item, data.stats);
    const upgrading = !!unlocked && advancement !== null;
    const requirements = upgrading ? [advancement] : progress.requirements;
    const platinumCount = publicItems.filter(a => data.unlocked[a.id]).length;
    const fraction = upgrading ? advancement.fraction : unlocked ? 1 : item.tier === 'platinum' ? platinumCount / publicItems.length : progress.fraction;
    const title = hidden ? t('secret') : t('achievement.' + item.id + '.name');
    const Icon = hidden ? IconQuestionOutlineRegular : categoryIcons[item.category];
    return h('article', {
      className: 'dsha-card', 'data-tier': item.tier, 'data-unlocked': !!unlocked, 'data-achievement-id': item.id,
      'data-achievement-level': upgrading ? advancement.level : undefined,
    },
      h('div', { className: 'dsha-card-head' },
        h('div', { className: 'dsha-medal', 'aria-hidden': true }, h(Icon, { size: 25 }),
          unlocked && h('span', { className: 'dsha-medal-check' }, h(IconCheckCircleFillRegular, { size: 16 }))),
        h('div', { className: 'dsha-card-heading' },
          h('div', { className: 'dsha-card-top' },
            h('span', { className: 'dsha-tier' }, t('tier.' + item.tier),
              item.upgrade && h('span', { className: 'dsha-achievement-level' },
                upgrading ? t('achievementLevel', { level: advancement.level }) : t('upgradeable'))),
            h('span', { className: 'dsha-xp' }, t('xp', { xp: item.points }))),
          h('h3', null, title),
          h('span', { className: 'dsha-muted dsha-caption' }, t('category.' + item.category) + ' · ' + t('track.' + item.track)))),
      h('p', { className: 'dsha-card-description' }, hidden ? t('secretHint') : t('achievement.' + item.id + '.description')),
      hidden ? h('div', { className: 'dsha-card-bottom dsha-muted' }, h(IconQuestionOutlineRegular, { size: 14 }), t('secret'))
        : h('div', { className: 'dsha-card-progress' },
          h('div', { className: 'dsha-progress-label' },
            h('span', null, upgrading ? t('nextAchievementLevel', { level: advancement.level + 1 }) : t(unlocked ? 'completed' : 'locked')),
            h('span', null, percent(fraction))),
          h('progress', { max: 1, value: fraction, 'aria-label': title }),
          (!unlocked || upgrading) && (item.tier === 'platinum'
            ? h('p', { className: 'dsha-caption dsha-muted' }, t('publicProgress', { count: platinumCount, total: publicItems.length }))
            : h('ul', { className: 'dsha-requirements' }, requirements.map(r =>
              h('li', { key: r.metric, 'data-complete': r.value >= r.target },
                h('span', null, metric(r.metric)),
                h('span', { className: 'dsha-requirement-value' },
                  r.value >= r.target && h(IconCheckOutlineRegular, { size: 12 }),
                  fmt(r.value) + ' / ' + fmt(r.target)))))),
          unlocked && h('p', { className: 'dsha-caption dsha-muted' },
            t('earnedAt', { date: new Date(unlocked.at).toLocaleDateString(locale.getLocale().active) }))),
    );
  }

  function Hall({ data }) {
    const [tab, setTab] = React.useState('overview');
    const [category, setCategory] = React.useState('all');
    const [filter, setFilter] = React.useState('all');
    const [track, setTrack] = React.useState('all');
    const [tier, setTier] = React.useState('all');
    const level = playerLevel(data.unlocked);
    const count = achievements.filter(item => data.unlocked[item.id]).length;
    const levelFraction = level.next === null ? 1 : (level.xp - level.current) / (level.next - level.current);
    const publicNext = achievements.filter(item => item.tier !== 'secret' && item.tier !== 'platinum' && (!data.unlocked[item.id] || item.upgrade))
      .sort((a, b) => (achievementLevel(b, data.stats) ?? progressOf(b, data.stats)).fraction - (achievementLevel(a, data.stats) ?? progressOf(a, data.stats)).fraction).slice(0, 4);
    const cards = achievements.filter(item => (category === 'all' || item.category === category)
      && (track === 'all' || item.track === track) && (tier === 'all' || item.tier === tier)
      && (filter === 'all' || (filter === 'upgradeable' ? item.upgrade : !!data.unlocked[item.id] === (filter === 'unlocked'))));
    const toolEntries = Object.entries(data.stats.successfulTools).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxTool = Math.max(1, ...toolEntries.map(([, value]) => value));
    const maxHour = Math.max(1, ...data.stats.hours);
    const status = data.status.phase === 'importing' ? t('importing', { count: data.status.pending })
      : data.status.phase === 'partial' ? t('partial', { count: data.status.failed })
      : data.status.phase === 'error' ? t('offline') : t('ready');
    const tabId = 'dsha-view';
    return h('div', { className: 'dsha' },
      h('div', { className: 'dsha-hero' },
        h('div', { className: 'dsha-level-ring', style: { '--dsha-progress': levelFraction * 360 + 'deg' }, 'aria-hidden': true },
          h('div', { className: 'dsha-level-core' }, h(IconSparkleRegular, { size: 22 }), h('strong', null, level.level))),
        h('div', { className: 'dsha-identity' },
          h('div', { className: 'dsha-kicker' }, t('level', { level: level.level })),
          h('div', { className: 'dsha-rank' }, t('rank.' + level.level)),
          h('p', { className: 'dsha-muted' }, t('intro'))),
        h('div', { className: 'dsha-level-detail' },
          h('div', { className: 'dsha-score' }, t('xp', { xp: fmt(level.xp) })),
          h('progress', { max: 1, value: levelFraction, 'aria-label': t('levelProgress') }),
          h('div', { className: 'dsha-caption dsha-muted' }, level.next === null ? t('maxLevel') : t('nextLevel', { xp: fmt(level.next - level.xp) })))),
      h('div', { className: 'dsha-status', role: 'status', 'data-phase': data.status.phase },
        h('span', { className: 'dsha-status-dot', 'aria-hidden': true }), status,
        ['partial', 'error'].includes(data.status.phase) && h(Button, { size: 'sm', variant: 'outline', onClick: () => { void dashboard.refresh(true); } }, t('retry'))),
      h('div', { className: 'dsha-navigation' },
        h(SegmentedControl, { id: tabId, value: tab, onChange: setTab, label: t('title'),
          options: ['overview', 'achievements'].map(value => ({ value, label: t(value) })) }),
        h('div', { className: 'dsha-collection' },
          h(IconCheckCircleOutlineRegular, { size: 16 }), h('span', null, t('progress', { count, total: achievements.length })))),
      h('div', { id: tabId + '-' + tab + '-panel', role: 'tabpanel', 'aria-labelledby': tabId + '-' + tab },
        tab === 'overview' ? h(React.Fragment, null,
          h('div', { className: 'dsha-stats' }, Object.entries(statIcons).map(([key, Icon]) =>
            h('div', { key, className: 'dsha-stat' },
              h('div', { className: 'dsha-stat-label' }, h(Icon, { size: 17 }), h('span', null, t('metric.' + key))),
              h('strong', null, fmt(data.stats[key]))))),
          data.stats.missingUsage > 0 && h('p', { className: 'dsha-caption dsha-muted dsha-usage-note' }, t('missingUsage', { count: fmt(data.stats.missingUsage) })),
          h('div', { className: 'dsha-section-heading' }, h('h2', null, t('paths')),
            h(Button, { size: 'sm', onClick: () => setTab('achievements') }, t('viewAll'), h(IconChevronRightOutlineRegular, { size: 14 }))),
          publicNext.length ? h('div', { className: 'dsha-grid' }, publicNext.map(item => h(Card, { key: item.id, item, data })))
            : h('div', { className: 'dsha-empty' }, h(IconCheckCircleOutlineRegular, { size: 26 }), h('p', null, t('allPublicComplete'))),
          h('div', { className: 'dsha-charts' },
            h('section', { className: 'dsha-chart' },
              h('div', { className: 'dsha-chart-heading' }, h(IconCodeOutlineRegular, { size: 18 }), h('h2', null, t('toolUsage'))),
              toolEntries.length ? h('ol', { className: 'dsha-tool-list' }, toolEntries.map(([key, value], index) =>
                h('li', { key },
                  h('span', { className: 'dsha-tool-rank', 'aria-hidden': true }, String(index + 1).padStart(2, '0')),
                  h('div', { className: 'dsha-tool-body' },
                    h('div', { className: 'dsha-list-row' }, h('code', null, key), h('span', null, fmt(value))),
                    h('div', { className: 'dsha-track', 'aria-hidden': true },
                      h('span', { style: { '--dsha-fill': value / maxTool * 100 + '%' } }))))))
                : h('div', { className: 'dsha-empty' }, h(IconCodeOutlineRegular, { size: 26 }), h('p', null, t('noTools')))),
            h('section', { className: 'dsha-chart' },
              h('div', { className: 'dsha-chart-heading' }, h(IconClockOutlineRegular, { size: 18 }), h('h2', null, t('activity'))),
              h('p', { className: 'dsha-caption dsha-muted' }, t('timezone', { zone: data.timeZone })),
              data.stats.hours.some(value => value > 0) ? h(React.Fragment, null,
                h('div', { className: 'dsha-hours', role: 'list', 'aria-label': t('activity') }, data.stats.hours.map((value, hour) =>
                  h(Tooltip, { key: hour, portal: true, label: t('hourActivity', { hour, count: fmt(value) }) },
                    h('div', { className: 'dsha-hour-slot', role: 'listitem', tabIndex: 0,
                      'aria-label': t('hourActivity', { hour, count: fmt(value) }) },
                      h('span', { className: 'dsha-hour', style: { '--dsha-height': value / maxHour * 100 + '%' }, 'data-empty': value === 0 }))))),
                h('div', { className: 'dsha-hours-labels', 'aria-hidden': true }, [0, 6, 12, 18, 23].map(hour => h('span', { key: hour }, hour + ':00'))))
                : h('div', { className: 'dsha-empty' }, h(IconClockOutlineRegular, { size: 26 }), h('p', null, t('noData'))))),
        ) : h(React.Fragment, null,
          h('div', { className: 'dsha-filters' },
            h('label', null, h('span', null, t('pathLabel')),
              h('select', { value: category, 'aria-label': t('pathLabel'), onChange: e => setCategory(e.target.value) },
                ['all', 'journey', 'craft', 'research', 'orchestration', 'skills', 'automation', 'mastery'].map(id =>
                  h('option', { key: id, value: id }, id === 'all' ? t('all') : t('category.' + id))))),
            h('label', null, h('span', null, t('collectionLabel')),
              h('select', { value: track, 'aria-label': t('collectionLabel'), onChange: e => setTrack(e.target.value) },
                ['all', 'core', 'specialty', 'secret'].map(id => h('option', { key: id, value: id }, t(id === 'all' ? 'allCollections' : 'track.' + id))))),
            h('label', null, h('span', null, t('difficultyLabel')),
              h('select', { value: tier, 'aria-label': t('difficultyLabel'), onChange: e => setTier(e.target.value) },
                ['all', 'bronze', 'silver', 'gold', 'legendary', 'secret', 'platinum'].map(id =>
                  h('option', { key: id, value: id }, t(id === 'all' ? 'allDifficulties' : 'tier.' + id))))),
            h('label', null, h('span', null, t('statusLabel')),
              h('select', { value: filter, 'aria-label': t('statusLabel'), onChange: e => setFilter(e.target.value) },
                ['all', 'locked', 'unlocked', 'upgradeable'].map(id => h('option', { key: id, value: id }, t(id === 'all' ? 'allStatus' : id))))),
            h('span', { className: 'dsha-filter-count dsha-muted', role: 'status' }, t('resultCount', { count: cards.length }))),
          cards.length ? h('div', { className: 'dsha-grid' }, cards.map(item => h(Card, { key: item.id, item, data })))
            : h('div', { className: 'dsha-empty' }, h(IconSearchOutlineRegular, { size: 26 }), h('p', null, t('noMatches')),
              h(Button, { size: 'sm', variant: 'outline', onClick: () => { setCategory('all'); setFilter('all'); setTrack('all'); setTier('all'); } }, t('resetFilters'))))),
      h('p', { className: 'dsha-caption dsha-muted dsha-collection-hint' }, t('collectionHint', {
        public: achievements.filter(item => item.tier !== 'secret').length,
        secret: achievements.filter(item => item.tier === 'secret').length,
        upgradeable: achievements.filter(item => item.upgrade).length,
      })),
      h('details', { className: 'dsha-footer' }, h('summary', null, t('rules')), h('p', null, t('rulesText')), h('p', null, t('levelRules')), h('p', null, t('coverage')), h('p', null, t('privacy'))),
    );
  }

  function Overlay() {
    const state = useState();
    return h(React.Fragment, null,
      h(Modal, { open: state.open, onClose: () => dashboard.setOpen(false), title: t('title'), closeLabel: t('close'),
        className: 'dsha-dialog', contentClassName: 'dsha-content' },
        state.error && h('div', { className: 'dsha-error', role: 'alert' }, t(state.versionMismatch ? 'versionMismatch' : state.data ? 'offline' : 'unavailable'),
          h(Button, { size: 'sm', variant: 'outline', onClick: () => { void dashboard.refresh(true); } }, t('retry'))),
        state.data ? h(Hall, { data: state.data }) : !state.error && h('div', { className: 'dsha-loading' },
          h('span', { className: 'dsha-spinner', role: 'status', 'aria-label': t('loading') }))),
      state.notice > 0 && h(Toast, { key: state.noticeId, tone: 'success',
        text: t('unlockNotice', { count: state.notice }), onDone: dashboard.dismissNotice }),
    );
  }
  function Launcher() {
    const state = useState();
    const count = state.data ? Object.keys(state.data.unlocked).length : 0;
    return h(Tooltip, { label: t('title'), portal: true },
      h('button', { type: 'button', className: 'dsha-launcher', 'aria-label': t('title'), onClick: () => dashboard.setOpen(true) },
        h(IconSparkleRegular, { size: 18 }), h('span', null, t('button')), count > 0 && h('span', { className: 'dsha-launcher-count' }, count)));
  }
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-achievements:overlay', order: 100 }, Overlay));
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'dsh-achievements:launcher', order: 5 }, Launcher));
}
