import proverbs from "@/data/proverbs.json";

// Не читает данных запроса, поэтому Next пререндерит ответ при сборке как статический файл.
export function GET() {
  return Response.json(proverbs);
}
