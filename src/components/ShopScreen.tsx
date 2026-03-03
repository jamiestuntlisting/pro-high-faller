import { useEffect, useState, useCallback } from 'react';

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  healthBonus: number;
  healthMin?: number;   // For random-range items (like Stem Cell)
  healthMax?: number;
  description: string;
  maxUses?: number;     // Lifetime uses per career (undefined = unlimited)
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'ice',       name: 'ICE PACK',         cost: 50,   healthBonus: 10, maxUses: 10, description: 'Bag of ice. Old school.' },
  { id: 'ibuprofen', name: 'IBUPROFEN',        cost: 100,  healthBonus: 20, maxUses: 8,  description: 'Take two and call me in the morning.' },
  { id: 'cortisone', name: 'CORTISONE SHOT',   cost: 300,  healthBonus: 40, maxUses: 5,  description: "The doc says it's fine. Probably." },
  { id: 'chiro',     name: 'CHIROPRACTOR',     cost: 500,  healthBonus: 30, maxUses: 4,  description: 'That crack was satisfying.' },
  { id: 'pt',        name: 'PHYSICAL THERAPY',  cost: 800,  healthBonus: 60, maxUses: 3,  description: 'Doing it the right way.' },
  { id: 'stemcell',  name: 'STEM CELL TREATMENT', cost: 3000, healthBonus: 0, healthMin: -10, healthMax: 120, description: 'Cutting edge. Results may vary... wildly.' },
];

interface Props {
  careerHealth: number;
  careerEarnings: number;
  careerCredibility: number;
  itemUses: Record<string, number>;
  onPurchase: (item: ShopItem) => void;
  onSkip: () => void;
}

export function ShopScreen({ careerHealth, careerEarnings, careerCredibility, itemUses, onPurchase, onSkip }: Props) {
  // Require SPACE to be released before accepting it — prevents the keypress
  // that opened the shop (from the result screen) from immediately skipping it.
  const [spaceReleased, setSpaceReleased] = useState(false);
  const [stemResult, setStemResult] = useState<number | null>(null);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceReleased(true);
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceReleased) { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keyup', onUp);
    window.addEventListener('keydown', onDown);
    return () => {
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('keydown', onDown);
    };
  }, [onSkip, spaceReleased]);

  const handleBuy = useCallback((item: ShopItem) => {
    // Safety: double-check affordability
    if (careerEarnings < item.cost) return;

    setPurchased(true);
    if (item.healthMin !== undefined && item.healthMax !== undefined) {
      // Random-range item: roll the dice
      const roll = Math.floor(Math.random() * (item.healthMax - item.healthMin + 1)) + item.healthMin;
      setStemResult(roll);
      onPurchase({ ...item, healthBonus: roll });
    } else {
      onPurchase(item);
    }
  }, [careerEarnings, onPurchase]);

  const healthPct = Math.round((Math.max(0, careerHealth) / 200) * 100);

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h2 style={styles.title}>THE MORNING AFTER</h2>
        <div style={styles.subtitle}>Your body's been through hell.</div>

        {/* Health bar */}
        <div style={styles.healthSection}>
          <div style={styles.healthLabel}>
            <span>HEALTH</span>
            <span>{careerHealth}/200</span>
          </div>
          <div style={styles.healthBarOuter}>
            <div
              style={{
                ...styles.healthBarInner,
                width: `${healthPct}%`,
                background: careerHealth > 100 ? '#44aa44' : careerHealth > 50 ? '#aaaa44' : '#aa4444',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={styles.statsRow}>
          <span>CASH: <span style={{ color: '#FFD700' }}>${careerEarnings.toLocaleString()}</span></span>
          <span>CRED: {careerCredibility}</span>
        </div>

        {/* Stem cell result flash */}
        {stemResult !== null && (
          <div style={{
            ...styles.stemResult,
            color: stemResult >= 0 ? '#44aa44' : '#aa4444',
          }}>
            STEM CELL RESULT: {stemResult >= 0 ? '+' : ''}{stemResult} HP
            {stemResult >= 80 ? ' — MIRACLE!' : stemResult >= 40 ? ' — NOT BAD!' : stemResult >= 0 ? '' : ' — REJECTION!'}
          </div>
        )}

        {/* Items */}
        <div style={styles.itemList}>
          {SHOP_ITEMS.map((item) => {
            const canAfford = careerEarnings >= item.cost;
            const healthFull = careerHealth >= 200;
            const isRandom = item.healthMin !== undefined && item.healthMax !== undefined;
            const used = itemUses[item.id] || 0;
            const usedUp = item.maxUses !== undefined && used >= item.maxUses;
            // Random items can always be used (might lose HP), fixed items disabled when full
            const disabled = !canAfford || usedUp || (!isRandom && healthFull);
            const remaining = item.maxUses !== undefined ? item.maxUses - used : undefined;
            return (
              <div key={item.id} style={{ ...styles.itemRow, opacity: disabled ? 0.4 : 1 }}>
                <div style={styles.itemTop}>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemCost}>${item.cost.toLocaleString()}</span>
                </div>
                <div style={styles.itemBottom}>
                  <span style={styles.itemDesc}>{item.description}</span>
                  <div style={styles.itemEffects}>
                    {isRandom ? (
                      <span style={{ color: '#cc88ff' }}>{item.healthMin} to +{item.healthMax}HP</span>
                    ) : (
                      <span style={{ color: '#44aa44' }}>+{item.healthBonus}HP</span>
                    )}
                  </div>
                </div>
                {/* Remaining uses indicator */}
                <div style={styles.usesLabel}>
                  {remaining !== undefined ? (
                    <span style={{ color: usedUp ? '#aa4444' : remaining <= 2 ? '#aaaa44' : '#666' }}>
                      {usedUp ? 'USED UP' : `${remaining} left`}
                    </span>
                  ) : (
                    <span style={{ color: '#666' }}>∞</span>
                  )}
                </div>
                <button
                  style={{
                    ...styles.buyBtn,
                    cursor: disabled ? 'default' : 'pointer',
                    borderColor: disabled ? '#333' : isRandom ? '#cc88ff' : '#44aa44',
                    color: disabled ? '#333' : isRandom ? '#cc88ff' : '#44aa44',
                  }}
                  onClick={() => !disabled && handleBuy(item)}
                  disabled={disabled}
                >
                  BUY
                </button>
              </div>
            );
          })}
        </div>

        <button style={styles.skipBtn} onClick={onSkip}>
          {purchased ? "LET'S DO THIS THING →" : 'TOUGH IT OUT →'}
        </button>
      </div>
    </div>
  );
}

const mono = '"Courier New", "Consolas", monospace';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.9)',
    fontFamily: mono,
    color: '#cccccc',
    zIndex: 10,
    overflow: 'auto',
  },
  panel: {
    background: '#111111',
    border: '2px solid #44aa44',
    padding: '20px',
    maxWidth: '360px',
    width: '90%',
    textAlign: 'center',
  },
  title: {
    fontSize: '18px',
    color: '#44aa44',
    margin: '0 0 4px 0',
    fontFamily: mono,
  },
  subtitle: {
    fontSize: '10px',
    color: '#888',
    marginBottom: '14px',
  },
  healthSection: {
    marginBottom: '10px',
  },
  healthLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '8px',
    color: '#888',
    marginBottom: '4px',
  },
  healthBarOuter: {
    height: '8px',
    background: '#222',
    border: '1px solid #333',
  },
  healthBarInner: {
    height: '100%',
    transition: 'width 0.3s',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9px',
    color: '#aaa',
    marginBottom: '14px',
    padding: '0 4px',
  },
  stemResult: {
    fontSize: '10px',
    marginBottom: '10px',
    padding: '6px',
    background: '#1a1a2a',
    border: '1px solid #555',
    letterSpacing: '1px',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '14px',
  },
  itemRow: {
    background: '#1a1a1a',
    border: '1px solid #333',
    padding: '8px',
    textAlign: 'left',
    position: 'relative',
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    paddingRight: '50px',
  },
  itemName: {
    fontSize: '9px',
    color: '#ddd',
    fontWeight: 'bold',
  },
  itemCost: {
    fontSize: '9px',
    color: '#FFD700',
  },
  itemBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemDesc: {
    fontSize: '7px',
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
    paddingRight: '8px',
  },
  itemEffects: {
    display: 'flex',
    gap: '8px',
    fontSize: '8px',
    whiteSpace: 'nowrap',
  },
  usesLabel: {
    position: 'absolute',
    bottom: '6px',
    right: '8px',
    fontSize: '7px',
    fontStyle: 'italic',
  },
  buyBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontFamily: mono,
    fontSize: '8px',
    padding: '2px 8px',
    background: 'transparent',
    border: '1px solid #44aa44',
    color: '#44aa44',
    cursor: 'pointer',
  },
  skipBtn: {
    fontFamily: mono,
    fontSize: '11px',
    padding: '10px 18px',
    background: '#1a1a1a',
    color: '#888',
    border: '1px solid #555',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
};
