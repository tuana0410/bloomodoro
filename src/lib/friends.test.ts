import { describe, expect, it } from "vitest";
import {
  checkFriendCode,
  codePrefix,
  groupChallenges,
  isValidChallengeMinutes,
  isValidCode,
  makeFriendCode,
  nextStatus,
  normalizeCode,
  rankFriends,
  CHALLENGE_TTL_MS,
  type Challenge,
} from "./friends";

const challenge = (over: Partial<Challenge> = {}): Challenge => ({
  id: "c1",
  from: "alice",
  fromName: "Alice",
  to: "bob",
  toName: "Bob",
  minutes: 25,
  status: "pending",
  createdAt: 1_000,
  updatedAt: 1_000,
  ...over,
});

describe("friend codes", () => {
  it("builds a code from the first name with Turkish letters folded", () => {
    expect(codePrefix("Tuana Metdar")).toBe("TUANA");
    expect(codePrefix("Şükrü")).toBe("SUKRU");
    expect(codePrefix("İlkay Çağrı")).toBe("ILKAY");
  });

  it("falls back to FOCUS when the name is empty or too short", () => {
    expect(codePrefix("")).toBe("FOCUS");
    expect(codePrefix("A")).toBe("FOCUS");
  });

  it("pads the digits so every code has four", () => {
    expect(makeFriendCode("Tuana", () => 0.0007)).toBe("TUANA-0007");
    expect(makeFriendCode("Tuana", () => 0.4821)).toBe("TUANA-4821");
  });

  it("accepts lowercase and spaces when someone types a code", () => {
    expect(normalizeCode("  tuana 4821 ")).toBe("TUANA-4821");
    expect(isValidCode("TUANA-4821")).toBe(true);
    expect(isValidCode("TUANA4821")).toBe(false);
  });
});

describe("adding a friend", () => {
  it("refuses your own code", () => {
    expect(checkFriendCode("TUANA-4821", "TUANA-4821", [])).toEqual({
      ok: false,
      error: expect.stringContaining("your own code"),
    });
  });

  it("refuses a friend you already have", () => {
    const r = checkFriendCode("kaan-1111", "TUANA-4821", ["KAAN-1111"]);
    expect(r.ok).toBe(false);
  });

  it("returns the cleaned code when everything is fine", () => {
    expect(checkFriendCode("kaan 1111", "TUANA-4821", [])).toEqual({ ok: true, code: "KAAN-1111" });
  });
});

describe("challenge rules", () => {
  it("lets only the challenged person accept", () => {
    expect(nextStatus(challenge(), "accept", "bob")).toBe("accepted");
    expect(nextStatus(challenge(), "accept", "alice")).toBeNull();
  });

  it("only completes a challenge that was accepted first", () => {
    expect(nextStatus(challenge(), "complete", "bob")).toBeNull();
    expect(nextStatus(challenge({ status: "accepted" }), "complete", "bob")).toBe("completed");
  });

  it("never changes a finished challenge", () => {
    expect(nextStatus(challenge({ status: "completed" }), "fail", "bob")).toBeNull();
    expect(nextStatus(challenge({ status: "declined" }), "accept", "bob")).toBeNull();
  });

  it("uses the same minute limits as a normal session", () => {
    expect(isValidChallengeMinutes(25)).toBe(true);
    expect(isValidChallengeMinutes(0)).toBe(false);
    expect(isValidChallengeMinutes(2.5)).toBe(false);
    expect(isValidChallengeMinutes(500)).toBe(false);
  });

  it("sorts challenges into incoming, sent and done, and hides stale ones", () => {
    const now = 10_000;
    const all = [
      challenge({ id: "in", from: "alice", to: "me", createdAt: now - 10, updatedAt: now - 10 }),
      challenge({ id: "out", from: "me", to: "bob", createdAt: now - 5, updatedAt: now - 5 }),
      challenge({ id: "fin", from: "me", to: "bob", status: "completed", updatedAt: now - 1 }),
      challenge({ id: "old", from: "alice", to: "me", createdAt: now - CHALLENGE_TTL_MS - 1 }),
    ];
    const g = groupChallenges(all, "me", now);
    expect(g.incoming.map((c) => c.id)).toEqual(["in"]);
    expect(g.sent.map((c) => c.id)).toEqual(["out"]);
    expect(g.done.map((c) => c.id)).toEqual(["fin", "old"]);
  });
});

describe("leaderboard", () => {
  it("ranks by minutes, then streak", () => {
    const r = rankFriends([
      { uid: "a", name: "Ada", code: "ADA-0001", totalMinutes: 50, streak: 1, wins: 0 },
      { uid: "b", name: "Bo", code: "BO-0002", totalMinutes: 120, streak: 2, wins: 1 },
      { uid: "c", name: "Cem", code: "CEM-0003", totalMinutes: 50, streak: 4, wins: 0 },
    ]);
    expect(r.map((f) => f.uid)).toEqual(["b", "c", "a"]);
  });
});
