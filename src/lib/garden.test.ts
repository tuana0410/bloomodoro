import { describe, expect, it } from "vitest";
import { INITIAL_STATE, completeSession, startSession } from "./game";
import { FLOWERS, GARDEN_SIZE, buyFlower, digUp, growGarden, growthPercent, isBloomed, type Plot } from "./garden";

const plot = (flowerId: string, growth = 0): Plot => ({ id: flowerId + growth, flowerId, growth, plantedAt: 0 });

describe("flower catalog", () => {
  it("has unique flowers that cost more and take longer as you go down the list", () => {
    expect(new Set(FLOWERS.map((f) => f.id)).size).toBe(FLOWERS.length);
    for (let i = 1; i < FLOWERS.length; i++) {
      expect(FLOWERS[i].price).toBeGreaterThan(FLOWERS[i - 1].price);
      expect(FLOWERS[i].growMinutes).toBeGreaterThan(FLOWERS[i - 1].growMinutes);
    }
  });
});

describe("buyFlower", () => {
  it("takes the price and plants a seed", () => {
    const result = buyFlower(50, [], "daisy", 1000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.coins).toBe(30);
    expect(result.garden).toHaveLength(1);
    expect(result.garden[0]).toMatchObject({ flowerId: "daisy", growth: 0, plantedAt: 1000 });
  });

  it("refuses when coins are short, the garden is full or the flower is unknown", () => {
    expect(buyFlower(19, [], "daisy", 0)).toEqual({ ok: false, error: "You need 1 more coins." });
    const full = Array.from({ length: GARDEN_SIZE }, (_, i) => plot("daisy", i));
    expect(buyFlower(999, full, "daisy", 0).ok).toBe(false);
    expect(buyFlower(999, [], "cactus", 0).ok).toBe(false);
  });
});

describe("growGarden", () => {
  it("grows every unbloomed flower and reports the ones that bloom", () => {
    const { garden, bloomed } = growGarden([plot("daisy", 10), plot("rose", 0)], 15);
    expect(garden.map((p) => p.growth)).toEqual([25, 15]);
    expect(bloomed.map((f) => f.id)).toEqual(["daisy"]);
    expect(isBloomed(garden[0])).toBe(true);
    expect(growthPercent(garden[1])).toBe(10);
  });

  it("does not grow or re-report a flower that is already in bloom", () => {
    const { garden, bloomed } = growGarden([plot("daisy", 25)], 50);
    expect(garden[0].growth).toBe(25);
    expect(bloomed).toEqual([]);
  });
});

describe("digUp", () => {
  it("removes only the chosen pot", () => {
    expect(digUp([plot("daisy"), plot("tulip")], "daisy0").map((p) => p.flowerId)).toEqual(["tulip"]);
  });
});

describe("completeSession with a garden", () => {
  it("pays coins equal to the XP gained and grows the garden by the focused minutes", () => {
    const state = { ...INITIAL_STATE, coins: 5, garden: [plot("daisy", 0)] };
    const result = completeSession(state, startSession("Study", 25, 0));
    expect(result.state.coins).toBe(5 + result.gained);
    expect(result.state.garden[0].growth).toBe(25);
    expect(result.bloomed.map((f) => f.id)).toEqual(["daisy"]);
  });
});
