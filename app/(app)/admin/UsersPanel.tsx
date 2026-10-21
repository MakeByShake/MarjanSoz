"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Loading } from "@/components/ui";
import { setBonus } from "@/lib/lessons";
import { normalize } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";
import { createUser, deleteUserEverywhere, listUsers, setAdmin, type UserRow } from "@/lib/usersAdmin";
import { dangerBtn, Panel, ShownError, smallBtn, StatusLine, TextField, Toggle, useAction } from "./shared";

export function UsersPanel() {
  const me = useCurrentUser();
  const { busy, status, run, setStatus } = useAction();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

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
    const q = normalize(query);
    return (users ?? []).filter((u) => (!onlyAdmins || u.isAdmin) && (!q || normalize(u.username).includes(q)));
  }, [users, query, onlyAdmins]);

  if (loadError) return <p className="py-16 text-center text-muted">Пайдаланушыларды жүктеу мүмкін болмады. Firestore ережелерін жаңартыңыз.</p>;
  if (!users) return <Loading />;

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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Аты бойынша іздеу..."
            aria-label="Пайдаланушы іздеу"
            className="field sm:flex-1"
          />
          <Toggle checked={onlyAdmins} onChange={setOnlyAdmins} label="Тек әкімшілер" />
        </div>
        <ul className="divide-y divide-line">
          {filtered.map((u) => (
            <UserItem
              key={u.id}
              u={u}
              isMe={u.id === me?.id}
              busy={busy}
              onAdmin={async (value) => {
                if (await run(() => setAdmin(u.id, value), value ? `${u.username} — енді әкімші` : `${u.username} әкімші емес`)) reload();
              }}
              onBonus={async (bonus) => {
                if (await run(() => setBonus(u.id, bonus), `${u.username}: бонус ${bonus} сақталды`)) reload();
              }}
              onDelete={() => setDeleting(u)}
            />
          ))}
        </ul>
        {filtered.length === 0 && <p className="py-8 text-center text-muted">Ешкім табылмады.</p>}
      </Panel>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `«${deleting.username}» пайдаланушысын және оның барлық нәтижелерін жоясыз ба?` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const target = deleting;
          let authDeleted = false;
          const ok = await run(async () => {
            authDeleted = (await deleteUserEverywhere(target.id, target.username)).authDeleted;
          }, `${target.username} жойылды`);
          if (ok && !authDeleted) {
            setStatus({
              kind: "ok",
              text: `${target.username} деректері жойылды. Кіру аккаунты Firebase Console → Authentication бөлімінде қалды (серверге FIREBASE_SERVICE_ACCOUNT қосылмаған).`,
            });
          }
          if (ok) reload();
        }}
      />
    </div>
  );
}

function UserItem({
  u,
  isMe,
  busy,
  onAdmin,
  onBonus,
  onDelete,
}: {
  u: UserRow;
  isMe: boolean;
  busy: boolean;
  onAdmin: (v: boolean) => void;
  onBonus: (v: number) => void;
  onDelete: () => void;
}) {
  const [bonus, setBonusValue] = useState(String(u.bonus));
  const changed = Number(bonus) !== u.bonus && bonus.trim() !== "" && Number.isFinite(Number(bonus));

  return (
    <li className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {u.username}
          {isMe && <span className="ml-2 text-sm font-normal text-muted">(сіз)</span>}
          {u.isAdmin && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium">⚙️ әкімші</span>}
        </p>
        <p className="text-sm text-muted">
          {u.points} ұпай · тіркелген: {u.createdAt ? new Date(u.createdAt).toLocaleDateString("kk-KZ") : "—"}
        </p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (changed) onBonus(Math.round(Number(bonus)));
        }}
      >
        <label className="text-sm">
          <span className="mr-2">Бонус</span>
          <input
            type="number"
            value={bonus}
            onChange={(e) => setBonusValue(e.target.value)}
            className="field w-24 px-2 py-1.5"
            aria-label={`${u.username}: бонус ұпай`}
          />
        </label>
        {changed && (
          <button type="submit" className={smallBtn} disabled={busy}>
            Сақтау
          </button>
        )}
      </form>
      <div className="flex items-center gap-3">
        {isMe ? (
          <span className="text-sm text-muted">Өзіңізді өзгерте алмайсыз</span>
        ) : (
          <>
            <Toggle checked={u.isAdmin} onChange={onAdmin} label="Әкімші" />
            <button type="button" className={dangerBtn} disabled={busy} onClick={onDelete}>
              Жою
            </button>
          </>
        )}
      </div>
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
