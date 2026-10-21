/**
 * Мақалы из data/proverbs.json (~700 КБ). Грузятся отдельным файлом только когда нужны
 * (синхронизация или вкладка «Импорт»), чтобы не тормозить открытие админки.
 */
export async function loadSeedRows() {
  const { default: seed } = await import("@/data/proverbs.json");
  return seed.map((p) => ({ ...p, id: String(p.id) }));
}
