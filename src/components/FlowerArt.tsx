import type { Flower } from "../lib/garden";

interface Props {
  flower: Flower;
  percent: number; // 0–100, how grown it is
  size?: number;
}

/** A flower in a pot. Below 100% it is a sprout that gets taller; at 100% it blooms. */
export function FlowerArt({ flower, percent, size = 72 }: Props) {
  const bloomed = percent >= 100;
  const stem = 10 + Math.round((percent / 100) * 22); // stem height grows with progress
  const top = 50 - stem;

  return (
    <svg width={size} height={size} viewBox="0 0 64 72" aria-hidden="true">
      <path d={`M32 50 V${top}`} stroke="#4f9a57" strokeWidth="3" strokeLinecap="round" />
      {percent >= 30 && <path d={`M32 ${top + stem * 0.55} q-9 -2 -11 -9 q8 0 11 7`} fill="#7cc576" stroke="#1d1b1b" strokeWidth="1.6" />}
      {percent >= 60 && <path d={`M32 ${top + stem * 0.35} q9 -2 11 -9 q-8 0 -11 7`} fill="#7cc576" stroke="#1d1b1b" strokeWidth="1.6" />}
      {bloomed ? (
        <g stroke="#1d1b1b" strokeWidth="1.6">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse key={angle} cx="32" cy={top - 7} rx="5" ry="8" fill={flower.petal} transform={`rotate(${angle} 32 ${top})`} />
          ))}
          <circle cx="32" cy={top} r="5" fill={flower.center} />
        </g>
      ) : (
        <circle cx="32" cy={top} r="4" fill="#7cc576" stroke="#1d1b1b" strokeWidth="1.6" />
      )}
      <path d="M18 50 h28 l-3 18 h-22 Z" className="pot-body" stroke="#1d1b1b" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="15" y="46" width="34" height="7" rx="2" className="pot-rim" stroke="#1d1b1b" strokeWidth="2.2" />
    </svg>
  );
}
