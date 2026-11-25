// Friend codes and challenge rules. Pure functions, so they can be tested
// without a network; src/lib/social.ts does the actual syncing.

import { MAX_MINUTES, MIN_MINUTES } from "./game";

/** Ready-made challenge lengths shown as chips. */
export const CHALLENGE_PRESETS = [15, 25, 50];
export const MAX_FRIENDS = 50;

const TR_TO_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

/** "Tuana Metdar" -> "TUANA". Letters only, Turkish letters folded, 2–8 characters. */
export function codePrefix(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)[0]
    .replace(/[çğıİöşü]/gi, (c) => TR_TO_ASCII[c] ?? TR_TO_ASCII[c.toLowerCase()] ?? c)
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return letters.length >= 2 ? letters : "FOCUS";
}

/** A friend code like "TUANA-4821". `random` is injectable so tests are stable. */
export function makeFriendCode(name: string, random: () => number = Math.random): string {
  const digits = String(Math.floor(random() * 10_000)).padStart(4, "0");
  return `${codePrefix(name)}-${digits}`;
}

/** What a person types into "Add friend": trims, uppercases, accepts "tuana 4821" too. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function isValidCode(code: string): boolean {
  return /^[A-Z]{2,8}-\d{4}$/.test(code);
}

export type AddCheck = { ok: true; code: string } | { ok: false; error: string };

/** Checks a typed code before asking the server: format, not yourself, not already a friend. */
export function checkFriendCode(raw: string, myCode: string, friendCodes: string[]): AddCheck {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, error: "Type your friend's code, like TUANA-4821." };
  if (!isValidCode(code)) return { ok: false, error: "That doesn't look like a friend code (NAME-1234)." };
  if (code === myCode) return { ok: false, error: "That's your own code. Share it with a friend instead!" };
  if (friendCodes.includes(code)) return { ok: false, error: "You're already friends." };
  if (friendCodes.length >= MAX_FRIENDS) return { ok: false, error: `You can have up to ${MAX_FRIENDS} friends.` };
  return { ok: true, code };
}

// ---------- Challenges ----------

export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed" | "failed";

export interface Challenge {
  id: string;
  from: string; // uid
  fromName: string;
  to: string; // uid
  toName: string;
  minutes: number;
  status: ChallengeStatus;
  createdAt: number;
  updatedAt: number;
}

export type Action = "accept" | "decline" | "complete" | "fail";

const NEXT: Record<ChallengeStatus, Partial<Record<Action, ChallengeStatus>>> = {
  pending: { accept: "accepted", decline: "declined" },
  accepted: { complete: "completed", fail: "failed" },
  declined: {},
  completed: {},
  failed: {},
};

/** Only the person who was challenged can move it forward, and only along pending → accepted → completed/failed. */
export function nextStatus(challenge: Challenge, action: Action, byUid: string): ChallengeStatus | null {
  if (byUid !== challenge.to) return null;
  return NEXT[challenge.status][action] ?? null;
}

export function isValidChallengeMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES;
}

/** Challenges older than a day that nobody answered are hidden from the lists. */
export const CHALLENGE_TTL_MS = 24 * 60 * 60 * 1000;

export function isOpen(c: Challenge, now: number): boolean {
  if (c.status === "accepted") return true;
  return c.status === "pending" && now - c.createdAt < CHALLENGE_TTL_MS;
}

/** Splits challenges for the Friends tab: what I must answer, what I sent, and finished ones (newest first). */
export function groupChallenges(all: Challenge[], myUid: string, now: number) {
  const byNewest = [...all].sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    incoming: byNewest.filter((c) => c.to === myUid && isOpen(c, now)),
    sent: byNewest.filter((c) => c.from === myUid && isOpen(c, now)),
    done: byNewest.filter((c) => !isOpen(c, now)).slice(0, 10),
  };
}

export interface FriendStats {
  uid: string;
  name: string;
  code: string;
  totalMinutes: number;
  streak: number;
  wins: number; // challenges completed
}

/** Leaderboard order: most focused minutes, then streak, then name. */
export function rankFriends(list: FriendStats[]): FriendStats[] {
  return [...list].sort(
    (a, b) => b.totalMinutes - a.totalMinutes || b.streak - a.streak || a.name.localeCompare(b.name),
  );
}
