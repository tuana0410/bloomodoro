// Garden rules: coins buy flowers, and flowers grow only while you focus.
// Like game.ts, everything here is a pure function.

export interface Flower {
  id: string;
  name: string;
  price: number; // coins
  growMinutes: number; // focused minutes until it blooms
  petal: string; // petal color
  center: string; // center color
}

export const FLOWERS: Flower[] = [
  { id: "daisy", name: "Daisy", price: 20, growMinutes: 25, petal: "#ffffff", center: "#f7b538" },
  { id: "tulip", name: "Tulip", price: 40, growMinutes: 50, petal: "#ef7a96", center: "#c4501d" },
  { id: "sunflower", name: "Sunflower", price: 60, growMinutes: 75, petal: "#f7b538", center: "#7a4a1d" },
  { id: "lavender", name: "Lavender", price: 80, growMinutes: 100, petal: "#a98be0", center: "#6f52b8" },
  { id: "rose", name: "Rose", price: 120, growMinutes: 150, petal: "#d9534f", center: "#9b2c2c" },
  { id: "lotus", name: "Lotus", price: 200, growMinutes: 240, petal: "#fbd3dd", center: "#f08a4b" },
];

export const GARDEN_SIZE = 9;

export interface Plot {
  id: string;
  flowerId: string;
  growth: number; // focused minutes since it was planted
  plantedAt: number;
}

export function findFlower(id: string): Flower | undefined {
  return FLOWERS.find((f) => f.id === id);
}

export function isBloomed(plot: Plot): boolean {
  const flower = findFlower(plot.flowerId);
  return flower !== undefined && plot.growth >= flower.growMinutes;
}

/** How far a plant is toward blooming (0–100). */
export function growthPercent(plot: Plot): number {
  const flower = findFlower(plot.flowerId);
  if (!flower) return 0;
  return Math.min(100, Math.round((plot.growth / flower.growMinutes) * 100));
}

export type BuyResult =
  | { ok: true; coins: number; garden: Plot[] }
  | { ok: false; error: string };

export function buyFlower(coins: number, garden: Plot[], flowerId: string, now: number): BuyResult {
  const flower = findFlower(flowerId);
  if (!flower) return { ok: false, error: "That flower is not in the shop." };
  if (garden.length >= GARDEN_SIZE) return { ok: false, error: "Your garden is full. Dig up a flower to make room." };
  if (coins < flower.price) return { ok: false, error: `You need ${flower.price - coins} more coins.` };
  const plot: Plot = { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, flowerId, growth: 0, plantedAt: now };
  return { ok: true, coins: coins - flower.price, garden: [...garden, plot] };
}

/** Every plant that is still growing gets the focused minutes. Returns the flowers that just bloomed. */
export function growGarden(garden: Plot[], minutes: number) {
  const bloomed: Flower[] = [];
  const next = garden.map((plot) => {
    const flower = findFlower(plot.flowerId);
    if (!flower || plot.growth >= flower.growMinutes) return plot;
    const growth = Math.min(plot.growth + minutes, flower.growMinutes);
    if (growth >= flower.growMinutes) bloomed.push(flower);
    return { ...plot, growth };
  });
  return { garden: next, bloomed };
}

export function digUp(garden: Plot[], plotId: string): Plot[] {
  return garden.filter((p) => p.id !== plotId);
}
