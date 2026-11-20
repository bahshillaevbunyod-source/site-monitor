// Разовый помощник: узнаёт твой chat id через Telegram и записывает в .env.local.
// Перед этим напиши своему боту /start. Токен и id в консоль НЕ печатаются.
// Запуск: node --use-system-ca --env-file=.env.local get-chat-id.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log('TELEGRAM_BOT_TOKEN: не задан');
  process.exit(1);
}
console.log('TELEGRAM_BOT_TOKEN: задан');

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await res.json();
if (!data.ok) {
  console.log('Telegram ответил ошибкой:', data.description ?? res.status, '(скорее всего токен скопирован неверно)');
  process.exit(1);
}

const chats = new Map();
for (const u of data.result) {
  const chat = (u.message ?? u.edited_message ?? u.my_chat_member)?.chat;
  if (chat?.type === 'private') chats.set(chat.id, chat);
}

if (chats.size === 0) {
  console.log('Сообщений боту пока нет. Открой бота в Telegram, нажми Start или напиши /start и запусти ещё раз.');
  process.exit(1);
}
if (chats.size > 1) {
  console.log(`Найдено ${chats.size} разных чатов, не знаю какой твой. Скажи Claude, разберёмся.`);
  process.exit(1);
}

const [id] = [...chats.keys()];
const file = new URL('./.env.local', import.meta.url);
let text = readFileSync(file, 'utf8');
if (/^TELEGRAM_CHAT_ID=.*$/m.test(text)) text = text.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${id}`);
else text += `\nTELEGRAM_CHAT_ID=${id}\n`;
writeFileSync(file, text);
console.log('TELEGRAM_CHAT_ID: найден и записан в .env.local');
