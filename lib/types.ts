export type Proverb = {
  id: string;
  text: string;
  translation_ru: string;
  topic: string;
  explanation: string;
};

/** Тақырып = категория мақалов в библиотеке (фильтр). Уроки — отдельно, см. Lesson. */
export type Topic = {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
};

export type BalamaWord = {
  id: string;
  text: string;
  definition: string;
  icon: string;
};

/*
  Урок → тапсырмалар → сұрақтар. Весь урок хранится одним документом lessons/{id}.
  Вопрос — плоский объект: у каждого типа свои поля (см. lib/questions.ts), остальные пустые.
  Так проще редактировать и добавлять новые типы.
*/
export type QuestionType =
  | "ending"
  | "meaning"
  | "blank"
  | "write"
  | "match"
  | "order"
  | "single"
  | "multiple"
  | "truefalse";

export type SourceRef = { kind: "proverb" | "balama"; id: string };

export type LessonQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  /** Задание: «Мақалдың жалғасын табыңыз» */
  prompt: string;
  /** Мақал или его часть, которую видит ученик */
  text: string;
  /** Варианты ответа (типы с выбором) и номера правильных */
  options: string[];
  correct: number[];
  /** Правильный ответ для «write» (варианты через «|») и правильный мақал для «order» */
  answer: string;
  /** Полный мақал и номера скрытых слов (ending/blank/write): из них собираются text и правильный ответ */
  full: string;
  hidden: number[];
  /** Пары для «match» */
  pairs: { left: string; right: string }[];
  /** Откуда заполнено (только для справки в админке) */
  source: SourceRef | null;
};

export type LessonTask = {
  id: string;
  title: string;
  instruction: string;
  shuffle: boolean;
  questions: LessonQuestion[];
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  published: boolean;
  /** Сколько процентов баллов задания нужно, чтобы оно считалось пройденным */
  passPercent: number;
  /** Мақалы, которые ученик читает перед заданиями */
  proverbIds: string[];
  tasks: LessonTask[];
  updatedAt: string;
};

/** results/{lessonId}_{uid}: лучший результат ученика по уроку. */
export type LessonResult = {
  uid: string;
  username: string;
  lessonId: string;
  /** Лучший балл по каждому заданию */
  tasks: Record<string, number>;
  score: number;
  maxScore: number;
  /** Все задания пройдены */
  completed: boolean;
  /** Балл, выставленный админом вручную (вместо score), или null */
  manual: number | null;
  updatedAt: string;
};

/** Публичный профиль в Firestore: users/{uid}. */
export type UserProfile = {
  username: string;
  /** Сумма баллов за уроки + bonus */
  points: number;
  /** Баллы, добавленные админом вручную (может быть отрицательным) */
  bonus: number;
  createdAt: string;
};

export type User = UserProfile & {
  id: string;
  email: string;
  isAdmin: boolean;
};
