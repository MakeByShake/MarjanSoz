export type Proverb = {
  id: string;
  text: string;
  translation_ru: string;
  topic: string;
  explanation: string;
};

/** Тақырып = сабақ. Создаётся и редактируется в админке. */
export type Topic = {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
};

export type BalamaWord = {
  id: number;
  text: string;
  definition: string;
  icon: string;
};

/** Публичный профиль в Firestore: users/{uid}. */
export type UserProfile = {
  username: string;
  points: number;
  completedProverbs: string[];
  completedTopics: string[];
  createdAt: string;
};

export type User = UserProfile & {
  id: string;
  email: string;
  isAdmin: boolean;
};
