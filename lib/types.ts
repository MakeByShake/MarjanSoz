export type Proverb = {
  id: number;
  text: string;
  translation_ru: string;
  topic: string;
  explanation: string;
};

export type BalamaWord = {
  id: number;
  text: string;
  definition: string;
  icon: string;
};

/** Формат пользователя совместим со старым сайтом (localStorage). */
export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  level: number;
  points: number;
  completedProverbs: number[];
  completedTopics?: string[];
  achievements: string[];
};
