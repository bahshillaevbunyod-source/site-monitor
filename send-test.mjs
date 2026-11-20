// Проверка связи: шлёт тебе в Telegram по одному примеру каждого сообщения.
// Запуск: node --use-system-ca --env-file=.env.local send-test.mjs
import { sendMessage } from './telegram.mjs';
import { downMessage, upMessage } from './messages.mjs';

const fake = { name: 'ТЕСТ (не настоящий сбой)', url: 'https://example.com', problem: 'код ответа 500', status: 500, ms: 1200 };
await sendMessage(downMessage(fake));
console.log('Отправлено: сообщение «упал»');
await sendMessage(upMessage(fake));
console.log('Отправлено: сообщение «снова работает»');
