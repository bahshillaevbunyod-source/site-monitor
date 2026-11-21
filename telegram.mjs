// Отправка сообщения в Telegram. Токен и chat id: либо переданы в creds (Cloudflare Worker),
// либо берутся из переменных окружения (локально из .env.local, в GitHub Actions из секретов).
// В консоль они не печатаются.
export async function sendMessage(text, creds) {
  const token = creds?.token ?? (typeof process !== 'undefined' ? process.env.TELEGRAM_BOT_TOKEN : undefined);
  const chatId = creds?.chatId ?? (typeof process !== 'undefined' ? process.env.TELEGRAM_CHAT_ID : undefined);
  if (!token || !chatId) throw new Error('Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram отказал: ${data.description ?? res.status}`);
  return true;
}
