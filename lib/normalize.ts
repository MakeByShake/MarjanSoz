/** Для поиска и сравнения ответов: нижний регистр, без кавычек, тире и знаков препинания. Работает и на сервере. */
export function normalize(value: string): string {
  return value
    .toLocaleLowerCase("kk")
    .replace(/[«»"“”.,!?;:()—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
