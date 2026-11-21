// Cloudflare Worker: то же самое, что monitor.mjs, но запускается по расписанию Cloudflare (Cron Trigger).
// Состояние хранится в Cloudflare KV (привязка STATE), секреты в секретах Worker.
import sites from '../sites.json';
import { checkSite } from '../lib/check-core.mjs';
import { decide } from '../lib/decide.mjs';
import { sendMessage } from '../telegram.mjs';
import { downMessage, upMessage } from '../messages.mjs';

async function run(env) {
  const before = (await env.STATE.get('state', 'json')) ?? {};
  const states = structuredClone(before);
  const creds = { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID };

  const results = await Promise.all(sites.map(checkSite));
  const events = [];
  const lines = [];

  for (const r of results) {
    const { state, event } = decide(states[r.url], r);
    states[r.url] = state;
    if (event) events.push({ event, ...r });
    lines.push(`${r.name}: ${r.problem ? `СБОЙ(${state.fails}) ${r.problem}` : `ок ${r.ms}мс`}`);
  }

  const sent = [];
  for (const e of events) {
    try {
      await sendMessage(e.event === 'down' ? downMessage(e) : upMessage(e), creds);
      sent.push(`${e.event}:${e.name}`);
    } catch (err) {
      // Не вышло отправить: откатываем состояние, чтобы следующий запуск попробовал снова
      states[e.url] = e.event === 'down' ? { ...states[e.url], down: false } : { ...states[e.url], down: true };
      lines.push(`НЕ ОТПРАВЛЕНО ${e.event} ${e.name}: ${err.message}`);
    }
  }

  // Состояние пишем только если оно изменилось (в бесплатном KV лимит записей в сутки)
  if (JSON.stringify(states) !== JSON.stringify(before)) await env.STATE.put('state', JSON.stringify(states));

  // Отметка последнего запуска: по ней видно, что расписание реально работает
  await env.STATE.put('lastRun', JSON.stringify({ at: new Date().toISOString(), sent, lines }));
  console.log(lines.join('\n'), sent.length ? `\nотправлено: ${sent.join(', ')}` : '');
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
};
