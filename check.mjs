// Проверка одного сайта из командной строки.
// Запуск: node --use-system-ca check.mjs [номер сайта в sites.json, по умолчанию 1]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSite } from './lib/check-core.mjs';

export { checkSite };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sites = JSON.parse(readFileSync(new URL('./sites.json', import.meta.url), 'utf8'));
  const n = Number(process.argv[2] ?? 1);
  const r = await checkSite(sites[n - 1]);
  console.log(r);
  console.log(r.problem ? `СБОЙ: ${r.problem}` : r.slow ? 'РАБОТАЕТ, но медленно' : 'РАБОТАЕТ');
}
