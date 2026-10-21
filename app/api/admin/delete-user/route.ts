import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/*
  POST /api/admin/delete-user { uid } — полностью удаляет ученика: аккаунт входа, профиль, имя, результаты.
  Нужна переменная FIREBASE_SERVICE_ACCOUNT (JSON ключа сервисного аккаунта из Firebase Console →
  Project settings → Service accounts → Generate new private key). Без неё отвечает 501,
  и админка удаляет только данные в Firestore.
*/

function adminApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  return getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)) });
}

export async function POST(request: Request) {
  const app = adminApp();
  if (!app) return new Response("FIREBASE_SERVICE_ACCOUNT is not set", { status: 501 });

  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return new Response("No token", { status: 401 });

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
  if (username) batch.delete(store.doc(`usernames/${username.toLowerCase()}`));
  await batch.commit();

  await getAuth(app)
    .deleteUser(uid)
    .catch((e: { code?: string }) => {
      if (e.code !== "auth/user-not-found") throw e;
    });

  return Response.json({ ok: true });
}
