import { applyBlank, emptyQuestion, TRUE_FALSE } from "./questions";
import type { Lesson, LessonQuestion, QuestionType } from "./types";

/*
  Тестовый урок «Еңбек пен білім»: все 9 типов вопросов на мақалах из базы.
  Создаётся кнопкой в админке черновиком — чтобы проверить уроки, не набирая вопросы вручную.
*/

export const SAMPLE_LESSON_ID = "test-barlyq-turleri";

const proverb = (id: string) => ({ kind: "proverb" as const, id });

function q(type: QuestionType, id: string, fields: Partial<LessonQuestion>): LessonQuestion {
  return { ...emptyQuestion(type), id: `${SAMPLE_LESSON_ID}-${id}`, ...fields };
}

export function buildSampleLesson(order: number): Lesson {
  const blank = applyBlank(
    q("blank", "blank", {
      options: ["", "жалқайтады", "шаршатады", "байытады"],
      correct: [0],
      source: proverb("kitap-1353"),
    }),
    "Еңбек адамды |бүтіндейді|, жалқаулық адамды түтіп жейді.",
  );

  return {
    id: SAMPLE_LESSON_ID,
    title: "Еңбек пен білім (тест: барлық сұрақ түрлері)",
    description: "Еңбек пен білім туралы мақалдар. Сабақта сұрақтың 9 түрі де бар.",
    icon: "📝",
    order,
    published: false,
    passPercent: 60,
    proverbIds: ["19", "kitap-1353", "11", "kitap-0933"],
    updatedAt: new Date().toISOString(),
    tasks: [
      {
        id: `${SAMPLE_LESSON_ID}-t1`,
        title: "1-тапсырма: Мақалды аяқта",
        instruction: "Мақалдың жетпей тұрған бөлігін табыңыз немесе жазыңыз.",
        shuffle: false,
        questions: [
          q("ending", "ending", {
            prompt: "Мақалдың жалғасын табыңыз",
            text: "Еңбектің наны тәтті, Жалқаудың жаны …",
            options: ["тәтті", "ауыр", "ащы", "суық"],
            correct: [0],
            source: proverb("19"),
          }),
          blank,
          q("write", "write", {
            prompt: "Мақалдың жалғасын жазыңыз",
            text: "Білім — инемен құдық …",
            answer: "қазғандай",
            source: proverb("11"),
          }),
        ],
      },
      {
        id: `${SAMPLE_LESSON_ID}-t2`,
        title: "2-тапсырма: Мағынасын түсін",
        instruction: "Мақалдардың мағынасын анықтаңыз.",
        shuffle: false,
        questions: [
          q("meaning", "meaning", {
            text: "Тілмен тікенді де алады.",
            options: ["Жылы сөзбен қиын істі де шешуге болады.", "Тікенді қолмен емес, тілмен алу керек.", "Көп сөйлеген адам ұтылады."],
            correct: [0],
            source: proverb("kitap-0933"),
          }),
          q("match", "match", {
            points: 2,
            pairs: [
              { left: "Еңбектің наны тәтті, Жалқаудың жаны тәтті.", right: "Адал еңбекпен келген нан дәмді, жалқау тек тыныштығын ойлайды." },
              { left: "Еңбек адамды бүтіндейді, жалқаулық адамды түтіп жейді.", right: "Еңбек адамды жетілдіреді, жалқаулық құртады." },
              { left: "Білім-инемен құдық қазғандай.", right: "Білім алу — ұзақ әрі қиын жол." },
              { left: "Тілмен тікенді де алады.", right: "Жылы сөзбен қиын істі де шешуге болады." },
            ],
          }),
          q("truefalse", "truefalse", {
            text: "«Білім-инемен құдық қазғандай» мақалы білімді тез әрі оңай алуға болатынын айтады.",
            options: [...TRUE_FALSE],
            correct: [1],
            source: proverb("11"),
          }),
        ],
      },
      {
        id: `${SAMPLE_LESSON_ID}-t3`,
        title: "3-тапсырма: Білімді бекіт",
        instruction: "Мақал құрап, дұрыс жауаптарды таңдаңыз.",
        shuffle: false,
        questions: [
          q("order", "order", {
            answer: ["Еңбектің", "наны", "тәтті,", "Жалқаудың", "жаны", "тәтті."].join("|"),
            source: proverb("19"),
          }),
          q("single", "single", {
            text: "Қай мақал еңбек туралы?",
            options: ["Еңбек адамды бүтіндейді, жалқаулық адамды түтіп жейді.", "Тілмен тікенді де алады.", "Доссыз өмір – сөнген көмір."],
            correct: [0],
          }),
          q("multiple", "multiple", {
            points: 2,
            text: "Еңбек туралы мақалдардың бәрін таңдаңыз",
            options: [
              "Еңбектің наны тәтті, Жалқаудың жаны тәтті.",
              "Еңбекпенен тапқаның – шекер-балдан татқаның.",
              "Доссыз өмір – сөнген көмір.",
              "Тілмен тікенді де алады.",
            ],
            correct: [0, 1],
          }),
        ],
      },
    ],
  };
}
