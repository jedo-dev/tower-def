// Builds public/sound-audit.html: one page that lists every registered clip
// with a player, where the game uses it, and a per-clip verdict + note that is
// kept in localStorage and exported as a markdown report to paste back.
//
//   npm run audit:sounds        then open http://localhost:5199/sound-audit.html
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SOUND_PROFILE_LIBRARY, resolveCreepSound, resolveTowerSound } from '../src/entities/sound-profile';
import { buildableTowers } from '../src/entities/tower';
import { getAllUnitConfigs } from '../src/entities/unit';
import { SOUND_CLIPS } from '../src/shared/lib/sound-registry/audio.constants';
import {
  CREEP_SOUND_SLOTS,
  SOUND_IDS,
  TOWER_SOUND_SLOTS,
  type SoundId,
} from '../src/shared/types/sound-ids';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const OUTPUT = join(PUBLIC_DIR, 'sound-audit.html');

type AuditRow = {
  id: SoundId;
  group: string;
  path: string;
  volume: number;
  cooldownMs: number;
  category: string;
  durationSec: number | null;
  sizeKb: number;
  uses: string[];
  note: string;
};

function readDescriptions(): Map<string, string> {
  const doc = readFileSync(join(ROOT, 'docs', 'SOUND_ASSET_LIST.md'), 'utf8');
  const map = new Map<string, string>();
  for (const line of doc.split('\n')) {
    const match = /^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|/.exec(line);
    if (match) {
      map.set(match[1], match[2]);
    }
  }
  return map;
}

/** Duration of a PCM wav from its header; null for ogg/m4a ambience. */
function readWavDurationSec(path: string): number | null {
  if (!path.endsWith('.wav') || !existsSync(path)) {
    return null;
  }
  const bytes = readFileSync(path);
  const byteRate = bytes.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkId = bytes.toString('ascii', offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      return byteRate > 0 ? chunkSize / byteRate : null;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return null;
}

function groupOf(id: string): string {
  const [head, second] = id.split('.');
  if (head !== 'combat') {
    return head;
  }
  if (second === 'creep' || second === 'tower') {
    return id.split('.')[2].split('_')[0];
  }
  const raceSuffix = id.split('.').at(-1);
  return raceSuffix && ['undead', 'orc', 'human', 'elf'].includes(raceSuffix)
    ? raceSuffix
    : 'core';
}

function collectUses(): Map<SoundId, string[]> {
  const uses = new Map<SoundId, string[]>();
  const add = (id: SoundId, use: string) => {
    const list = uses.get(id) ?? [];
    if (!list.includes(use)) {
      list.push(use);
    }
    uses.set(id, list);
  };
  for (const unit of getAllUnitConfigs()) {
    for (const slot of CREEP_SOUND_SLOTS) {
      add(
        resolveCreepSound(SOUND_PROFILE_LIBRARY, unit.faction, unit.sounds, slot),
        `${unit.name} (${unit.faction.toLowerCase()} creature) · ${slot}`,
      );
    }
  }
  for (const tower of buildableTowers) {
    for (const slot of TOWER_SOUND_SLOTS) {
      add(
        resolveTowerSound(SOUND_PROFILE_LIBRARY, tower.faction, tower.towerType, tower.sounds, slot),
        `${tower.name} (${tower.faction.toLowerCase()} tower) · ${slot}`,
      );
    }
  }
  return uses;
}

const descriptions = readDescriptions();
const uses = collectUses();

const rows: AuditRow[] = SOUND_IDS.map((id) => {
  const clip = SOUND_CLIPS[id];
  const filePath = join(PUBLIC_DIR, clip.assetPath);
  return {
    id,
    group: groupOf(id),
    path: `/${clip.assetPath}`,
    volume: clip.volume,
    cooldownMs: clip.cooldownMs,
    category: clip.category,
    durationSec: readWavDurationSec(filePath),
    sizeKb: existsSync(filePath) ? Math.round(statSync(filePath).size / 1024) : 0,
    uses: uses.get(id) ?? [],
    note: descriptions.get(id) ?? '',
  };
});

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sound audit</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 16px; background: #0a0c11; color: #ece6d6; font: 14px/1.4 system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; position: sticky; top: 0; background: #0a0c11; padding: 8px 0; z-index: 2; border-bottom: 1px solid #262c38; }
  .bar input, .bar select, button { background: #12151d; color: #ece6d6; border: 1px solid #262c38; border-radius: 4px; padding: 6px 10px; font: inherit; }
  button { cursor: pointer; min-height: 32px; }
  button.primary { background: #2f6b2a; }
  .count { color: #9fb2d4; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #1a1f2c; vertical-align: top; }
  th { color: #9fb2d4; font-weight: 500; position: sticky; top: 58px; background: #0a0c11; }
  td.id { font-family: ui-monospace, monospace; font-size: 12px; white-space: nowrap; }
  td.uses { color: #bed0ee; font-size: 12px; max-width: 360px; }
  td.desc { color: #9fb2d4; font-size: 12px; max-width: 280px; }
  .meta { color: #6f7f9c; font-size: 11px; white-space: nowrap; }
  .verdict { display: flex; gap: 4px; flex-wrap: wrap; }
  .verdict button { padding: 4px 8px; font-size: 12px; }
  .verdict button[aria-pressed="true"] { outline: 2px solid #f0d188; }
  tr[data-verdict="bad"] td { background: rgba(255, 123, 107, 0.08); }
  tr[data-verdict="quiet"] td, tr[data-verdict="loud"] td { background: rgba(255, 177, 95, 0.08); }
  tr[data-verdict="ok"] td { opacity: 0.6; }
  tr.playing td { background: rgba(143, 209, 79, 0.12) !important; }
  textarea { width: 100%; min-width: 160px; min-height: 30px; background: #0c0f15; color: #ece6d6; border: 1px solid #262c38; border-radius: 4px; font: inherit; font-size: 12px; }
  pre { white-space: pre-wrap; background: #0c0f15; padding: 12px; border: 1px solid #262c38; }
</style>
</head>
<body>
<h1>Sound audit · ${rows.length} clips</h1>
<div class="bar">
  <input id="search" type="search" placeholder="Поиск по id, юниту, описанию">
  <select id="group"><option value="">Все группы</option></select>
  <select id="slot"><option value="">Все слоты</option></select>
  <select id="verdictFilter">
    <option value="">Все вердикты</option>
    <option value="none">Без вердикта</option>
    <option value="ok">OK</option>
    <option value="bad">Неуместно</option>
    <option value="quiet">Тихо</option>
    <option value="loud">Громко</option>
  </select>
  <button id="playAll">▶ Прослушать всё по фильтру</button>
  <button id="stop">■ Стоп</button>
  <button id="report" class="primary">Скопировать отчёт</button>
  <button id="clear">Сбросить вердикты</button>
  <span class="count" id="count"></span>
</div>
<table>
  <thead><tr><th></th><th>Id</th><th>Где звучит</th><th>Описание</th><th>Вердикт</th><th>Заметка</th></tr></thead>
  <tbody id="rows"></tbody>
</table>
<pre id="out" hidden></pre>
<script>
const ROWS = ${JSON.stringify(rows)};
const MASTER = 0.7;
const STORAGE_KEY = 'tower-def.sound-audit.v1';
const VERDICTS = [['ok','OK'],['bad','Неуместно'],['quiet','Тихо'],['loud','Громко']];
let state = {};
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { state = {}; }
const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };
const entry = (id) => (state[id] ||= { verdict: '', note: '' });

const groups = [...new Set(ROWS.map((r) => r.group))];
const slots = [...new Set(ROWS.flatMap((r) => r.uses.map((u) => u.split(' · ')[1])))];
const fill = (select, values) => values.forEach((v) => { const o = document.createElement('option'); o.value = v; o.textContent = v; select.append(o); });
fill(document.getElementById('group'), groups);
fill(document.getElementById('slot'), slots);

const audio = new Audio();
let playingRow = null;
let queue = [];
function play(row) {
  audio.pause();
  audio.src = row.path;
  audio.volume = Math.min(1, row.volume * MASTER);
  audio.currentTime = 0;
  document.querySelectorAll('tr.playing').forEach((tr) => tr.classList.remove('playing'));
  const tr = document.querySelector('tr[data-id="' + CSS.escape(row.id) + '"]');
  if (tr) { tr.classList.add('playing'); tr.scrollIntoView({ block: 'nearest' }); }
  playingRow = row;
  audio.play().catch(() => {});
}
audio.addEventListener('ended', () => {
  const next = queue.shift();
  if (next) { setTimeout(() => play(next), 250); }
  else document.querySelectorAll('tr.playing').forEach((tr) => tr.classList.remove('playing'));
});

function visibleRows() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const g = document.getElementById('group').value;
  const s = document.getElementById('slot').value;
  const v = document.getElementById('verdictFilter').value;
  return ROWS.filter((r) => {
    if (g && r.group !== g) return false;
    if (s && !r.uses.some((u) => u.endsWith(' · ' + s))) return false;
    const verdict = entry(r.id).verdict;
    if (v === 'none' ? verdict : v && verdict !== v) return false;
    if (!q) return true;
    return (r.id + ' ' + r.uses.join(' ') + ' ' + r.note).toLowerCase().includes(q);
  });
}

function fmtUses(uses, id) {
  if (!uses.length) return '<span class="meta">' + (id.startsWith('combat.') ? 'запасной клип, сейчас никем не используется' : id.startsWith('ambient.') ? 'фоновая музыка' : 'UI / система') + '</span>';
  const bySlot = {};
  for (const u of uses) { const [who, slot] = u.split(' · '); (bySlot[slot] ||= []).push(who); }
  return Object.entries(bySlot).map(([slot, who]) => '<b>' + slot + '</b>: ' + (who.length > 6 ? who.length + ' юнитов (' + who.slice(0, 3).join(', ') + '…)' : who.join(', '))).join('<br>');
}

function render() {
  const rows = visibleRows();
  document.getElementById('count').textContent = rows.length + ' из ' + ROWS.length;
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  for (const r of rows) {
    const e = entry(r.id);
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;
    tr.dataset.verdict = e.verdict;
    const dur = r.durationSec == null ? 'loop' : r.durationSec.toFixed(2) + 's';
    tr.innerHTML =
      '<td><button class="play" aria-label="Play ' + r.id + '">▶</button></td>' +
      '<td class="id">' + r.id + '<div class="meta">' + r.group + ' · ' + dur + ' · ' + r.sizeKb + ' KB · vol ' + r.volume + '</div></td>' +
      '<td class="uses">' + fmtUses(r.uses, r.id) + '</td>' +
      '<td class="desc">' + r.note + '</td>' +
      '<td><div class="verdict">' + VERDICTS.map(([k, label]) => '<button data-v="' + k + '" aria-pressed="' + (e.verdict === k) + '">' + label + '</button>').join('') + '</div></td>' +
      '<td><textarea placeholder="что не так / чем заменить">' + (e.note || '').replace(/</g, '&lt;') + '</textarea></td>';
    tr.querySelector('.play').addEventListener('click', () => { queue = []; play(r); });
    tr.querySelectorAll('.verdict button').forEach((b) => b.addEventListener('click', () => {
      e.verdict = e.verdict === b.dataset.v ? '' : b.dataset.v; save(); render();
    }));
    tr.querySelector('textarea').addEventListener('input', (ev) => { e.note = ev.target.value; save(); });
    tbody.append(tr);
  }
}

for (const id of ['search', 'group', 'slot', 'verdictFilter']) document.getElementById(id).addEventListener('input', render);
document.getElementById('playAll').addEventListener('click', () => { const rows = visibleRows(); queue = rows.slice(1); if (rows[0]) play(rows[0]); });
document.getElementById('stop').addEventListener('click', () => { queue = []; audio.pause(); document.querySelectorAll('tr.playing').forEach((tr) => tr.classList.remove('playing')); });
document.getElementById('clear').addEventListener('click', () => { if (confirm('Сбросить все вердикты и заметки?')) { state = {}; save(); render(); } });
document.getElementById('report').addEventListener('click', async () => {
  const labels = Object.fromEntries(VERDICTS);
  const lines = ['# Sound audit', ''];
  for (const r of ROWS) {
    const e = state[r.id];
    if (!e || (!e.verdict && !e.note) || e.verdict === 'ok') continue;
    lines.push('- \x60' + r.id + '\x60 — ' + (labels[e.verdict] || 'заметка') + (e.note ? ': ' + e.note : '') + (r.uses.length ? '  (' + r.uses.slice(0, 2).join('; ') + (r.uses.length > 2 ? '; …' : '') + ')' : ''));
  }
  const okCount = Object.values(state).filter((e) => e.verdict === 'ok').length;
  lines.push('', okCount + ' clips marked OK, ' + (ROWS.length - Object.values(state).filter((e) => e.verdict).length) + ' not reviewed.');
  const text = lines.join('\\n');
  const out = document.getElementById('out');
  out.hidden = false; out.textContent = text;
  try { await navigator.clipboard.writeText(text); } catch {}
});
render();
</script>
</body>
</html>
`;

writeFileSync(OUTPUT, html);
console.log(`wrote ${OUTPUT}: ${rows.length} clips, ${rows.filter((r) => r.uses.length === 0).length} without unit usage`);
