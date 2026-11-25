import type { ComponentType } from "react";
import { ChartIcon, FlowerIcon, FriendsIcon, SlidersIcon, TimerIcon } from "./Icons";

export type Tab = "focus" | "garden" | "friends" | "progress" | "settings";

const TABS: { id: Tab; label: string; Icon: ComponentType }[] = [
  { id: "focus", label: "Focus", Icon: TimerIcon },
  { id: "garden", label: "Garden", Icon: FlowerIcon },
  { id: "friends", label: "Friends", Icon: FriendsIcon },
  { id: "progress", label: "Progress", Icon: ChartIcon },
  { id: "settings", label: "Settings", Icon: SlidersIcon },
];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={tab === id ? "is-on" : ""}
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
