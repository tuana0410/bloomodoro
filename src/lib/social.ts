// Friends and challenges, synced with Firebase (Firestore + anonymous sign-in).
// The rest of the app works without it: if the Firebase keys are missing,
// isSocialConfigured() is false and the Friends tab explains how to turn it on.
//
// Data layout (rules in firestore.rules):
//   users/{uid}                 name, code, totalMinutes, streak, wins
//   users/{uid}/friends/{fuid}  since
//   codes/{CODE}                uid          (one document per code, so codes stay unique)
//   challenges/{id}             from, to, minutes, status, …

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  increment,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { makeFriendCode, type Challenge, type ChallengeStatus, type FriendStats } from "./friends";

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export function isSocialConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function fire() {
  if (!isSocialConfigured()) throw new Error("Firebase is not configured.");
  app ??= initializeApp(config);
  db ??= getFirestore(app);
  return { auth: getAuth(app), db };
}

export interface Profile {
  uid: string;
  name: string;
  code: string;
}

function signedInUser(): Promise<User> {
  const { auth } = fire();
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop();
        resolve(user);
      }
    });
    signInAnonymously(auth).catch((e) => {
      stop();
      reject(e);
    });
  });
}

/** Signs in (anonymously, once per browser) and makes sure the person has a profile and a unique code. */
export async function connect(name: string): Promise<Profile> {
  const { db } = fire();
  const user = await signedInUser();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return { uid: user.uid, name: String(d.name ?? ""), code: String(d.code) };
  }
  // New person: try codes until one is free (collisions are rare with 10 000 numbers per name)
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeFriendCode(name);
    const created = await runTransaction(db, async (tx) => {
      const codeRef = doc(db, "codes", code);
      if ((await tx.get(codeRef)).exists()) return false;
      tx.set(codeRef, { uid: user.uid });
      tx.set(ref, { name: name.slice(0, 20), code, totalMinutes: 0, streak: 0, wins: 0, updatedAt: Date.now() });
      return true;
    });
    if (created) return { uid: user.uid, name, code };
  }
  throw new Error("Could not create a friend code. Try again.");
}

/** Shares my name and progress with my friends. */
export async function publishStats(uid: string, stats: { name: string; totalMinutes: number; streak: number }) {
  const { db } = fire();
  await setDoc(doc(db, "users", uid), { ...stats, name: stats.name.slice(0, 20), updatedAt: Date.now() }, { merge: true });
}

/** Adds each other: I appear in their list and they appear in mine. */
export async function addFriendByCode(myUid: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = fire();
  const codeSnap = await getDoc(doc(db, "codes", code));
  if (!codeSnap.exists()) return { ok: false, error: "No one has that code. Check it with your friend." };
  const friendUid = String(codeSnap.data().uid);
  if (friendUid === myUid) return { ok: false, error: "That's your own code." };
  const batch = writeBatch(db);
  const since = Date.now();
  batch.set(doc(db, "users", myUid, "friends", friendUid), { since });
  batch.set(doc(db, "users", friendUid, "friends", myUid), { since });
  await batch.commit();
  return { ok: true };
}

/** Live list of my friends with their stats. Returns a function that stops listening. */
export function watchFriends(myUid: string, onChange: (friends: FriendStats[]) => void): () => void {
  const { db } = fire();
  const stats = new Map<string, FriendStats>();
  const listeners = new Map<string, () => void>();
  const emit = () => onChange([...stats.values()]);

  const stopList = onSnapshot(collection(db, "users", myUid, "friends"), (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const [id, stop] of listeners) {
      if (!ids.has(id)) {
        stop();
        listeners.delete(id);
        stats.delete(id);
      }
    }
    for (const id of ids) {
      if (listeners.has(id)) continue;
      listeners.set(
        id,
        onSnapshot(doc(db, "users", id), (u) => {
          const d = u.data();
          if (!d) return;
          stats.set(id, {
            uid: id,
            name: String(d.name || "Friend"),
            code: String(d.code ?? ""),
            totalMinutes: Number(d.totalMinutes) || 0,
            streak: Number(d.streak) || 0,
            wins: Number(d.wins) || 0,
          });
          emit();
        }),
      );
    }
    emit();
  });

  return () => {
    stopList();
    listeners.forEach((stop) => stop());
  };
}

function toChallenge(id: string, d: Record<string, unknown>): Challenge {
  return {
    id,
    from: String(d.from),
    fromName: String(d.fromName ?? ""),
    to: String(d.to),
    toName: String(d.toName ?? ""),
    minutes: Number(d.minutes) || 0,
    status: d.status as ChallengeStatus,
    createdAt: Number(d.createdAt) || 0,
    updatedAt: Number(d.updatedAt) || 0,
  };
}

/** Live list of challenges I sent or received. */
export function watchChallenges(myUid: string, onChange: (list: Challenge[]) => void): () => void {
  const { db } = fire();
  const sent = new Map<string, Challenge>();
  const got = new Map<string, Challenge>();
  const emit = () => onChange([...sent.values(), ...got.values()]);
  const listen = (field: "from" | "to", into: Map<string, Challenge>) =>
    onSnapshot(query(collection(db, "challenges"), where(field, "==", myUid)), (snap) => {
      into.clear();
      snap.docs.forEach((d) => into.set(d.id, toChallenge(d.id, d.data())));
      emit();
    });
  const a = listen("from", sent);
  const b = listen("to", got);
  return () => {
    a();
    b();
  };
}

export async function sendChallenge(me: Profile, friend: FriendStats, minutes: number) {
  const { db } = fire();
  const now = Date.now();
  await addDoc(collection(db, "challenges"), {
    from: me.uid,
    fromName: me.name,
    to: friend.uid,
    toName: friend.name,
    minutes,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

export async function setChallengeStatus(myUid: string, id: string, status: ChallengeStatus) {
  const { db } = fire();
  await updateDoc(doc(db, "challenges", id), { status, updatedAt: Date.now() });
  if (status === "completed") await updateDoc(doc(db, "users", myUid), { wins: increment(1) });
}
