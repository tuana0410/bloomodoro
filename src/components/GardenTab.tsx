import { useState } from "react";
import { FLOWERS, GARDEN_SIZE, findFlower, growthPercent, isBloomed, type Plot } from "../lib/garden";
import { CoinIcon } from "./Icons";
import { FlowerArt } from "./FlowerArt";
import { GardenScene } from "./GardenScene";

interface Props {
  coins: number;
  garden: Plot[];
  onBuy: (flowerId: string) => void;
  onDigUp: (plotId: string) => void;
}

export function GardenTab({ coins, garden, onBuy, onDigUp }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const selected = garden.find((p) => p.id === selectedId) ?? null;
  const selectedFlower = selected ? findFlower(selected.flowerId) : undefined;
  const selectedPercent = selected ? growthPercent(selected) : 0;
  const bloomed = garden.filter(isBloomed).length;
  const full = garden.length >= GARDEN_SIZE;

  return (
    <div className="tab garden-tab">
      <h2 className="tab-title">Your garden</h2>
      <p className="muted">
        Finish focus sessions to earn coins. Flowers only grow while you focus: every focused minute
        counts for every flower in your garden.
      </p>

      <div className="pills">
        <div className="pill mint">
          <b>{coins}</b>
          <span>coins</span>
        </div>
        <div className="pill pink">
          <b>{bloomed}</b>
          <span>in bloom</span>
        </div>
        <div className="pill dashed">
          <b>{garden.length}/{GARDEN_SIZE}</b>
          <span>pots used</span>
        </div>
      </div>

      <section className="card garden-card">
        <GardenScene garden={garden} selected={selected?.id ?? null} onSelect={(id) => { setSelectedId(id); setConfirming(false); }} />
        {garden.length === 0 ? (
          <p className="muted garden-hint">Your garden is empty. Buy a flower from the shop below to plant it.</p>
        ) : !selected || !selectedFlower ? (
          <p className="muted garden-hint">Tap a plant to see how it is doing.</p>
        ) : (
          <div className="plant-detail">
            <div>
              <b>{selectedFlower.name}</b>
              {selectedPercent >= 100 ? (
                <p className="muted">In bloom after {selectedFlower.growMinutes} min of focus.</p>
              ) : (
                <>
                  <div className="mini-bar" aria-hidden="true"><div style={{ width: `${selectedPercent}%` }} /></div>
                  <p className="muted">
                    {selected.growth} of {selectedFlower.growMinutes} min · {selectedFlower.growMinutes - selected.growth} min of focus left
                  </p>
                </>
              )}
            </div>
            {confirming ? (
              <span className="plot-actions">
                <button type="button" className="link-btn danger" onClick={() => { onDigUp(selected.id); setSelectedId(null); setConfirming(false); }}>
                  Dig up
                </button>
                <button type="button" className="link-btn" onClick={() => setConfirming(false)}>Keep</button>
              </span>
            ) : (
              <button type="button" className="link-btn" onClick={() => setConfirming(true)}>dig up</button>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Flower shop</h3>
        <ul className="shop">
          {FLOWERS.map((flower) => {
            const short = coins < flower.price;
            return (
              <li key={flower.id} className="shop-item">
                <FlowerArt flower={flower} percent={100} size={56} />
                <div className="shop-info">
                  <b>{flower.name}</b>
                  <span className="muted">blooms after {flower.growMinutes} min of focus</span>
                </div>
                <button
                  type="button"
                  className="btn buy"
                  disabled={short || full}
                  title={full ? "Your garden is full" : short ? `You need ${flower.price - coins} more coins` : undefined}
                  onClick={() => onBuy(flower.id)}
                >
                  <CoinIcon /> {flower.price}
                </button>
              </li>
            );
          })}
        </ul>
        {full && <p className="muted shop-note">Your garden is full. Dig up a flower to plant a new one.</p>}
      </section>
    </div>
  );
}
