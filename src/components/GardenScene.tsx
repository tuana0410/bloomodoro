import { GARDEN_SIZE, findFlower, growthPercent, type Plot } from "../lib/garden";
import { FlowerArt } from "./FlowerArt";

interface Props {
  garden: Plot[];
  selected: string | null;
  onSelect: (plotId: string | null) => void;
}

// Three rows of soil, back to front. Rows further back are drawn smaller for depth.
const ROWS = [
  { y: 150, scale: 0.72, xs: [95, 180, 265] },
  { y: 195, scale: 0.86, xs: [80, 180, 280] },
  { y: 248, scale: 1, xs: [62, 180, 298] },
];
const SPOTS = ROWS.flatMap((row) => row.xs.map((x) => ({ x, y: row.y, scale: row.scale })));
const BASE = 86; // flower drawing size at scale 1

/** The garden as a little scene: sky, fence, grass and soil, with flowers planted in the ground. */
export function GardenScene({ garden, selected, onSelect }: Props) {
  return (
    <svg className="garden-scene" viewBox="0 0 360 280" role="group" aria-label="Your garden">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3f2" />
          <stop offset="1" stopColor="#fff3d6" />
        </linearGradient>
      </defs>

      {/* Sky, sun and clouds */}
      <rect width="360" height="280" fill="url(#sky)" />
      <circle cx="300" cy="42" r="20" fill="#f7b538" stroke="#1d1b1b" strokeWidth="2" />
      <g fill="#fffdf7" stroke="#1d1b1b" strokeWidth="1.8">
        <path d="M40 48 q4 -14 18 -10 q8 -10 20 0 q12 0 10 10 Z" />
        <path d="M170 30 q3 -10 14 -8 q6 -8 15 0 q9 0 8 8 Z" />
      </g>

      {/* Fence */}
      <g fill="#fffdf7" stroke="#1d1b1b" strokeWidth="1.8">
        <rect x="0" y="96" width="360" height="6" />
        <rect x="0" y="112" width="360" height="6" />
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M${6 + i * 28} 124 v-38 l7 -7 l7 7 v38 Z`} />
        ))}
      </g>

      {/* Grass and soil beds */}
      <rect y="120" width="360" height="160" fill="#9fd486" />
      <g fill="#a7714c" stroke="#1d1b1b" strokeWidth="2">
        <rect x="40" y="136" width="280" height="24" rx="12" />
        <rect x="26" y="180" width="308" height="28" rx="14" />
        <rect x="10" y="230" width="340" height="32" rx="16" />
      </g>

      {SPOTS.slice(0, GARDEN_SIZE).map((spot, i) => {
        const plot = garden[i];
        const size = BASE * spot.scale;
        const x = spot.x - size / 2;
        const y = spot.y - size * (52 / 72); // the drawing's ground line sits on the soil

        if (!plot) {
          return (
            <ellipse key={`empty-${i}`} cx={spot.x} cy={spot.y} rx={14 * spot.scale} ry={4 * spot.scale}
              fill="#8a5a3b" stroke="#1d1b1b" strokeWidth="1.5" strokeDasharray="3 3" />
          );
        }

        const flower = findFlower(plot.flowerId);
        if (!flower) return null;
        const percent = growthPercent(plot);
        const isSelected = selected === plot.id;
        const label = `${flower.name}, ${percent >= 100 ? "in bloom" : `${percent}% grown`}`;

        return (
          <g
            key={plot.id}
            className={`garden-plant${isSelected ? " is-selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : plot.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(isSelected ? null : plot.id);
              }
            }}
          >
            <FlowerArt flower={flower} percent={percent} size={size} inGround x={x} y={y} />
            <ellipse className="select-ring" cx={spot.x} cy={spot.y} rx={24 * spot.scale} ry={8 * spot.scale} />
          </g>
        );
      })}
    </svg>
  );
}
