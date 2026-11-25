import { useEffect, useState } from "react";
import type { Challenge, FriendStats } from "../lib/friends";
import { connect, isSocialConfigured, watchChallenges, watchFriends, type Profile } from "../lib/social";

export type SocialStatus = "off" | "connecting" | "ready" | "error";

/** Connects to Firebase once, then keeps friends and challenges up to date. */
export function useSocial(name: string) {
  const [status, setStatus] = useState<SocialStatus>(isSocialConfigured() ? "connecting" : "off");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendStats[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSocialConfigured()) return;
    let cancelled = false;
    setStatus("connecting");
    connect(name.trim() || "Focus")
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
    // Connect once per page load (or when "Try again" is pressed); the name only matters for a brand-new code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (!profile) return;
    const stopFriends = watchFriends(profile.uid, setFriends);
    const stopChallenges = watchChallenges(profile.uid, setChallenges);
    return () => {
      stopFriends();
      stopChallenges();
    };
  }, [profile]);

  return { status, profile, friends, challenges, retry: () => setAttempt((n) => n + 1) };
}
