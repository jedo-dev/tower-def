import { useState, useCallback } from 'react';
import { StartPage } from '../pages/start-page';
import { GameSetupPage } from '../pages/game-setup-page';
import { GamePage } from '../pages/game-page/GamePage';
import type { AppRoute, GameSetupConfig } from '../shared/config/game-setup';
import { setGameSetupConfig } from '../shared/lib/game-bridge/bridge';

export function App() {
  const [route, setRoute] = useState<AppRoute>('start');
  const [gameSetup, setGameSetup] = useState<GameSetupConfig | null>(null);

  const handleNavigate = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
  }, []);

  const handleStartGame = useCallback((config: GameSetupConfig) => {
    setGameSetupConfig(config);
    setGameSetup(config);
    setRoute('game');
  }, []);

  if (route === 'start') {
    return <StartPage onNavigate={handleNavigate} />;
  }

  if (route === 'setup') {
    return <GameSetupPage onStartGame={handleStartGame} onNavigate={handleNavigate} />;
  }

  if (route === 'game') {
    return <GamePage setup={gameSetup} />;
  }

  return <StartPage onNavigate={handleNavigate} />;
}
