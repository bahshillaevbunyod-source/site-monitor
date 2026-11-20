// ТЕКСТЫ СООБЩЕНИЙ. Этот файл можно править самому, логику трогать не нужно.
// Доступно: site.name (название), site.url (адрес), site.problem (причина), site.status (код), site.ms (время, мс)

export function downMessage(site) {
  return `🔴 Сайт не работает: ${site.name}\n${site.url}\nПричина: ${site.problem}`;
}

export function upMessage(site) {
  return `🟢 Снова работает: ${site.name}\n${site.url}`;
}
