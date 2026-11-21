// Проверка одного сайта: только читает (GET на главную), ничего не отправляет.
// Здесь нет зависимостей от Node, поэтому код работает и в Node, и в Cloudflare Worker.

export const TIMEOUT_MS = 10000; // дольше 10 секунд ждать не будем
export const SLOW_MS = 3000;     // медленнее 3 секунд считаем «медленно»

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
