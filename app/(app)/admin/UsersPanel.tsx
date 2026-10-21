"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Loading } from "@/components/ui";
import { db } from "@/lib/firebase";
import { deleteResult, effective, setBonus, setManualScore, useLessons } from "@/lib/lessons";
import { normalize } from "@/lib/proverbs";
import type { LessonResult } from "@/lib/types";
import { useCurrentUser } from "@/lib/user";
import { createUser, deleteUserEverywhere, listUsers, renameUser, sendReset, setAdmin, type UserRow } from "@/lib/usersAdmin";
import { dangerBtn, Panel, ShownError, smallBtn, StatusLine, TextField, Toggle, useAction } from "./shared";

const date = (iso: string) => (iso ? new Date(iso).toLocaleString("kk-KZ", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function UsersPanel() {
  const me = useCurrentUser();
  const { busy, status, run } = useAction();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query_, setQuery] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const reload = useCallback(() => {
    listUsers()
      .then((u) => {
        setUsers(u);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(reload, [reload]);

  const filtered = useMemo(() => {
    const q = normalize(query_);
    return (users ?? []).filter((u) => (!onlyAdmins || u.isAdmin) && (!q || normalize(`${u.username} ${u.email}`).includes(q)));
  }, [users, query_, onlyAdmins]);

  if (loadError) return <p className="py-16 text-center text-muted">Пайдаланушыларды жүктеу мүмкін болмады. Firestore ережелерін жаңартыңыз.</p>;
  if (!users) return <Loading />;
  const open = users.find((u) => u.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <Panel
        title="Жаңа пайдаланушы"
        action={
          !adding && (
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              ＋ Пайдаланушы қосу
            </button>
          )
        }
      >
        {adding ? (
          <AddUserForm
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              const ok = await run(async () => {
                const res = await createUser(input);
                if (!res.ok) throw new ShownError(res.error);
              }, `«${input.username}» қосылды. Ол осы email мен құпия сөз арқылы кіре алады.`);
              if (ok) {
                setAdding(false);
                reload();
              }
            }}
          />
        ) : (
          <p className="text-sm text-muted">Оқушыға аккаунт ашып, email мен құпия сөзді өзіңіз бере аласыз.</p>
        )}
        <StatusLine status={status} />
      </Panel>

      <Panel title={`Барлық пайдаланушылар (${filtered.length})`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query_}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Аты немесе email бойынша іздеу..."
            aria-label="Пайдаланушы іздеу"
            className="field sm:flex-1"
          />
          <Toggle checked={onlyAdmins} onChange={setOnlyAdmins} label="Тек әкімшілер" />
        </div>
        <p className="mb-2 text-xs text-muted">Толық деректерді көру және өзгерту үшін пайдаланушыны басыңыз.</p>
        <ul className="divide-y divide-line">
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setOpenId(u.id)}
                className="flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left transition hover:bg-primary/5 sm:flex-row sm:items-center dark:hover:bg-gold/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{u.username}</span>
                  {u.id === me?.id && <span className="ml-2 text-sm text-muted">(сіз)</span>}
                  {u.isAdmin && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium">⚙️ әкімші</span>}
                  <span className="block truncate text-sm text-muted">{u.email || "email белгісіз"}</span>
                </span>
                <span className="text-sm text-muted">
                  {u.points} ұпай{u.bonus ? ` (бонус ${u.bonus})` : ""} · {u.createdAt ? new Date(u.createdAt).toLocaleDateString("kk-KZ") : "—"}
                </span>
                <span aria-hidden="true" className="hidden text-muted sm:block">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="py-8 text-center text-muted">Ешкім табылмады.</p>}
      </Panel>

      {open && (
        <UserModal
          key={open.id}
          user={open}
          isMe={open.id === me?.id}
          onClose={() => setOpenId(null)}
          onChanged={reload}
          onDeleted={() => {
            setOpenId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function UserModal({
  user,
  isMe,
  onClose,
  onChanged,
  onDeleted,
}: {
  user: UserRow;
  isMe: boolean;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { busy, status, run, setStatus } = useAction();
  const lessons = useLessons(true);
  const [results, setResults] = useState<(LessonResult & { id: string })[] | null>(null);
  const [username, setUsername] = useState(user.username);
  const [bonus, setBonusValue] = useState(String(user.bonus));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const loadResults = useCallback(() => {
    getDocs(query(collection(db(), "results"), where("uid", "==", user.id)))
      .then((s) => setResults(s.docs.map((d) => ({ id: d.id, ...(d.data() as LessonResult) }))))
      .catch(() => setResults([]));
  }, [user.id]);
  useEffect(loadResults, [loadResults]);

  const title = (id: string) => lessons.data?.find((l) => l.id === id)?.title ?? "Жойылған сабақ";

  async function saveMain(e: FormEvent) {
    e.preventDefault();
    const nameChanged = username.trim() !== user.username;
    const bonusNum = Math.round(Number(bonus));
    const bonusChanged = bonus.trim() !== "" && Number.isFinite(bonusNum) && bonusNum !== user.bonus;
    if (!nameChanged && !bonusChanged) return setStatus({ kind: "ok", text: "Өзгеріс жоқ" });
    const ok = await run(async () => {
      if (nameChanged) await renameUser(user.id, user.username, username);
      if (bonusChanged) await setBonus(user.id, bonusNum);
    }, "Сақталды");
    if (ok) onChanged();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[90vh] w-[min(94vw,42rem)] overflow-y-auto rounded-2xl border border-line bg-card p-0 text-text shadow-xl backdrop:bg-black/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card px-5 py-4">
        <h2 className="font-serif text-xl font-bold text-heading">
          {user.username} {user.isAdmin && <span className="text-sm font-normal">⚙️</span>}
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Жабу" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-track">
          ✕
        </button>
      </div>

      <div className="space-y-6 p-5">
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Email</dt>
          <dd className="break-all">{user.email || "белгісіз (ол әлі жаңа нұсқада кірмеген)"}</dd>
          <dt className="text-muted">Тіркелген</dt>
          <dd>{date(user.createdAt)}</dd>
          <dt className="text-muted">Соңғы кіруі</dt>
          <dd>{date(user.lastLogin)}</dd>
          <dt className="text-muted">Жалпы ұпай</dt>
          <dd className="font-semibold">{user.points}</dd>
          <dt className="text-muted">ID</dt>
          <dd className="break-all text-xs text-muted">{user.id}</dd>
        </dl>

        <form onSubmit={saveMain} className="space-y-3 rounded-xl border border-line bg-bg p-4">
          <TextField label="Пайдаланушы аты" value={username} onChange={setUsername} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Бонус ұпай</span>
            <input type="number" value={bonus} onChange={(e) => setBonusValue(e.target.value)} className="field" />
            <span className="mt-1 block text-xs text-muted">Жалпы ұпайға қосылады (теріс сан да болады).</span>
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>
            💾 Сақтау
          </button>
        </form>

        <section>
          <h3 className="mb-2 font-serif text-lg font-bold text-heading">Сабақтардағы нәтижелері</h3>
          {results === null ? (
            <Loading />
          ) : results.length === 0 ? (
            <p className="text-sm text-muted">Әлі ешбір сабақ өтпеген.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {results.map((r) => (
                <ResultItem
                  key={r.id}
                  r={r}
                  title={title(r.lessonId)}
                  busy={busy}
                  onManual={async (manual) => {
                    const lesson = lessons.data?.find((l) => l.id === r.lessonId);
                    if (!lesson) return;
                    if (await run(() => setManualScore(lesson, user.id, user.username, manual), "Балл сақталды")) {
                      loadResults();
                      onChanged();
                    }
                  }}
                  onDelete={async () => {
                    if (await run(() => deleteResult(r.lessonId, user.id), "Нәтиже жойылды")) {
                      loadResults();
                      onChanged();
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-heading">Аккаунт</h3>
          {isMe ? (
            <p className="text-sm text-muted">Өз аккаунтыңыздың рөлін өзгертуге және оны жоюға болмайды.</p>
          ) : (
            <Toggle
              checked={user.isAdmin}
              onChange={async (v) => {
                if (await run(() => setAdmin(user.id, v), v ? "Енді әкімші" : "Әкімші құқығы алынды")) onChanged();
              }}
              label="Әкімші"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={smallBtn}
              disabled={busy || !user.email}
              title={user.email ? undefined : "Email белгісіз"}
              onClick={() => run(() => sendReset(user.email), `Құпия сөзді қалпына келтіру хаты жіберілді: ${user.email}`)}
            >
              ✉️ Құпия сөзді қалпына келтіру хаты
            </button>
            {!isMe && (
              <button type="button" className={dangerBtn} disabled={busy} onClick={() => setConfirmDelete(true)}>
                🗑 Пайдаланушыны жою
              </button>
            )}
          </div>
        </section>

        <StatusLine status={status} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`«${user.username}» және оның барлық нәтижелері жойылады. Жалғастырасыз ба?`}
        confirmLabel="Жою"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          let authDeleted = false;
          const ok = await run(async () => {
            authDeleted = (await deleteUserEverywhere(user.id, user.username)).authDeleted;
          }, "Жойылды");
          if (!ok) return;
          if (!authDeleted) {
            setStatus({
              kind: "ok",
              text: "Деректері жойылды. Кіру аккаунты Firebase Console → Authentication бөлімінде қалды: оны сол жерден жойыңыз немесе Vercel-ге FIREBASE_SERVICE_ACCOUNT қосыңыз.",
            });
            setTimeout(onDeleted, 4000);
          } else onDeleted();
        }}
      />
    </dialog>
  );
}

function ResultItem({
  r,
  title,
  busy,
  onManual,
  onDelete,
}: {
  r: LessonResult & { id: string };
  title: string;
  busy: boolean;
  onManual: (v: number | null) => void;
  onDelete: () => void;
}) {
  const original = r.manual === null || r.manual === undefined ? "" : String(r.manual);
  const [manual, setManual] = useState(original);
  const changed = manual.trim() !== original && (manual.trim() === "" || Number.isFinite(Number(manual)));
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {title} {r.completed && "✅"}
        </span>
        <span className="text-xs text-muted">
          Жинағаны {r.score}/{r.maxScore} · есепке: {effective(r)}
        </span>
      </span>
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) onManual(manual.trim() === "" ? null : Math.max(0, Math.round(Number(manual))));
        }}
      >
        <input
          type="number"
          min={0}
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="қолмен"
          aria-label={`${title}: қолмен балл`}
          className="field w-24 px-2 py-1"
        />
        {changed && (
          <button type="submit" className={smallBtn} disabled={busy}>
            ✓
          </button>
        )}
        <button type="button" className={dangerBtn} disabled={busy} onClick={onDelete} aria-label={`${title}: нәтижені жою`}>
          ✕
        </button>
      </form>
    </li>
  );
}

function AddUserForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (input: { username: string; email: string; password: string }) => void;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ username: username.trim(), email: email.trim(), password });
      }}
      className="space-y-3 rounded-xl border border-gold/50 bg-bg p-4"
    >
      <TextField label="Пайдаланушы аты" value={username} onChange={setUsername} required />
      <TextField label="Электронды пошта" value={email} onChange={setEmail} required />
      <TextField label="Құпия сөз" value={password} onChange={setPassword} required hint="Кемінде 6 таңба. Оқушыға өзіңіз жіберіңіз." />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          Болдырмау
        </button>
        <button type="submit" className="btn-primary" disabled={busy || !username.trim() || !email.trim() || password.length < 6}>
          {busy ? "Құрылуда..." : "Қосу"}
        </button>
      </div>
    </form>
  );
}
