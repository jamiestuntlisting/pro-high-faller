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
  // Each tier is 20%+ better HP/$ than the previous — saving up pays off
  { id: 'ice',       name: 'ICE PACK',         cost: 60,   healthBonus: 10, maxUses: 10, description: 'Bag of ice. Old school.' },           // 0.167 HP/$
  { id: 'ibuprofen', name: 'IBUPROFEN',        cost: 100,  healthBonus: 20, maxUses: 8,  description: 'Take two and call me in the morning.' }, // 0.200 HP/$ (+20%)
  { id: 'cortisone', name: 'CORTISONE SHOT',   cost: 200,  healthBonus: 50, maxUses: 5,  description: "The doc says it's fine. Probably." },  // 0.250 HP/$ (+25%)
  { id: 'chiro',     name: 'CHIROPRACTOR',     cost: 350,  healthBonus: 110, maxUses: 4, description: 'That crack was satisfying.' },         // 0.314 HP/$ (+26%)
  { id: 'pt',        name: 'PHYSICAL THERAPY',  cost: 500,  healthBonus: 200, maxUses: 3, description: 'Doing it the right way.' },            // 0.400 HP/$ (+27%)
  { id: 'stemcell',  name: 'STEM CELL TREATMENT', cost: 3000, healthBonus: 0, healthMin: -10, healthMax: 120, description: 'Cutting edge. Results may vary... wildly.' },
];

/** Stem cells degrade with each use — initially great, then body starts rejecting */
function getStemCellRange(uses: number): { min: number; max: number } {
  const decay = Math.min(uses, 5) * 20;
  return { min: -10 - decay, max: 120 - decay };
}

function getDepletedQuip(itemId: string): string {
  switch (itemId) {
    case 'ice': return "You've iced everything iceable";
    case 'ibuprofen': return "Your liver filed a complaint";
    case 'cortisone': return "Doc says no more. He means it.";
    case 'chiro': return "Your spine filed a restraining order";
    case 'pt': return "PT can't fix what you got, buddy";
    default: return 'ALL GONE';
  }
}

interface Props {
  careerHealth: number;
  careerEarnings: number;
  careerCredibility: number;
  itemUses: Record<string, number>;
  onPurchase: (item: ShopItem) => void;
  onSkip: () => void;
}

export function ShopScreen({ careerHealth, careerEarnings, careerCredibility, itemUses, onPurchase, onSkip }: Props) {
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
    if (careerEarnings < item.cost) return;

    setPurchased(true);
    if (item.healthMin !== undefined && item.healthMax !== undefined) {
      const used = itemUses[item.id] || 0;
      const { min, max } = getStemCellRange(used);
      const roll = Math.floor(Math.random() * (max - min + 1)) + min;
      setStemResult(roll);
      onPurchase({ ...item, healthBonus: roll });
    } else {
      onPurchase(item);
    }
  }, [careerEarnings, itemUses, onPurchase]);

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
            STEM CELL: {stemResult >= 0 ? '+' : ''}{stemResult} HP
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
            const disabled = !canAfford || usedUp || (!isRandom && healthFull);
            const remaining = item.maxUses !== undefined ? item.maxUses - used : undefined;

            // HP label
            let hpLabel: string;
            let hpColor: string;
            if (isRandom) {
              const { min, max } = getStemCellRange(used);
              hpLabel = `${min} to +${max} HP`;
              hpColor = max <= 40 ? '#aa4444' : '#cc88ff';
            } else {
              hpLabel = `+${item.healthBonus} HP`;
              hpColor = '#44aa44';
            }

            // Status label
            let statusText = '';
            let statusColor = '#666';
            if (usedUp) {
              statusText = getDepletedQuip(item.id);
              statusColor = '#aa4444';
            } else if (remaining !== undefined) {
              statusText = `${remaining} left`;
              statusColor = remaining <= 2 ? '#aaaa44' : '#666';
            } else if (isRandom) {
              const { max } = getStemCellRange(used);
              if (used === 0) { statusText = 'untested'; statusColor = '#cc88ff'; }
              else if (max <= 20) { statusText = 'body rejecting'; statusColor = '#aa4444'; }
              else if (max <= 60) { statusText = 'resistance building'; statusColor = '#aaaa44'; }
              else { statusText = `#${used + 1}`; statusColor = '#cc88ff'; }
            }

            return (
              <div key={item.id} style={{ ...styles.itemRow, opacity: disabled ? 0.4 : 1 }}>
                {/* Row 1: Name and cost */}
                <div style={styles.itemHeader}>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemCost}>${item.cost.toLocaleString()}</span>
                </div>
                {/* Row 2: Description */}
                <div style={styles.itemDesc}>{item.description}</div>
                {/* Row 3: HP bonus, status, buy button */}
                <div style={styles.itemFooter}>
                  <span style={{ color: hpColor, fontSize: '10px' }}>{hpLabel}</span>
                  <span style={{ color: statusColor, fontSize: '8px', fontStyle: 'italic', flex: 1, textAlign: 'center' }}>
                    {statusText}
                  </span>
                  <button
                    style={{
                      ...styles.buyBtn,
                      cursor: disabled ? 'default' : 'pointer',
                      borderColor: disabled ? '#333' : isRandom ? '#cc88ff' : '#ee8833',
                      color: disabled ? '#333' : isRandom ? '#cc88ff' : '#ee8833',
                    }}
                    onClick={() => !disabled && handleBuy(item)}
                    disabled={disabled}
                  >
                    BUY
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button style={styles.skipBtn} onClick={onSkip}>
          {purchased ? "LET'S GO →" : 'TOUGH IT OUT →'}
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
    fontSize: '9px',
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
    fontSize: '10px',
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
    padding: '10px',
    textAlign: 'left',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  itemName: {
    fontSize: '11px',
    color: '#ddd',
    fontWeight: 'bold',
  },
  itemCost: {
    fontSize: '11px',
    color: '#FFD700',
  },
  itemDesc: {
    fontSize: '8px',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: '6px',
  },
  itemFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  buyBtn: {
    fontFamily: mono,
    fontSize: '10px',
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #ee8833',
    color: '#ee8833',
    cursor: 'pointer',
    flexShrink: 0,
  },
  skipBtn: {
    fontFamily: mono,
    fontSize: '12px',
    padding: '10px 18px',
    background: '#1a1a1a',
    color: '#888',
    border: '1px solid #555',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
};
