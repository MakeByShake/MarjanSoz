# MarjanSóz

Платформа для изучения казахских мақал-мәтелдер. Next.js (App Router) + TypeScript + Tailwind CSS, только фронтенд. Данные пользователя хранятся в `localStorage` (ключи совместимы со старым сайтом).

## Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # проверка production-сборки
```

## Структура

```
app/
  layout.tsx              шрифты Noto, тема без вспышки
  globals.css             дизайн-токены (палитра старого сайта), орнаменты
  login/                  вход и регистрация
  (app)/                  страницы только для вошедших (AuthGuard)
    dashboard/ lessons/ lessons/[topic]/ proverbs/ balama/ rating/ profile/
  data/proverbs.json/     отдаёт data/proverbs.json как статический файл
  api/                    пусто: сюда добавятся /api/explain, /api/search, /api/teacher
components/               Header, Footer, Ornament, ThemeToggle, ConfirmDialog, ui
lib/                      types, proverbs (загрузка/поиск), user (localStorage), quiz, topics
data/proverbs.json        мақалы: { id, text, translation_ru, topic, explanation }
data/balama.json          балама сөздер
```

## Как заменить мақалы

Замените `data/proverbs.json` своим файлом той же структуры и пересоберите проект. Количество нигде не прописано: прогресс, темы, уроки и тесты строятся из данных. Чтобы у новой темы были красивое название и иконка, добавьте её ключ в `lib/topics.ts`; без этого тема всё равно появится, с названием из поля `topic`.

## Деплой на Vercel

1. Создайте пустой репозиторий на GitHub, затем в папке проекта выполните:
   ```bash
   git add -A && git commit -m "MarjanSóz на Next.js"
   git remote add origin https://github.com/<логин>/marjansoz.git
   git push -u origin main
   ```
2. На vercel.com войдите через GitHub, нажмите **Add New → Project** и выберите репозиторий.
3. Framework Preset определится сам (Next.js). Ничего не меняйте и нажмите **Deploy**.
4. Через 1–2 минуты сайт будет доступен по адресу `https://<имя>.vercel.app`. Каждый `git push` будет обновлять его автоматически.
5. Когда подключите ИИ, добавьте `ANTHROPIC_API_KEY` в **Settings → Environment Variables** и передеплойте.
