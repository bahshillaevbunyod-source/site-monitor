// Правило «сбой». Чистая функция, без зависимостей от Node.
export const FAILS_TO_ALERT = 2; // столько плохих проверок ПОДРЯД, чтобы объявить сбой

// Берёт прошлое состояние сайта и новую проверку, отдаёт новое состояние и событие.
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
