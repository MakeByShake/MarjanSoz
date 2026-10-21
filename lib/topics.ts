import topics from "@/data/topics.json";
import type { Topic } from "./types";

/**
 * Тақырыптар из книги «Мақал – сөздің маржаны» (С. Қалиев, 2022): 76 разделов.
 * Используются кнопкой «Бастапқы деректер» в админке (Импорт).
 */
export const SEED_TOPICS: Topic[] = topics;
