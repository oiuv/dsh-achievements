/** Browser dashboard: locale-owned copy, shared Modal/Toast, and Host-owned statistics. */
import React from 'react';
import { Modal, Toast, Tooltip, IconCheckCircleOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { achievements, playerLevel, progressOf } from './catalog.js';
import { dictionaries } from './locales.js';
import { createDashboard } from './client-state.js';
import css from './client.css';
const h = React.createElement;
const NS = 'dsh-achievements';
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
  const metric = key => key.startsWith('tool.') ? key.slice(5) : t('metric.' + key);

  function Card({ item, data }) {
    const unlocked = data.unlocked[item.id];
    const hidden = item.tier === 'secret' && !unlocked;
    const progress = progressOf(item, data.stats);
    const normal = achievements.filter(a => !['secret','platinum'].includes(a.tier));
    const platinumCount = normal.filter(a => data.unlocked[a.id]).length;
    const fraction = item.tier === 'platinum' ? platinumCount / normal.length : progress.fraction;
    return h('article', { className: 'dsha-card', 'data-unlocked': !!unlocked, 'data-achievement-id': item.id },
      h('div', { className: 'dsha-card-top' }, t('tier.' + item.tier), h('span', null, t('xp', { xp: item.points }))),
      h('h3', null, hidden ? t('secret') : t('achievement.' + item.id + '.name')),
      h('p', { className: 'dsha-muted' }, hidden ? t('secretHint') : t('achievement.' + item.id + '.description')),
      !hidden && h('progress', { max: 1, value: unlocked ? 1 : fraction, 'aria-label': t('achievement.' + item.id + '.name') }),
      !hidden && !unlocked && h('ul', { className: 'dsha-requirements' },
        progress.requirements.map(r => h('li', { key: r.metric }, t('requirement', { metric: metric(r.metric), value: fmt(r.value), target: fmt(r.target) })))),
      unlocked && h('span', { className: 'dsha-muted' }, t('earnedAt', { date: new Date(unlocked.at).toLocaleDateString(locale.getLocale().active) })),
    );
  }

  function Hall({ data }) {
    const [tab, setTab] = React.useState('overview');
    const [category, setCategory] = React.useState('all');
    const [filter, setFilter] = React.useState('all');
    const level = playerLevel(data.unlocked);
    const count = Object.keys(data.unlocked).filter(id => achievements.some(a => a.id === id)).length;
    const publicNext = achievements.filter(item => item.tier !== 'secret' && item.tier !== 'platinum' && !data.unlocked[item.id])
      .sort((a,b) => progressOf(b,data.stats).fraction - progressOf(a,data.stats).fraction).slice(0,4);
    const cards = achievements.filter(item => (category === 'all' || item.category === category)
      && (filter === 'all' || !!data.unlocked[item.id] === (filter === 'unlocked')));
    const status = data.status.phase === 'importing' ? t('importing', { count: data.status.pending })
      : data.status.phase === 'partial' ? t('partial', { count: data.status.failed })
      : data.status.phase === 'error' ? t('offline') : t('ready');
    return h('div', { className: 'dsha' },
      h('div', { className: 'dsha-hero' },
        h('div', null, h('div', { className: 'dsha-kicker' }, t('level', { level: level.level })),
          h('div', { className: 'dsha-rank' }, t('rank.' + level.level)), h('div', { className: 'dsha-muted' }, t('intro'))),
        h('div', null, h('div', { className: 'dsha-score' }, t('xp', { xp: fmt(level.xp) })),
          h('div', { className: 'dsha-muted' }, level.next === null ? t('maxLevel') : t('nextLevel', { xp: level.next - level.xp })))),
      h('div', { className: 'dsha-status', role: 'status' }, status,
        ['partial','error'].includes(data.status.phase) && h('button', { className: 'dsha-btn', onClick: () => { void dashboard.refresh(true); } }, t('retry'))),
      h('div', { className: 'dsha-tabs' }, ['overview','achievements'].map(id =>
        h('button', { key: id, className: 'dsha-btn', 'aria-pressed': tab === id, onClick: () => setTab(id) }, t(id)))),
      h('p', { className: 'dsha-muted' }, t('progress', { count, total: achievements.length })),
      tab === 'overview' ? h(React.Fragment, null,
        h('div', { className: 'dsha-stats' }, ['sessions','messages','successfulCalls','tokens','steps','activeDays','goals','workflows'].map(key =>
          h('div', { key, className: 'dsha-stat' }, h('strong', null, fmt(data.stats[key])), h('span', { className: 'dsha-muted' }, t('metric.' + key))))),
        h('h2', { className: 'dsha-section' }, t('paths')),
        h('div', { className: 'dsha-grid' }, publicNext.map(item => h(Card, { key: item.id, item, data }))),
        h('h2', { className: 'dsha-section' }, t('toolUsage')),
        h('div', { className: 'dsha-list' }, Object.entries(data.stats.successfulTools).sort((a,b) => b[1]-a[1]).slice(0,10).map(([key,value]) =>
          h('div', { key, className: 'dsha-list-row' }, h('code', null, key), h('span', null, fmt(value))))),
        h('h2', { className: 'dsha-section' }, t('activity')),
        h('div', { className: 'dsha-hours' }, data.stats.hours.map((value,hour) =>
          h('div', { key: hour, className: 'dsha-hour', style: { height: Math.max(2,value/Math.max(1,...data.stats.hours)*100)+'%' },
            title: hour + ':00 · ' + fmt(value) }))),
        h('div', { className: 'dsha-hours-labels' }, [0,6,12,18,23].map(hour => h('span', { key: hour }, hour + ':00'))),
      ) : h(React.Fragment, null,
        h('div', { className: 'dsha-filters' },
          h('select', { value: category, 'aria-label': t('all'), onChange: e => setCategory(e.target.value) },
            ['all','journey','craft','research','orchestration','skills','mastery'].map(id => h('option', { key: id, value: id }, id === 'all' ? t('all') : t('category.'+id)))),
          h('select', { value: filter, 'aria-label': t('allStatus'), onChange: e => setFilter(e.target.value) },
            ['all','locked','unlocked'].map(id => h('option', { key: id, value: id }, t(id === 'all' ? 'allStatus' : id))))),
        h('div', { className: 'dsha-grid' }, cards.map(item => h(Card, { key: item.id, item, data })))),
      h('details', { className: 'dsha-footer' }, h('summary', null, t('rules')), h('p', null, t('rulesText')), h('p', null, t('coverage')), h('p', null, t('privacy'))),
      h('p', { className: 'dsha-muted' }, t('timezone', { zone: data.timeZone })),
    );
  }

  function Overlay() {
    const state = useState();
    return h(React.Fragment, null,
      h(Modal, { open: state.open, onClose: () => dashboard.setOpen(false), title: t('title'), closeLabel: t('close'),
        className: 'dsha-dialog', contentClassName: 'dsha-content' },
        state.error && h('div', { className: 'dsha-error', role: 'alert' }, t('offline'),
          h('button', { className: 'dsha-btn', onClick: () => { void dashboard.refresh(true); } }, t('retry'))),
        state.data ? h(Hall, { data: state.data }) : h('div', { className: 'dsha-loading' },
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
        h(IconCheckCircleOutlineRegular, { size: 18 }), h('span', null, t('button')), count > 0 && h('span', null, count)));
  }
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-achievements:overlay', order: 100 }, Overlay));
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'dsh-achievements:launcher', order: 5 }, Launcher));
}
