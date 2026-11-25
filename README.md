# Bloomodoro

Bloomodoro (bloom + pomodoro) is a focus timer that works like a small game. Each session you finish gives you XP and coins and grows a plant in a pot with a face; if you give up halfway, the plant gets sad. Coins buy flowers for a garden that only grows while you focus.

**Live demo:** https://focusflow-omega-teal.vercel.app

![Focus screen with a running timer, and the progress screen with a weekly chart and activity map](docs/screenshot.png)

## The problem

A plain timer makes it easy to put off a study session or stop it early. Bloomodoro gives finishing a reward you can see and makes quitting cost a little.

## How it works

**Focus**
- Write what you're working on and pick 15, 25 or 50 minutes, or type your own (1–120).
- Finish the session to earn **1 XP per minute**.
- Finishing sessions back to back builds a **combo**: each one adds 0.25x, up to 2x.
- The plant grows through six stages: seed, sprout, sapling, young plant, in bloom, tree.
- **Giving up** gives no XP, resets the combo and makes the plant sad until you finish the next session.
- A row of leaves shows how many sessions you finished today against your daily goal.

**Garden**
- Every finished session also pays **coins**, the same amount as the XP you earned.
- Spend coins in the flower shop: six flowers, from a daisy (20 coins, blooms after 25 min of focus) to a lotus (200 coins, 240 min).
- Flowers only grow while you focus. Each finished session adds its minutes to every flower that hasn't bloomed yet.
- The garden has 9 pots; dig up a flower to make room for a new one.

**Friends**
- Everyone gets a friend code like `TUANA-4821` the first time they open the tab. No sign-up, no password.
- Type a friend's code to add each other: you both appear in each other's list.
- A small leaderboard shows each friend's total focus minutes, streak and challenge wins.
- **Challenge** a friend to 15, 25 or 50 minutes. They accept (or decline), the session starts with the challenge length, and when they finish you see "completed ✓". Giving up marks it as "gave up".

**Progress**
- Total focused minutes, current streak and best streak
- Minutes per day for the last 7 days
- An activity map of the last 12 weeks
- Today's sessions, including the ones you gave up

**Settings**
- Your name for the greeting, daily goal (1–8 sessions), sound on/off, reset progress

Progress is saved in your browser (`localStorage`). Only the Friends tab uses a server (Firebase): it stores your name, friend code, total minutes, streak and challenges, nothing else. Without Firebase keys the rest of the app works the same.

The timer stores the end time instead of counting seconds, so it stays correct when the tab is in the background or the page is reloaded. Wrong input (empty, letters, decimals, 0, over 120) shows a message instead of starting, and broken saved data is ignored instead of crashing the app.

## Tech

- React 19 + TypeScript, built with Vite
- Plain CSS; the plant and icons are hand-written SVG
- Firebase (anonymous sign-in + Firestore) for friends and challenges
- Vitest for the game, garden and friend rules
- Deployed on Vercel

## Project structure

```
src/
  lib/game.ts             game rules: XP, combo, streak, stages, input checks
  lib/game.test.ts        tests for the rules
  lib/garden.ts           flower shop and garden rules: buying, growing, blooming
  lib/garden.test.ts      tests for the garden
  lib/storage.ts          save/load with checks for broken data
  lib/friends.ts          friend codes, challenge rules, leaderboard order
  lib/friends.test.ts     tests for the friend rules
  lib/social.ts           Firebase: profile, adding friends, live challenges
  hooks/useSocial.ts      connects once and keeps friends/challenges live
  hooks/useNow.ts         clock that ticks while a session runs
  components/
    FocusTab.tsx          plant card, daily goal, timer
    PlantMascot.tsx       the plant drawing for each stage
    SessionSetup.tsx      form to start a session
    Timer.tsx             running session with progress arc
    GardenTab.tsx         coins, garden pots and flower shop
    FlowerArt.tsx         a flower that sprouts, grows and blooms
    ProgressTab.tsx       stats, weekly chart, activity map
    FriendsTab.tsx        friend code, add friend, leaderboard, challenges
    SettingsTab.tsx       name, goal, sound, reset
    BottomNav.tsx         tab bar
  App.tsx                 state and saving, connects the tabs
```

## Run it locally

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # run the tests
npm run build   # production build in dist/
```

## Friends setup (Firebase)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (Analytics can stay off).
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (production mode, a region close to you).
4. **Firestore → Rules:** paste the contents of [`firestore.rules`](firestore.rules) and press **Publish**.
5. **Project settings → Your apps → Web (`</>`)**: register the app and copy `apiKey`, `authDomain`, `projectId`, `appId`.
6. Put them in `.env.local` (see `.env.example`) for local dev, and in **Vercel → Settings → Environment Variables** for the live app, then redeploy.

The Firebase web keys are not secrets; the rules in `firestore.rules` decide who can read and write what.

## Ideas for later

- Notification when a session ends while the tab is closed
- Short and long breaks between sessions
- Accounts, so the garden follows you to another device (friends already sync, the garden does not)

Made by [Tuana Metdar](https://tuana0410.github.io).
