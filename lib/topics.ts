import type { Topic } from "./types";

/** Стартовые темы для первой загрузки данных из админки (кнопка «Бастапқы деректер»). */
export const SEED_TOPICS: Topic[] = [
  { id: "otan", title: "Отан, ел жайлы", description: "Отан сүйгіштік туралы мақалдар", icon: "🇰🇿", order: 1 },
  { id: "otbasy", title: "Отбасы жайлы", description: "Отбасы құндылықтары туралы мақалдар", icon: "🏠", order: 2 },
  { id: "birlik", title: "Бірлік, ынтымақ", description: "Бірлік пен ынтымақ туралы мақалдар", icon: "🤝", order: 3 },
  { id: "bilm", title: "Білім, ғылым", description: "Оқу, білім туралы мақалдар", icon: "📚", order: 4 },
  { id: "dostyk", title: "Достық жайлы", description: "Достық пен сыйластық туралы мақалдар", icon: "🫂", order: 5 },
  { id: "ena", title: "Еңбек, кәсіп", description: "Еңбек пен кәсіп туралы мақалдар", icon: "⚒️", order: 6 },
  { id: "salem", title: "Сәлем жайлы", description: "Сәлемдесу мен әдеп туралы мақалдар", icon: "🙏", order: 7 },
];
