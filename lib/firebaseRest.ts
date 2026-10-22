/*
  Firebase на сервере через REST, без firebase-admin: проверка токена входа и чтение документов Firestore.
  Читаем от имени самого ученика (его ID-токен), поэтому действуют те же правила firestore.rules, что и в браузере.
*/

// Публичный веб-ключ (тот же, что в lib/firebase.ts): не секрет, нужен Google для идентификации проекта
export const FIREBASE_WEB_API_KEY = "AIzaSyC3n8GR6HBFRgSHr6IH3IJ2m9teCRx0Lxg";
export const FIREBASE_PROJECT_ID = "marjansoz";
export const IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1";
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

/** uid вошедшего пользователя по его ID-токену. Google сам проверяет подпись и срок токена. */
export async function verifyIdToken(idToken: string): Promise<string | null> {
  const res = await fetch(`${IDENTITY_URL}/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: { localId?: string }[] };
  return data.users?.[0]?.localId ?? null;
}

/** ID-токен из заголовка «Authorization: Bearer …» */
export function bearer(request: Request): string | null {
  const m = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

type FsValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
};

function decode(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue?.values ?? []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue?.fields ?? {});
  return null;
}

const decodeFields = (fields: Record<string, FsValue>) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

/** Документ Firestore как обычный объект; null — нет документа или нет прав. */
export async function getDocument<T>(path: string, idToken?: string | null): Promise<T | null> {
  const res = await fetch(`${FIRESTORE_URL}/${path}?key=${FIREBASE_WEB_API_KEY}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const data = (await res.json()) as { fields?: Record<string, FsValue> };
  return decodeFields(data.fields ?? {}) as T;
}

/** Документы коллекции, где поле равно значению (Firestore runQuery). Действуют правила firestore.rules. */
export async function queryEqual<T>(collection: string, field: string, value: string | boolean, idToken?: string | null): Promise<(T & { id: string })[]> {
  const res = await fetch(`${FIRESTORE_URL}:runQuery?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: typeof value === "boolean" ? { booleanValue: value } : { stringValue: value },
          },
        },
      },
    }),
    cache: "no-store",
  });
  if (res.status === 403) return [];
  if (!res.ok) throw new Error(`Firestore ${res.status}`);
  const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, FsValue> } }[];
  return rows.flatMap((r) => (r.document ? [{ ...decodeFields(r.document.fields ?? {}), id: r.document.name.split("/").pop() } as T & { id: string }] : []));
}
