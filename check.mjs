// Проверка одного сайта: только читает (GET на главную), ничего не отправляет.
// Запуск: node --use-system-ca check.mjs [номер сайта в sites.json, по умолчанию 1]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 10000; // дольше 10 секунд ждать не будем
const SLOW_MS = 3000;     // медленнее 3 секунд считаем «медленно»

export async function checkSite(site) {
  const started = Date.now();
  const result = { name: site.name, url: site.url, status: null, ms: null, hasKeyText: null, title: null, problem: null };
  try {
    const res = await fetch(site.url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'site-monitor/1.0 (uptime check)' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text();
    result.ms = Date.now() - started;
    result.status = res.status;
    result.title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() ?? null;
    if (site.keyText) result.hasKeyText = html.includes(site.keyText);

    if (res.status < 200 || res.status >= 300) result.problem = `код ответа ${res.status}`;
    else if (site.keyText && !result.hasKeyText) result.problem = 'нет ключевого текста';
  } catch (e) {
    result.ms = Date.now() - started;
    result.problem = e.name === 'TimeoutError' ? `нет ответа за ${TIMEOUT_MS / 1000} с` : `ошибка соединения: ${e.cause?.code ?? e.message}`;
  }
  result.slow = !result.problem && result.ms > SLOW_MS;
  return result;
}

// Если файл запущен напрямую, а не подключён из другого файла
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sites = JSON.parse(readFileSync(new URL('./sites.json', import.meta.url), 'utf8'));
  const n = Number(process.argv[2] ?? 1);
  const r = await checkSite(sites[n - 1]);
  console.log(r);
  console.log(r.problem ? `СБОЙ: ${r.problem}` : r.slow ? 'РАБОТАЕТ, но медленно' : 'РАБОТАЕТ');
}
