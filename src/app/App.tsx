import { useState, useCallback, useEffect, useRef } from 'react';
import { StartPage } from '../pages/start-page';
import { GameSetupPage } from '../pages/game-setup-page';
import { GamePage } from '../pages/game-page/GamePage';
import { SettingsPage } from '../pages/settings-page';
import type { AppRoute, GameSetupConfig } from '../shared/config/game-setup';
import { setGameSetupConfig } from '../shared/lib/game-bridge/bridge';
import type { SoundId } from '../shared/lib/phaser/sound/audio.types';

const UI_AUDIO_PATHS: Record<SoundId, string> = {
  'ui.click': '/assets/audio/sfx/ui/ui_click_01.wav',
  'ui.hover': '/assets/audio/sfx/ui/ui_hover_01.wav',
  'ui.open': '/assets/audio/sfx/ui/ui_open_01.wav',
  'ui.close': '/assets/audio/sfx/ui/ui_close_01.wav',
  'ui.error': '/assets/audio/sfx/ui/ui_error_01.wav',
  'ui.success': '/assets/audio/sfx/ui/ui_success_01.wav',
  'ui.build_select': '/assets/audio/sfx/ui/ui_build_select_01.wav',
  'ui.faction_select': '/assets/audio/sfx/ui/ui_faction_select_01.wav',
  'ui.wave_start': '/assets/audio/sfx/ui/ui_wave_start_01.wav',
  'ui.wave_complete': '/assets/audio/sfx/ui/ui_wave_complete_01.wav',
  'ui.game_over': '/assets/audio/sfx/ui/ui_game_over_01.wav',
  'ui.victory': '/assets/audio/sfx/ui/ui_victory_01.wav',
  'system.pause': '/assets/audio/sfx/system/system_pause_01.wav',
  'system.unpause': '/assets/audio/sfx/system/system_unpause_01.wav',
  'system.restart': '/assets/audio/sfx/system/system_restart_01.wav',
  'economy.gold_gain': '/assets/audio/sfx/economy/economy_gold_gain_01.wav',
  'economy.gold_spent': '/assets/audio/sfx/economy/economy_gold_spent_01.wav',
  'economy.refund': '/assets/audio/sfx/economy/economy_refund_01.wav',
  'economy.life_lost': '/assets/audio/sfx/economy/economy_life_lost_01.wav',
  'economy.wave_reward': '/assets/audio/sfx/economy/economy_wave_reward_01.wav',
  'combat.tower_attack.archer': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.tower_attack.archer.undead': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.tower_attack.archer.orc': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.tower_attack.archer.human': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.tower_attack.archer.elf': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.tower_attack.splash': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.tower_attack.splash.undead': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.tower_attack.splash.orc': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.tower_attack.splash.human': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.tower_attack.splash.elf': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.creep_hit': '/assets/audio/sfx/combat/combat_archer_attack_01.wav',
  'combat.creep_death.basic': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.creep_death.elite': '/assets/audio/sfx/combat/combat_splash_attack_01.wav',
  'combat.creep_escape': '/assets/audio/sfx/ui/ui_error_01.wav',
  'combat.invalid_build': '/assets/audio/sfx/ui/ui_error_01.wav',
  'combat.successful_build': '/assets/audio/sfx/ui/ui_success_01.wav',
  'combat.sell_tower': '/assets/audio/sfx/economy/economy_refund_01.wav',
  'ambient.map': '/assets/audio/sfx/ambient/ambient_map_01.wav',
  'ambient.tension': '/assets/audio/sfx/ambient/ambient_tension_01.wav',
  'ambient.faction.undead': '/assets/audio/sfx/ambient/ambient_map_01.wav',
  'ambient.faction.orc': '/assets/audio/sfx/ambient/ambient_map_01.wav',
  'ambient.faction.human': '/assets/audio/sfx/ambient/ambient_map_01.wav',
  'ambient.faction.elf': '/assets/audio/sfx/ambient/ambient_map_01.wav',
};

export function App() {
  const [route, setRoute] = useState<AppRoute>('start');
  const [gameSetup, setGameSetup] = useState<GameSetupConfig | null>(null);
  const [sfxVolume, setSfxVolume] = useState(0.2);
  const [ambientVolume, setAmbientVolume] = useState(0.15);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const routeRef = useRef<AppRoute>('start');
  const isUiAudioUnlockedRef = useRef(false);
  const lastHoverAtMsRef = useRef(0);

  const playUiSound = useCallback((soundId: SoundId, volume: number) => {
    if (!isUiAudioUnlockedRef.current) {
      return;
    }
    const path = UI_AUDIO_PATHS[soundId];
    if (!path) {
      return;
    }
    const audio = new Audio(path);
    audio.volume = volume * sfxVolume;
    void audio.play().catch(() => undefined);
  }, [sfxVolume]);

  const handleNavigate = useCallback((newRoute: AppRoute) => {
    setRoute(newRoute);
  }, []);

  const handleStartGame = useCallback((config: GameSetupConfig) => {
    setGameSetupConfig(config);
    setGameSetup(config);
    setRoute('game');
  }, []);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const ambient = new Audio('/assets/audio/sfx/ambient/ambient_map_01.wav');
    ambient.loop = true;
    ambient.volume = ambientVolume;
    ambient.preload = 'auto';
    ambientRef.current = ambient;

    const unlockAudio = () => {
      if (isUiAudioUnlockedRef.current) {
        return;
      }
      isUiAudioUnlockedRef.current = true;
      if (routeRef.current === 'start' || routeRef.current === 'setup' || routeRef.current === 'settings') {
        void ambient.play().catch(() => undefined);
      }
    };

    const onPointerDown = () => unlockAudio();
    const onKeyDown = () => unlockAudio();

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      ambient.pause();
      ambient.currentTime = 0;
      ambientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ambientRef.current) {
      ambientRef.current.volume = ambientVolume;
    }
  }, [ambientVolume]);

  useEffect(() => {
    const ambient = ambientRef.current;
    if (!ambient || !isUiAudioUnlockedRef.current) {
      return;
    }

    if (route === 'start' || route === 'setup' || route === 'settings') {
      void ambient.play().catch(() => undefined);
      return;
    }

    const initialVolume = ambient.volume;
    const fadeMs = 220;
    const stepMs = 20;
    const steps = Math.max(1, Math.floor(fadeMs / stepMs));
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      const next = Math.max(0, initialVolume * (1 - step / steps));
      ambient.volume = next;
      if (step >= steps) {
        window.clearInterval(timer);
        ambient.pause();
        ambient.currentTime = 0;
        ambient.volume = initialVolume;
      }
    }, stepMs);

    return () => {
      window.clearInterval(timer);
    };
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
    return <GamePage setup={gameSetup} />;
  }

  if (route === 'settings') {
    return (
      <SettingsPage
        onNavigate={handleNavigate}
        sfxVolume={sfxVolume}
        ambientVolume={ambientVolume}
        onSfxVolumeChange={setSfxVolume}
        onAmbientVolumeChange={setAmbientVolume}
      />
    );
  }

  return <StartPage onNavigate={handleNavigate} />;
}
