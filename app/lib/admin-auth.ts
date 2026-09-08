import { env } from "cloudflare:workers";
import { ensureDb, getRawDb } from "../../db";
import { digest, HttpError } from "./security";

const COOKIE_NAME = "atadan_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const DEFAULT_PBKDF2_ITERATIONS = 100_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StoredAdmin = {
  email: string;
  salt: string;
  hash: string;
  iterations?: number;
};

type ConfiguredAdmin = {
  identifier: string;
  fingerprint: string;
  verify(password: string): Promise<boolean>;
};

function runtimeEnv() {
  return env as unknown as Record<string, string | undefined>;
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

async function derivePasswordHash(password: string, saltHex: string, iterations: number) {
  const salt = hexToBytes(saltHex);
  if (!salt || salt.length < 16 || !Number.isSafeInteger(iterations) || iterations < 100_000) return "";
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function parseStoredAdmins(value: string): StoredAdmin[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is StoredAdmin => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<StoredAdmin>;
      return typeof candidate.email === "string"
        && typeof candidate.salt === "string"
        && typeof candidate.hash === "string"
        && /^[a-f0-9]{32,}$/i.test(candidate.salt)
        && /^[a-f0-9]{64}$/i.test(candidate.hash)
        && (candidate.iterations === undefined || (Number.isSafeInteger(candidate.iterations) && Number(candidate.iterations) >= 100_000));
    });
  } catch {
    return [];
  }
}

function configuredAdmins(request: Request): ConfiguredAdmin[] {
  const values = runtimeEnv();
  if (values.ADMIN_USERS_JSON !== undefined) {
    return parseStoredAdmins(values.ADMIN_USERS_JSON).map((admin) => {
      const identifier = normalizeIdentifier(admin.email);
      const iterations = admin.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
      return {
        identifier,
        fingerprint: admin.hash.toLowerCase(),
        async verify(password: string) {
          const supplied = await derivePasswordHash(password, admin.salt.toLowerCase(), iterations);
          return constantTimeEqual(supplied, admin.hash.toLowerCase());
        },
      };
    });
  }

  const local = new URL(request.url).hostname === "localhost";
  const password = values.ADMIN_PASSWORD || (local ? "atadan-preview" : "");
  if (!password) return [];
  const identifier = normalizeIdentifier(values.ADMIN_USERNAME || "atadan");
  return [{
    identifier,
    fingerprint: password,
    async verify(suppliedPassword: string) {
      return constantTimeEqual(suppliedPassword, password);
    },
  }];
}

function sessionSecret(admins: ConfiguredAdmin[]) {
  return runtimeEnv().ADMIN_SESSION_SECRET || admins.map((admin) => `${admin.identifier}:${admin.fingerprint}`).join("|");
}

async function sessionSignature(admin: ConfiguredAdmin, issuedAt: number, admins: ConfiguredAdmin[]) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret(admins)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`atadan-admin:${admin.identifier}:${issuedAt}:${admin.fingerprint}`),
  );
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyCredentials(username: string, password: string, request: Request) {
  const admins = configuredAdmins(request);
  const identifier = normalizeIdentifier(username);
  const admin = admins.find((candidate) => candidate.identifier === identifier);
  if (!admin) {
    if (admins[0]) await admins[0].verify(password);
    return false;
  }
  return admin.verify(password);
}

export async function isAdmin(request: Request) {
  const admins = configuredAdmins(request);
  if (!admins.length) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const [identifierHex, issuedAtValue, suppliedSignature, ...rest] = token?.split(".") ?? [];
  if (!identifierHex || !issuedAtValue || !suppliedSignature || rest.length) return false;

  const identifierBytes = hexToBytes(identifierHex);
  const issuedAt = Number(issuedAtValue);
  if (!identifierBytes || !Number.isSafeInteger(issuedAt)) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < -300 || age > SESSION_TTL_SECONDS) return false;

  const identifier = normalizeIdentifier(decoder.decode(identifierBytes));
  const admin = admins.find((candidate) => candidate.identifier === identifier);
  if (!admin) return false;
  const expectedSignature = await sessionSignature(admin, issuedAt, admins);
  return constantTimeEqual(suppliedSignature, expectedSignature);
}

export async function adminCookie(username: string, request: Request, secure = true) {
  const admins = configuredAdmins(request);
  const admin = admins.find((candidate) => candidate.identifier === normalizeIdentifier(username));
  if (!admin) return clearAdminCookie();
  const issuedAt = Math.floor(Date.now() / 1000);
  const identifierHex = bytesToHex(encoder.encode(admin.identifier));
  const signature = await sessionSignature(admin, issuedAt, admins);
  return `${COOKIE_NAME}=${identifierHex}.${issuedAt}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export type Actor = { id: string; email: string; display_name: string; role: "owner" | "manager"; active: number; theme: string; avatar: string | null; phone: string };
const ACTOR_FIELDS = "id,email,display_name,role,active,theme,avatar,phone";
const STAFF_COOKIE = "atadan_staff";
function staffToken(request: Request) { return request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${STAFF_COOKIE}=`))?.slice(STAFF_COOKIE.length + 1); }
export async function getActor(request: Request): Promise<Actor | null> {
  await ensureDb();
  const token = staffToken(request);
  if (token) return getRawDb().prepare(`SELECT s.id,s.email,s.display_name,s.role,s.active,s.theme,s.avatar,s.phone FROM staff s JOIN staff_sessions se ON se.staff_id=s.id WHERE se.token_hash=? AND se.expires_at>? AND s.active=1`).bind(await digest(token), Math.floor(Date.now()/1000)).first<Actor>();
  if (!(await isAdmin(request))) return null;
  const legacy = request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length+1).split(".")[0];
  if (!legacy) return null;
  const bytes = hexToBytes(legacy);
  if (!bytes) return null;
  return ensureOwner(normalizeIdentifier(decoder.decode(bytes)));
}
async function ensureOwner(email: string): Promise<Actor | null> {
  const db = getRawDb();
  await db.prepare(`INSERT INTO staff (id,email,display_name,role) VALUES (?,?,?,'owner') ON CONFLICT(email) DO NOTHING`).bind(crypto.randomUUID(), email, email.split("@")[0]).run();
  await db.prepare("UPDATE staff SET role='owner',active=1 WHERE email=?").bind(email).run();
  return db.prepare(`SELECT ${ACTOR_FIELDS} FROM staff WHERE email=? AND active=1`).bind(email).first<Actor>();
}
export async function requireActor(request: Request, ownerOnly = false) {
  const actor = await getActor(request);
  if (!actor) throw new HttpError(401, "Войдите в рабочий кабинет");
  if (ownerOnly && actor.role !== "owner") throw new HttpError(403, "Это действие доступно только управляющему");
  return actor;
}
export async function hashPassword(password: string) {
  if (password.length < 10 || password.length > 128) throw new HttpError(400, "Пароль должен содержать от 10 до 128 символов");
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(24)));
  return { salt, hash: await derivePasswordHash(password, salt, DEFAULT_PBKDF2_ITERATIONS) };
}
export async function authenticateStaff(email: string, password: string, request: Request) {
  await ensureDb();
  const normalized = normalizeIdentifier(email);
  const stored = await getRawDb().prepare(`SELECT ${ACTOR_FIELDS},password_hash,salt FROM staff WHERE email=?`).bind(normalized).first<Actor & {password_hash:string|null;salt:string|null}>();
  if (stored?.active && stored.password_hash && stored.salt) {
    const hash = await derivePasswordHash(password, stored.salt, DEFAULT_PBKDF2_ITERATIONS);
    if (constantTimeEqual(hash, stored.password_hash)) return stored;
  }
  if (!(await verifyCredentials(normalized, password, request))) return null;
  const owner = await ensureOwner(normalized);
  if (!owner) return null;
  const derived = await hashPassword(password);
  await getRawDb().prepare("UPDATE staff SET password_hash=?,salt=?,role='owner',active=1 WHERE id=?").bind(derived.hash, derived.salt, owner.id).run();
  return owner;
}
export async function createStaffSession(actor: Actor, request: Request) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const now=Math.floor(Date.now()/1000);
  await getRawDb().batch([
    getRawDb().prepare("DELETE FROM staff_sessions WHERE expires_at<=?").bind(now),
    getRawDb().prepare("INSERT INTO staff_sessions(token_hash,staff_id,expires_at) VALUES(?,?,?)").bind(await digest(token),actor.id,now+SESSION_TTL_SECONDS),
  ]);
  return `${STAFF_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function revokeStaffSession(request: Request) {
  const token = staffToken(request);
  if (token) await getRawDb().prepare("DELETE FROM staff_sessions WHERE token_hash=?").bind(await digest(token)).run();
  return `${STAFF_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
