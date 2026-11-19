import { useState } from "react";
import { FLOWERS, GARDEN_SIZE, findFlower, growthPercent, isBloomed, type Plot } from "../lib/garden";
import { CoinIcon } from "./Icons";
import { FlowerArt } from "./FlowerArt";

interface Props {
  coins: number;
  garden: Plot[];
  onBuy: (flowerId: string) => void;
  onDigUp: (plotId: string) => void;
}

export function GardenTab({ coins, garden, onBuy, onDigUp }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);
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

      <section className="card">
        <h3 className="card-title">Garden</h3>
        {garden.length === 0 ? (
          <p className="muted">Your garden is empty. Buy a flower from the shop below to plant it.</p>
        ) : (
          <ul className="plots">
            {garden.map((plot) => {
              const flower = findFlower(plot.flowerId);
              if (!flower) return null;
              const percent = growthPercent(plot);
              const left = flower.growMinutes - plot.growth;
              return (
                <li key={plot.id} className={`plot${percent >= 100 ? " is-bloomed" : ""}`}>
                  <FlowerArt flower={flower} percent={percent} />
                  <b>{flower.name}</b>
                  {percent >= 100 ? (
                    <span className="plot-note">in bloom</span>
                  ) : (
                    <>
                      <div className="mini-bar" aria-hidden="true"><div style={{ width: `${percent}%` }} /></div>
                      <span className="plot-note">{left} min of focus left</span>
                    </>
                  )}
                  {confirming === plot.id ? (
                    <span className="plot-actions">
                      <button type="button" className="link-btn danger" onClick={() => { onDigUp(plot.id); setConfirming(null); }}>
                        Dig up
                      </button>
                      <button type="button" className="link-btn" onClick={() => setConfirming(null)}>Keep</button>
                    </span>
                  ) : (
                    <button type="button" className="link-btn" onClick={() => setConfirming(plot.id)} aria-label={`Dig up ${flower.name}`}>
                      dig up
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
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
