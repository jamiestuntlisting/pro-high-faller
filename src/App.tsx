import { useState, useCallback } from 'react';
import type { HudSnapshot, LandingResult as LandingResultType } from './types';
import { getLevel } from './engine/LevelConfig';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { LandingResult } from './components/LandingResult';
import { StartScreen } from './components/StartScreen';
import { RetirementScreen } from './components/RetirementScreen';
import { NoWorkScreen } from './components/NoWorkScreen';
import { ShopScreen, type ShopItem } from './components/ShopScreen';

type Screen = 'briefing' | 'playing' | 'result' | 'shop' | 'retired' | 'no_work';

function getStartLevel(): number {
  const params = new URLSearchParams(window.location.search);
  const lvl = parseInt(params.get('level') || '1', 10);
  return isNaN(lvl) ? 1 : Math.max(1, lvl);
}

function App() {
  const [screen, setScreen] = useState<Screen>('briefing');
  const [currentLevel, setCurrentLevel] = useState(getStartLevel);
  const [hudData, setHudData] = useState<HudSnapshot | null>(null);
  const [landingResult, setLandingResult] = useState<LandingResultType | null>(null);

  // Career stats
  const [careerHealth, setCareerHealth] = useState(200);
  const [careerEarnings, setCareerEarnings] = useState(0);
  const [careerCredibility, setCareerCredibility] = useState(10);
  const [jobsCompleted, setJobsCompleted] = useState(0);

  // Shop item lifetime usage counts (keyed by item id)
  const [itemUses, setItemUses] = useState<Record<string, number>>({});

  // After the shop, should we advance to the next level or retry?
  const [afterShop, setAfterShop] = useState<'next' | 'retry'>('next');

  const level = getLevel(currentLevel);

  const handleStart = useCallback(() => {
    setHudData(null);
    setLandingResult(null);
    setScreen('playing');
  }, []);

  const handleHudUpdate = useCallback((snapshot: HudSnapshot) => {
    setHudData(snapshot);
  }, []);

  const handleLanding = useCallback(
    (result: LandingResultType) => {
      setLandingResult(result);
      const newHealth = Math.max(0, careerHealth - result.injuryPoints);
      setCareerHealth(newHealth);
      setCareerEarnings((prev) => prev + result.pay);
      setCareerCredibility((prev) => Math.max(0, prev + result.credibilityPoints));
      setJobsCompleted((prev) => prev + 1);
      if (newHealth <= 0) {
        setScreen('retired');
      } else {
        setScreen('result');
      }
    },
    [careerHealth],
  );

  const handleNextLevel = useCallback(() => {
    if (careerHealth <= 0) {
      setScreen('retired');
      return;
    }
    if (careerCredibility <= 0 && jobsCompleted > 0) {
      setScreen('no_work');
      return;
    }
    setCurrentLevel((prev) => prev === 40 ? 100 : prev + 1);
    setScreen('briefing');
  }, [careerHealth, careerCredibility, jobsCompleted]);

  const handleGoToShop = useCallback((fromPass: boolean) => {
    setAfterShop(fromPass ? 'next' : 'retry');
    setScreen('shop');
  }, []);

  const handleShopPurchase = useCallback((item: ShopItem) => {
    if (item.cost <= 0) return;
    setCareerEarnings((prev) => Math.max(0, prev - item.cost));
    setCareerHealth((prev) => Math.max(0, Math.min(200, prev + item.healthBonus)));
    setItemUses((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  }, []);

  const handleShopDone = useCallback(() => {
    if (afterShop === 'next') {
      setCurrentLevel((prev) => prev === 40 ? 100 : prev + 1);
    }
    setScreen('briefing');
  }, [afterShop]);

  const handleRetry = useCallback(() => {
    setHudData(null);
    setLandingResult(null);
    setScreen('playing');
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentLevel(1);
    setCareerHealth(200);
    setCareerEarnings(0);
    setCareerCredibility(10);
    setJobsCompleted(0);
    setItemUses({});
    setLandingResult(null);
    setHudData(null);
    setScreen('briefing');
  }, []);

  return (
    <div style={styles.wrapper}>
      {screen === 'briefing' && (
        <StartScreen
          level={level}
          onStart={handleStart}
        />
      )}

      {screen === 'playing' && (
        <div style={styles.gameContainer}>
          <GameCanvas
            level={level}
            careerHealth={careerHealth}
            careerEarnings={careerEarnings}
            jobsCompleted={jobsCompleted}
            onHudUpdate={handleHudUpdate}
            onLanding={handleLanding}
          />
          <HUD data={hudData} credibility={careerCredibility} />
        </div>
      )}

      {screen === 'result' && landingResult && (
        <div style={styles.gameContainer}>
          <LandingResult
            result={landingResult}
            careerCredibility={careerCredibility}
            careerHealth={careerHealth}
            onNextLevel={handleNextLevel}
            onRetry={handleRetry}
            onShop={handleGoToShop}
          />
        </div>
      )}

      {screen === 'shop' && (
        <ShopScreen
          careerHealth={careerHealth}
          careerEarnings={careerEarnings}
          careerCredibility={careerCredibility}
          itemUses={itemUses}
          onPurchase={handleShopPurchase}
          onSkip={handleShopDone}
        />
      )}

      {screen === 'retired' && (
        <RetirementScreen
          highestLevel={currentLevel}
          careerEarnings={careerEarnings}
          careerCredibility={careerCredibility}
          onRestart={handleRestart}
        />
      )}

      {screen === 'no_work' && (
        <NoWorkScreen
          highestLevel={currentLevel}
          careerEarnings={careerEarnings}
          careerCredibility={careerCredibility}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#0a0a1a',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
  },
  gameContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '768px',
    margin: '0 auto',
  },
};

export default App;
