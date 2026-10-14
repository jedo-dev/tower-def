import { useState, useCallback, useEffect, useRef } from 'react';
import { StartPage } from '../pages/start-page';
import { GameSetupPage } from '../pages/game-setup-page';
import { GamePage } from '../pages/game-page/GamePage';
import { SettingsPage } from '../pages/settings-page';
import type { AppRoute, GameSetupConfig } from '../shared/config/game-setup';
import { setGameSetupConfig } from '../shared/lib/game-bridge/bridge';
import { ErrorBoundary } from '../shared/ui/error-boundary';
import type { SoundId } from '../shared/lib/phaser/sound/audio.types';
import { SOUND_ASSET_PATHS } from '../shared/lib/phaser/sound/audio.constants';
import {
  DEFAULT_AMBIENT_VOLUME,
  DEFAULT_SFX_VOLUME,
  setAudioSettings,
} from '../shared/lib/audio/audioSettingsStore';
import { createAmbientFader, type AmbientFader } from '../shared/lib/audio/ambientFader';

function resolveUiAudioPath(soundId: SoundId): string | undefined {
  const assetPath = SOUND_ASSET_PATHS[soundId];
  return assetPath ? `/${assetPath}` : undefined;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>('start');
  const [gameSetup, setGameSetup] = useState<GameSetupConfig | null>(null);
  const [sfxVolume, setSfxVolume] = useState(DEFAULT_SFX_VOLUME);
  const [ambientVolume, setAmbientVolume] = useState(DEFAULT_AMBIENT_VOLUME);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ambientFaderRef = useRef<AmbientFader | null>(null);
  const ambientVolumeRef = useRef(ambientVolume);
  const routeRef = useRef<AppRoute>('start');
  const isUiAudioUnlockedRef = useRef(false);
  const lastHoverAtMsRef = useRef(0);

  const playUiSound = useCallback(
    (soundId: SoundId, volume: number) => {
      if (!isUiAudioUnlockedRef.current) {
        return;
      }
      const path = resolveUiAudioPath(soundId);
      if (!path) {
        return;
      }
      const audio = new Audio(path);
      audio.volume = volume * sfxVolume;
      void audio.play().catch(() => undefined);
    },
    [sfxVolume],
  );

  const handleNavigate = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
  }, []);

  const handleStartGame = useCallback((config: GameSetupConfig) => {
    setGameSetupConfig(config);
    setGameSetup(config);
    setRoute('game');
  }, []);

  const handleSfxVolumeChange = useCallback((volume: number) => {
    setSfxVolume(volume);
    setAudioSettings({ sfxVolume: volume });
  }, []);

  const handleAmbientVolumeChange = useCallback((volume: number) => {
    setAmbientVolume(volume);
    setAudioSettings({ ambientVolume: volume });
  }, []);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const ambient = new Audio('/assets/audio/sfx/ambient/ambient_map_01.wav');
    ambient.loop = true;
    ambient.volume = ambientVolumeRef.current;
    ambient.preload = 'auto';
    ambientRef.current = ambient;
    const ambientFader = createAmbientFader({ audio: ambient });
    ambientFaderRef.current = ambientFader;

    const unlockAudio = () => {
      if (isUiAudioUnlockedRef.current) {
        return;
      }
      isUiAudioUnlockedRef.current = true;
      if (
        routeRef.current === 'start' ||
        routeRef.current === 'setup' ||
        routeRef.current === 'settings'
      ) {
        ambientFader.play();
      }
    };

    const onPointerDown = () => unlockAudio();
    const onKeyDown = () => unlockAudio();

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      ambientFader.cancel();
      ambient.pause();
      ambient.currentTime = 0;
      ambientRef.current = null;
      ambientFaderRef.current = null;
    };
  }, []);

  useEffect(() => {
    ambientVolumeRef.current = ambientVolume;
    const ambient = ambientRef.current;
    if (ambient && !ambientFaderRef.current?.isFading()) {
      ambient.volume = ambientVolume;
    }
  }, [ambientVolume]);

  useEffect(() => {
    const ambientFader = ambientFaderRef.current;
    if (!ambientFader || !isUiAudioUnlockedRef.current) {
      return;
    }

    if (route === 'start' || route === 'setup' || route === 'settings') {
      ambientFader.play();
      return;
    }

    ambientFader.fadeOut();
  }, [route]);

  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest('button');
      if (!button || (button as HTMLButtonElement).disabled) {
        return;
      }
      const now = performance.now();
      if (now - lastHoverAtMsRef.current < 60) {
        return;
      }
      lastHoverAtMsRef.current = now;
      playUiSound('ui.hover', 0.12);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest('button');
      if (!button || (button as HTMLButtonElement).disabled) {
        return;
      }
      const mapped = button.getAttribute('data-sound') as SoundId | null;
      playUiSound(mapped ?? 'ui.click', mapped ? 0.22 : 0.2);
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('click', onClick, true);
    };
  }, [playUiSound]);

  if (route === 'start') {
    return <StartPage onNavigate={handleNavigate} />;
  }

  if (route === 'setup') {
    return <GameSetupPage onStartGame={handleStartGame} onNavigate={handleNavigate} />;
  }

  if (route === 'game') {
    return (
      <ErrorBoundary recoverLabel="Back to menu" onRecover={() => handleNavigate('start')}>
        <GamePage setup={gameSetup} onExit={() => handleNavigate('start')} />
      </ErrorBoundary>
    );
  }

  if (route === 'settings') {
    return (
      <SettingsPage
        onNavigate={handleNavigate}
        sfxVolume={sfxVolume}
        ambientVolume={ambientVolume}
        onSfxVolumeChange={handleSfxVolumeChange}
        onAmbientVolumeChange={handleAmbientVolumeChange}
      />
    );
  }

  return <StartPage onNavigate={handleNavigate} />;
}
