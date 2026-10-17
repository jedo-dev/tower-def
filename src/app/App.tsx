import { useState, useCallback, useEffect, useRef } from 'react';
import { StartPage } from '../pages/start-page';
import { GameSetupPage } from '../pages/game-setup-page';
import { LazyGamePage, resetGamePageLoad } from '../pages/game-page';
import { SettingsPage } from '../pages/settings-page';
import { LazyBestiaryPage, resetBestiaryPageLoad } from '../pages/bestiary-page';
import type { AppRoute, GameSetupConfig } from '../shared/config/game-setup';
import { setGameSetupConfig } from '../shared/lib/game-bridge/bridge';
import { ErrorBoundary } from '../shared/ui/error-boundary';
import {
  resolveSoundClipUrl,
  SOUND_CLIPS,
  SoundCategory,
  type SoundId,
} from '../shared/lib/sound-registry';
import {
  getEffectiveAmbientVolume,
  hydrateAudioSettings,
  setAudioSettings,
  toggleAudioMuted,
} from '../shared/lib/audio/audioSettingsStore';
import { getBrowserAudioSettingsStorage } from '../shared/lib/audio/audioSettingsPersistence';
import { useAudioSettings } from '../shared/lib/audio/useAudioSettings';
import {
  hydrateControlSettings,
  setControlSettings,
} from '../shared/lib/control-settings/controlSettingsStore';
import { getBrowserControlSettingsStorage } from '../shared/lib/control-settings/controlSettingsPersistence';
import { useControlSettings } from '../shared/lib/control-settings/useControlSettings';
import {
  createAmbientFader,
  type AmbientFader,
  type FadeableAudio,
} from '../shared/lib/audio/ambientFader';
import {
  getMenuAmbientAudio,
  playMenuClip,
  prefetchMenuClips,
} from '../shared/lib/audio/menuAudio';

const MENU_CLIP_URLS: readonly string[] = (Object.keys(SOUND_CLIPS) as SoundId[])
  .filter((soundId) => SOUND_CLIPS[soundId].category === SoundCategory.UI)
  .map((soundId) => resolveSoundClipUrl(soundId));

/** Screens that share the menu ambience; the match fades it out. */
const MENU_ROUTES: ReadonlySet<AppRoute> = new Set<AppRoute>([
  'start',
  'setup',
  'settings',
  'bestiary',
]);

// Hydrate once per session, before the first render reads the store.
hydrateAudioSettings(getBrowserAudioSettingsStorage());
hydrateControlSettings(getBrowserControlSettingsStorage());

export function App() {
  const [route, setRoute] = useState<AppRoute>('start');
  const [gameSetup, setGameSetup] = useState<GameSetupConfig | null>(null);
  const { sfxVolume, ambientVolume, isMuted } = useAudioSettings();
  const { confirmPlacementWithSecondTap } = useControlSettings();
  const effectiveSfxVolume = isMuted ? 0 : sfxVolume;
  const effectiveAmbientVolume = isMuted ? 0 : ambientVolume;
  const ambientRef = useRef<FadeableAudio | null>(null);
  const ambientFaderRef = useRef<AmbientFader | null>(null);
  const routeRef = useRef<AppRoute>('start');
  const isUiAudioUnlockedRef = useRef(false);
  const lastHoverAtMsRef = useRef(0);

  const playUiSound = useCallback(
    (soundId: SoundId, volume: number) => {
      if (!isUiAudioUnlockedRef.current) {
        return;
      }
      if (!(soundId in SOUND_CLIPS)) {
        return;
      }
      if (effectiveSfxVolume <= 0) {
        return;
      }
      playMenuClip(resolveSoundClipUrl(soundId), volume * effectiveSfxVolume);
    },
    [effectiveSfxVolume],
  );

  const handleNavigate = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
  }, []);

  const handleRecoverFromGameError = useCallback(() => {
    // A failed game-chunk download is retried on the next start.
    resetGamePageLoad();
    setRoute('start');
  }, []);

  const handleRecoverFromBestiaryError = useCallback(() => {
    resetBestiaryPageLoad();
    setRoute('start');
  }, []);

  const handleStartGame = useCallback((config: GameSetupConfig) => {
    setGameSetupConfig(config);
    setGameSetup(config);
    setRoute('game');
  }, []);

  const handleSfxVolumeChange = useCallback((volume: number) => {
    setAudioSettings({ sfxVolume: volume });
  }, []);

  const handleAmbientVolumeChange = useCallback((volume: number) => {
    setAudioSettings({ ambientVolume: volume });
  }, []);

  const handleMuteToggle = useCallback(() => {
    toggleAudioMuted();
  }, []);

  const handleConfirmPlacementChange = useCallback((enabled: boolean) => {
    setControlSettings({ confirmPlacementWithSecondTap: enabled });
  }, []);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    prefetchMenuClips(MENU_CLIP_URLS);
    const ambient = getMenuAmbientAudio(resolveSoundClipUrl('ambient.map'));
    ambient.volume = getEffectiveAmbientVolume();
    ambientRef.current = ambient;
    const ambientFader = createAmbientFader({ audio: ambient });
    ambientFaderRef.current = ambientFader;

    const unlockAudio = () => {
      if (isUiAudioUnlockedRef.current) {
        return;
      }
      isUiAudioUnlockedRef.current = true;
      if (MENU_ROUTES.has(routeRef.current)) {
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
    const ambient = ambientRef.current;
    if (ambient && !ambientFaderRef.current?.isFading()) {
      ambient.volume = effectiveAmbientVolume;
    }
  }, [effectiveAmbientVolume]);

  useEffect(() => {
    const ambientFader = ambientFaderRef.current;
    if (!ambientFader || !isUiAudioUnlockedRef.current) {
      return;
    }

    if (MENU_ROUTES.has(route)) {
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
      // A sound preview button plays its own clip; the generic click would
      // only smear over it.
      if (button.hasAttribute('data-sound-preview')) {
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
      <ErrorBoundary recoverLabel="Back to menu" onRecover={handleRecoverFromGameError}>
        <LazyGamePage setup={gameSetup} onExit={() => handleNavigate('start')} />
      </ErrorBoundary>
    );
  }

  if (route === 'bestiary') {
    return (
      <ErrorBoundary recoverLabel="Back to menu" onRecover={handleRecoverFromBestiaryError}>
        <LazyBestiaryPage onNavigate={handleNavigate} />
      </ErrorBoundary>
    );
  }

  if (route === 'settings') {
    return (
      <SettingsPage
        onNavigate={handleNavigate}
        sfxVolume={sfxVolume}
        ambientVolume={ambientVolume}
        isMuted={isMuted}
        onSfxVolumeChange={handleSfxVolumeChange}
        onAmbientVolumeChange={handleAmbientVolumeChange}
        onMuteToggle={handleMuteToggle}
        confirmPlacementWithSecondTap={confirmPlacementWithSecondTap}
        onConfirmPlacementChange={handleConfirmPlacementChange}
      />
    );
  }

  return <StartPage onNavigate={handleNavigate} />;
}
