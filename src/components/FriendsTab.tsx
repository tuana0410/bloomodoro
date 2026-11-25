import { useState } from "react";
import type { SocialStatus } from "../hooks/useSocial";
import {
  CHALLENGE_PRESETS,
  checkFriendCode,
  groupChallenges,
  rankFriends,
  type Challenge,
  type FriendStats,
} from "../lib/friends";
import { addFriendByCode, sendChallenge, setChallengeStatus, type Profile } from "../lib/social";
import { FlameIcon, StarIcon } from "./Icons";

interface Props {
  status: SocialStatus;
  profile: Profile | null;
  friends: FriendStats[];
  challenges: Challenge[];
  now: number;
  activeChallengeId: string | null;
  busy: boolean; // a session is running
  onAccept: (challenge: Challenge) => void;
  onRetry: () => void;
}

const STATUS_TEXT: Record<Challenge["status"], string> = {
  pending: "waiting for an answer",
  accepted: "focusing now",
  declined: "declined",
  completed: "completed ✓",
  failed: "gave up",
};

export function FriendsTab({ status, profile, friends, challenges, now, activeChallengeId, busy, onAccept, onRetry }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [picking, setPicking] = useState<string | null>(null); // friend uid we're choosing minutes for
  const [working, setWorking] = useState(false);

  if (status === "off") {
    return (
      <div className="tab friends-tab">
        <h2 className="tab-title">Friends</h2>
        <section className="card">
          <h3 className="card-title">Friends are not switched on yet</h3>
          <p className="muted">
            This copy of FocusFlow has no Firebase keys. Add them as described in the README ("Friends setup") and
            this tab will give you a friend code.
          </p>
        </section>
      </div>
    );
  }

  if (status !== "ready" || !profile) {
    return (
      <div className="tab friends-tab">
        <h2 className="tab-title">Friends</h2>
        <section className="card">
          {status === "error" ? (
            <>
              <h3 className="card-title">Could not connect</h3>
              <p className="muted">Check your internet connection. Your timer and garden still work offline.</p>
              <button type="button" className="btn" onClick={onRetry}>Try again</button>
            </>
          ) : (
            <p className="muted">Connecting…</p>
          )}
        </section>
      </div>
    );
  }

  const me = profile;
  const ranked = rankFriends(friends);
  const groups = groupChallenges(challenges, me.uid, now);
  const nameOf = (uid: string) => friends.find((f) => f.uid === uid)?.name;

  async function run(task: () => Promise<void>) {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const check = checkFriendCode(code, me.code, friends.map((f) => f.code));
    if (!check.ok) {
      setError(check.error);
      return;
    }
    run(async () => {
      const r = await addFriendByCode(me.uid, check.code);
      if (!r.ok) setError(r.error);
      else {
        setCode("");
        setMessage("Friend added! You can challenge them now.");
      }
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(me.code);
      setMessage("Code copied. Send it to a friend!");
    } catch {
      setMessage(`Your code is ${me.code}`);
    }
  }

  return (
    <div className="tab friends-tab">
      <h2 className="tab-title">Friends</h2>

      <section className="card code-card">
        <div>
          <h3 className="card-title">Your friend code</h3>
          <p className="muted">Share it so friends can add you.</p>
        </div>
        <button type="button" className="friend-code" onClick={copyCode} aria-label={`Copy your code ${me.code}`}>
          {me.code}
        </button>
      </section>

      <form className="card add-friend" onSubmit={handleAdd}>
        <label className="field-label" htmlFor="friend-code">Add a friend</label>
        <div className="add-row">
          <input
            id="friend-code"
            type="text"
            value={code}
            placeholder="KAAN-1234"
            autoCapitalize="characters"
            aria-invalid={error ? true : undefined}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className="btn" disabled={working}>Add</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && !error && <p className="form-ok" role="status">{message}</p>}
      </form>

      {groups.incoming.length > 0 && (
        <section className="card">
          <h3 className="card-title">Challenges for you</h3>
          <ul className="challenge-list">
            {groups.incoming.map((c) => (
              <li key={c.id}>
                <span>
                  <b>{nameOf(c.from) ?? c.fromName}</b> challenged you to <b>{c.minutes} min</b>
                </span>
                {c.status === "pending" ? (
                  <span className="row-actions">
                    <button
                      type="button"
                      className="btn small"
                      disabled={working || busy}
                      title={busy ? "Finish your current session first" : undefined}
                      onClick={() => run(async () => {
                        await setChallengeStatus(me.uid, c.id, "accepted");
                        onAccept(c);
                      })}
                    >
                      Accept
                    </button>
                    <button type="button" className="btn small plain" disabled={working}
                      onClick={() => run(() => setChallengeStatus(me.uid, c.id, "declined"))}>
                      Decline
                    </button>
                  </span>
                ) : activeChallengeId === c.id ? (
                  <span className="tag">in progress</span>
                ) : (
                  <button type="button" className="btn small" disabled={busy} onClick={() => onAccept(c)}>Start</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Leaderboard</h3>
        {ranked.length === 0 ? (
          <p className="muted">No friends yet. Add someone with their code above.</p>
        ) : (
          <ol className="leaderboard">
            {ranked.map((f, i) => (
              <li key={f.uid}>
                <span className="rank">{i + 1}</span>
                <span className="who">
                  <b>{f.name}</b>
                  <small>
                    {f.totalMinutes} min · <FlameIcon size={14} /> {f.streak} · <StarIcon size={14} /> {f.wins} wins
                  </small>
                </span>
                {picking === f.uid ? (
                  <span className="chips">
                    {CHALLENGE_PRESETS.map((m) => (
                      <button key={m} type="button" className="chip" disabled={working}
                        onClick={() => run(async () => {
                          await sendChallenge(me, f, m);
                          setPicking(null);
                          setMessage(`Challenge sent to ${f.name}: ${m} minutes.`);
                        })}>
                        {m}m
                      </button>
                    ))}
                    <button type="button" className="chip" onClick={() => setPicking(null)} aria-label="Cancel">×</button>
                  </span>
                ) : (
                  <button type="button" className="btn small" onClick={() => setPicking(f.uid)}>Challenge</button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {(groups.sent.length > 0 || groups.done.length > 0) && (
        <section className="card">
          <h3 className="card-title">Challenge history</h3>
          <ul className="challenge-list">
            {[...groups.sent, ...groups.done].map((c) => {
              const mine = c.from === me.uid;
              const other = mine ? nameOf(c.to) ?? c.toName : nameOf(c.from) ?? c.fromName;
              const status = c.status === "pending" && !groups.sent.includes(c) ? "expired" : STATUS_TEXT[c.status];
              return (
                <li key={c.id}>
                  <span>
                    {mine ? <>You → <b>{other}</b></> : <><b>{other}</b> → you</>} · {c.minutes} min
                  </span>
                  <span className={`tag ${c.status}`}>{status}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
