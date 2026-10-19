export type TopicMeta = {
  title: string;
  description: string;
  icon: string;
};

/**
 * Оформление известных тем. Список тем строится из data/proverbs.json,
 * поэтому тема, которой здесь нет, всё равно появится, с названием из поля topic.
 */
const TOPICS: Record<string, TopicMeta> = {
  otan: { title: "Отан, ел жайлы", description: "Отан сүйгіштік туралы мақалдар", icon: "🇰🇿" },
  otbasy: { title: "Отбасы жайлы", description: "Отбасы құндылықтары туралы мақалдар", icon: "🏠" },
  birlik: { title: "Бірлік, ынтымақ", description: "Бірлік пен ынтымақ туралы мақалдар", icon: "🤝" },
  bilm: { title: "Білім, ғылым", description: "Оқу, білім туралы мақалдар", icon: "📚" },
  dostyk: { title: "Достық жайлы", description: "Достық пен сыйластық туралы мақалдар", icon: "🫂" },
  ena: { title: "Еңбек, кәсіп", description: "Еңбек пен кәсіп туралы мақалдар", icon: "⚒️" },
  salem: { title: "Сәлем жайлы", description: "Сәлемдесу мен әдеп туралы мақалдар", icon: "🙏" },
  sauap: { title: "Сауап, ізгілік", description: "Ізгі істер жайлы мақалдар", icon: "✨" },
  korshi: { title: "Көрші, қоғам", description: "Қоғам және көршілік туралы мақалдар", icon: "🏘️" },
  jaksylyk: { title: "Жақсылық, жамандық", description: "Ізгілік пен теріс қылықтар туралы", icon: "⚖️" },
  algys: { title: "Алғыс, қарғыс", description: "Алғыс пен қарғыс туралы мақалдар", icon: "🗣️" },
};

export function getTopicMeta(topic: string): TopicMeta {
  return TOPICS[topic] ?? { title: topic, description: "Мақалдар жинағы", icon: "📜" };
}
