import { useEffect, useRef, useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { FocusTab } from "./components/FocusTab";
import { FriendsTab } from "./components/FriendsTab";
import { GardenTab } from "./components/GardenTab";
import { CoinIcon, FlameIcon, StarIcon } from "./components/Icons";
import { ProgressTab } from "./components/ProgressTab";
import { SettingsTab } from "./components/SettingsTab";
import { useNow } from "./hooks/useNow";
import { useSocial } from "./hooks/useSocial";
import type { Challenge } from "./lib/friends";
import { publishStats, setChallengeStatus } from "./lib/social";
import { playChime } from "./lib/chime";
import { formatClock } from "./lib/format";
import { buyFlower, digUp, findFlower } from "./lib/garden";
import {
  INITIAL_STATE,
  STAGES,
  abandonSession,
  completeSession,
  stageProgress,
  startSession,
  visibleStreak,
  type ActiveSession,
  type GameState,
} from "./lib/game";
import {
  clearAll,
  loadActive,
  loadSettings,
  loadState,
  saveActive,
  saveSettings,
  saveState,
  type Settings,
} from "./lib/storage";

type Notice = { kind: "success" | "warn"; text: string };

export default function App() {
  const [game, setGame] = useState<GameState>(loadState);
  const [active, setActive] = useState<ActiveSession | null>(loadActive);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [tab, setTab] = useState<Tab>("focus");
  const [notice, setNotice] = useState<Notice | null>(null);
  const now = useNow(active !== null);
  const social = useSocial(settings.name);
  const myUid = social.profile?.uid ?? null;

  // Remembers which session was already finished, so it is never counted twice
  const finishedRef = useRef<number | null>(null);

  // Save to the browser whenever something changes
  useEffect(() => saveState(game), [game]);
  useEffect(() => saveActive(active), [active]);
  useEffect(() => saveSettings(settings), [settings]);

  // When the time is up, finish the session (also works after a page reload)
  useEffect(() => {
    if (!active || now < active.endsAt || finishedRef.current === active.startedAt) return;
    finishedRef.current = active.startedAt;

    const result = completeSession(game, active);
    setGame(result.state);
    setActive(null);
    if (settings.sound) playChime();
    const challengeDone = Boolean(active.challengeId && myUid);
    if (active.challengeId && myUid) setChallengeStatus(myUid, active.challengeId, "completed").catch(() => {});

    const stageName = STAGES[stageProgress(result.state.xp).index].name;
    const bloomed = result.bloomed.map((f) => f.name.toLowerCase());
    setNotice({
      kind: "success",
      text:
        `Session done: +${result.gained} XP and +${result.gained} coins.` +
        (result.grew ? ` Your plant grew into a ${stageName.toLowerCase()}!` : "") +
        (bloomed.length ? ` Now in bloom: ${[...new Set(bloomed)].join(", ")}.` : "") +
        (challengeDone ? " Challenge completed, your friend can see it!" : ""),
    });
  }, [now, active, game, settings.sound, myUid]);

  // Share name, total minutes and streak with friends whenever they change
  const totalMinutes = Object.values(game.daily).reduce((a, b) => a + b, 0);
  const streakNow = visibleStreak(game, now);
  const shownName = settings.name.trim();
  useEffect(() => {
    if (!myUid) return;
    publishStats(myUid, { name: shownName || "Friend", totalMinutes, streak: streakNow }).catch(() => {});
  }, [myUid, shownName, totalMinutes, streakNow]);

  // Show the countdown in the browser tab
  useEffect(() => {
    document.title = active
      ? `${formatClock(Math.min(active.endsAt - now, active.endsAt - active.startedAt))} · Bloomodoro`
      : "Bloomodoro";
  }, [active, now]);

  function handleStart(label: string, minutes: number) {
    setNotice(null);
    setActive(startSession(label, minutes, Date.now()));
  }

  function handleGiveUp() {
    if (!active) return;
    if (active.challengeId && myUid) setChallengeStatus(myUid, active.challengeId, "failed").catch(() => {});
    setGame(abandonSession(game, active, Date.now()));
    setActive(null);
    setNotice({ kind: "warn", text: "Session stopped and your plant is sad. Finish the next one to cheer it up." });
  }

  function handleAcceptChallenge(c: Challenge) {
    if (active) {
      setNotice({ kind: "warn", text: "Finish your current session first, then start the challenge." });
      return;
    }
    setNotice(null);
    setActive({ ...startSession(`Challenge from ${c.fromName || "a friend"}`, c.minutes, Date.now()), challengeId: c.id });
    setTab("focus");
  }

  function handleBuy(flowerId: string) {
    const result = buyFlower(game.coins, game.garden, flowerId, Date.now());
    if (!result.ok) {
      setNotice({ kind: "warn", text: result.error });
      return;
    }
    setGame({ ...game, coins: result.coins, garden: result.garden });
    setNotice({ kind: "success", text: `${findFlower(flowerId)?.name} planted. Focus to help it grow!` });
  }

  function handleDigUp(plotId: string) {
    setGame({ ...game, garden: digUp(game.garden, plotId) });
  }

  function handleReset() {
    clearAll();
    setGame(INITIAL_STATE);
    setActive(null);
    setNotice(null);
    setTab("focus");
  }

  const name = settings.name.trim();
  const date = new Date(now).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });

  return (
    <div className="stage">
      <div className="app">
        <header className="header">
          <div>
            <h1 className="hello">Hi{name ? `, ${name}` : " there"}!</h1>
            <p className="date">{date}</p>
          </div>
          <div className="badges">
            <span className="badge" title="Day streak">
              <FlameIcon /> {visibleStreak(game, now)}
            </span>
            <span className="badge" title="Coins">
              <CoinIcon /> {game.coins}
            </span>
            <span className="badge" title="Total XP">
              <StarIcon /> {game.xp} XP
            </span>
          </div>
        </header>

        {notice && (
          <div className={`notice ${notice.kind}`} role="status">
            <span>{notice.text}</span>
            <button type="button" className="notice-close" aria-label="Dismiss message" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}

        <main className="content">
          {tab === "focus" && (
            <FocusTab
              game={game}
              active={active}
              now={now}
              dailyGoal={settings.dailyGoal}
              onStart={handleStart}
              onGiveUp={handleGiveUp}
            />
          )}
          {tab === "garden" && (
            <GardenTab coins={game.coins} garden={game.garden} onBuy={handleBuy} onDigUp={handleDigUp} />
          )}
          {tab === "friends" && (
            <FriendsTab
              status={social.status}
              profile={social.profile}
              friends={social.friends}
              challenges={social.challenges}
              now={now}
              activeChallengeId={active?.challengeId ?? null}
              busy={active !== null}
              onAccept={handleAcceptChallenge}
              onRetry={social.retry}
            />
          )}
          {tab === "progress" && <ProgressTab game={game} now={now} />}
          {tab === "settings" && <SettingsTab settings={settings} onChange={setSettings} onReset={handleReset} />}
        </main>

        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </div>
  );
}
