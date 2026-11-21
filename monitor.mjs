// Обходит все сайты из sites.json, применяет правило «сбой» и решает, о чём сообщить.
// Версия для запуска в Node (локально и в GitHub Actions). Основной боевой запуск теперь в Cloudflare Worker (worker/index.mjs).
// Запуск: node --use-system-ca --env-file=.env.local monitor.mjs
// Состояние между запусками хранится в state.json (сколько плохих проверок подряд, «лежит» ли сайт).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSite } from './lib/check-core.mjs';
import { decide, FAILS_TO_ALERT } from './lib/decide.mjs';
import { sendMessage } from './telegram.mjs';
import { downMessage, upMessage } from './messages.mjs';

export { decide, FAILS_TO_ALERT };

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

  console.log('\nСобытий для Telegram:', events.length ? '' : 'нет');
  for (const e of events) {
    console.log(`  ${e.event === 'down' ? 'УПАЛ' : 'СНОВА РАБОТАЕТ'}: ${e.name}`);
    try {
      await sendMessage(e.event === 'down' ? downMessage(e) : upMessage(e));
      console.log('    -> отправлено в Telegram');
    } catch (err) {
      // Не вышло отправить: откатываем состояние, чтобы следующий запуск попробовал снова, а тревога не потерялась
      states[e.url] = e.event === 'down' ? { ...states[e.url], down: false } : { ...states[e.url], down: true };
      console.log(`    -> НЕ отправлено (${err.message}), повторим при следующем запуске`);
    }
  }

  writeFileSync(stateFile, JSON.stringify(states, null, 2));
}
