import type { App, ServiceAccount } from "firebase-admin/app";

/*
  POST /api/admin/delete-user { uid } — полностью удаляет ученика: аккаунт входа, профиль, имя, результаты.
  Нужна переменная FIREBASE_SERVICE_ACCOUNT (JSON ключа сервисного аккаунта из Firebase Console →
  Project settings → Service accounts → Generate new private key). Без неё отвечает 501,
  и админка удаляет только данные в Firestore.
*/

class ConfigError extends Error {}

/**
 * Ключ вставляют в Vercel руками, поэтому принимаем разные виды: JSON как есть, склеенный в одну строку,
 * в кавычках или base64. В тексте ошибки нет содержимого ключа — только что с ним не так.
 */
function parseServiceAccount(raw: string): ServiceAccount {
  let text = raw.trim();
  if (/^['"]/.test(text) && text.at(-1) === text[0]) text = text.slice(1, -1).trim();
  if (!text.startsWith("{")) {
    const decoded = Buffer.from(text, "base64").toString("utf8").trim();
    if (decoded.startsWith("{")) text = decoded;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ConfigError(
      `FIREBASE_SERVICE_ACCOUNT оқылмады: JSON емес (ұзындығы ${text.length}, басы «${text.slice(0, 1)}», соңы «${text.slice(-1)}»). Файлды толық, { бастап } дейін қайта қойыңыз.`,
    );
  }
  const key = data.private_key;
  if (typeof key !== "string" || !key.includes("PRIVATE KEY")) {
    throw new ConfigError("FIREBASE_SERVICE_ACCOUNT ішінде private_key жоқ. Firebase-тен жүктелген файлды толық қойыңыз.");
  }
  if (typeof data.client_email !== "string") {
    throw new ConfigError("FIREBASE_SERVICE_ACCOUNT ішінде client_email жоқ. Firebase-тен жүктелген файлды толық қойыңыз.");
  }
  return {
    projectId: String(data.project_id ?? ""),
    clientEmail: data.client_email,
    // Если переводы строк в ключе превратились в буквальные «\n» — возвращаем настоящие
    privateKey: key.replace(/\\n/g, "\n"),
  };
}

// firebase-admin грузим внутри запроса: если библиотека не загрузится на хостинге, вернём текст ошибки, а не пустой 500
async function loadAdmin() {
  try {
    const [appMod, authMod, storeMod] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
    ]);
    return { ...appMod, getAuth: authMod.getAuth, getFirestore: storeMod.getFirestore };
  } catch (e) {
    throw new ConfigError(`firebase-admin жүктелмеді: ${e instanceof Error ? e.message : String(e)}`);
  }
}

type Admin = Awaited<ReturnType<typeof loadAdmin>>;

function adminApp({ cert, getApps, initializeApp }: Admin): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (getApps()[0]) return getApps()[0];
  const account = parseServiceAccount(raw);
  try {
    return initializeApp({ credential: cert(account) });
  } catch (e) {
    throw new ConfigError(`FIREBASE_SERVICE_ACCOUNT кілті жарамсыз: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function POST(request: Request) {
  let admin: Admin;
  let app: App | null;
  try {
    admin = await loadAdmin();
    app = adminApp(admin);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "FIREBASE_SERVICE_ACCOUNT қате", { status: 500 });
  }
  if (!app) return new Response("FIREBASE_SERVICE_ACCOUNT is not set", { status: 501 });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return new Response("No token", { status: 401 });

  const { getAuth, getFirestore } = admin;
  try {
    const store = getFirestore(app);
    let caller: string;
    try {
      caller = (await getAuth(app).verifyIdToken(token)).uid;
    } catch {
      return new Response("Bad token", { status: 401 });
    }
    if (!(await store.doc(`admins/${caller}`).get()).exists) return new Response("Not admin", { status: 403 });

    const { uid } = (await request.json().catch(() => ({}))) as { uid?: string };
    if (!uid || typeof uid !== "string") return new Response("No uid", { status: 400 });
    if (uid === caller) return new Response("Cannot delete yourself", { status: 400 });

    const profile = await store.doc(`users/${uid}`).get();
    const username = profile.exists ? String(profile.data()?.username ?? "") : "";
    const results = await store.collection("results").where("uid", "==", uid).get();

    const batch = store.batch();
    results.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(store.doc(`users/${uid}`));
    batch.delete(store.doc(`admins/${uid}`));
    batch.delete(store.doc(`private/${uid}`));
    // Ключ как в lib/user.ts usernameKey: в нижний регистр только латиница
    if (username) batch.delete(store.doc(`usernames/${username.replace(/[A-Z]+/g, (m) => m.toLowerCase())}`));
    await batch.commit();

    await getAuth(app)
      .deleteUser(uid)
      .catch((e: { code?: string }) => {
        if (e.code !== "auth/user-not-found") throw e;
      });

    return Response.json({ ok: true });
  } catch (e) {
    const code = (e as { code?: string }).code;
    return new Response(`Firebase қатесі${code ? ` (${code})` : ""}: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
