// Обходит все сайты из sites.json, применяет правило «сбой» и решает, о чём сообщить.
// Запуск: node --use-system-ca monitor.mjs
// Состояние между запусками хранится в state.json (сколько плохих проверок подряд, «лежит» ли сайт).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSite } from './check.mjs';

export const FAILS_TO_ALERT = 2; // столько плохих проверок ПОДРЯД, чтобы объявить сбой

// Чистая функция: берёт прошлое состояние сайта и новую проверку, отдаёт новое состояние и событие.
// event: 'down' (объявить «упал»), 'up' (объявить «снова работает») или null (молчим).
export function decide(prev, result) {
  const state = { fails: prev?.fails ?? 0, down: prev?.down ?? false };
  let event = null;

  if (result.problem) {
    state.fails += 1;
    if (state.fails >= FAILS_TO_ALERT && !state.down) {
      state.down = true;
      event = 'down';
    }
  } else {
    if (state.down) event = 'up';
    state.fails = 0;
    state.down = false;
  }
  return { state, event };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sites = JSON.parse(readFileSync(new URL('./sites.json', import.meta.url), 'utf8'));
  const stateFile = new URL('./state.json', import.meta.url);
  const states = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};

  // Все сайты проверяем одновременно, чтобы обход занимал секунды, а не минуты
  const results = await Promise.all(sites.map(checkSite));
  const events = [];

  for (const r of results) {
    const { state, event } = decide(states[r.url], r);
    states[r.url] = state;
    if (event) events.push({ event, ...r });
    const mark = r.problem ? `СБОЙ (${state.fails} подряд): ${r.problem}` : r.slow ? `ок, но медленно (${r.ms} мс)` : `ок (${r.ms} мс)`;
    console.log(`${r.name}: ${mark}`);
  }

  writeFileSync(stateFile, JSON.stringify(states, null, 2));
  console.log('\nСобытий для Telegram:', events.length ? '' : 'нет');
  for (const e of events) console.log(`  ${e.event === 'down' ? 'УПАЛ' : 'СНОВА РАБОТАЕТ'}: ${e.name} — ${e.problem ?? 'ок'}`);
}
