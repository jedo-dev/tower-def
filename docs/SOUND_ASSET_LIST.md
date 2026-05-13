# Sound Asset Requirements

## Overview

This document lists all expected sound assets for the Tower Defense game, grouped by category. These assets are needed to complete the audio system implementation.

**Note**: No actual sound files are provided. This is a specification document for asset creation/import.

---

## UI Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `ui.click` | Button taps, menu selections | Clean, responsive click | 0.05-0.1s | `ui_click_01.wav` |
| `ui.hover` | Menu item hover feedback | Subtle, gentle | 0.03-0.05s | `ui_hover_01.wav` |
| `ui.open` | Opening panels/menus | Smooth whoosh/slide | 0.15-0.25s | `ui_open_01.wav` |
| `ui.close` | Closing panels/menus | Reverse of open | 0.15-0.25s | `ui_close_01.wav` |
| `ui.error` | Invalid actions, errors | Low, harsh buzz | 0.2-0.3s | `ui_error_01.wav` |
| `ui.success` | Successful actions | Bright, positive | 0.15-0.25s | `ui_success_01.wav` |
| `ui.build_select` | Selecting tower to build | Intentional selection | 0.1-0.15s | `ui_build_select_01.wav` |
| `ui.faction_select` | Selecting faction | Confirmation tone | 0.15-0.2s | `ui_faction_select_01.wav` |
| `ui.wave_start` | Starting a wave | Urgent, rallying | 0.3-0.5s | `ui_wave_start_01.wav` |
| `ui.wave_complete` | Wave completion | Victory fanfare | 0.4-0.6s | `ui_wave_complete_01.wav` |
| `ui.game_over` | Game over state | Somber, defeat | 0.8-1.2s | `ui_game_over_01.wav` |
| `ui.victory` | Victory state | Triumphant | 1.0-1.5s | `ui_victory_01.wav` |

---

## System Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `system.pause` | Pausing the game | Interruption | 0.1-0.2s | `system_pause_01.wav` |
| `system.unpause` | Resuming the game | Continuation | 0.1-0.2s | `system_unpause_01.wav` |
| `system.restart` | Restarting run | Reset confirmation | 0.2-0.3s | `system_restart_01.wav` |

---

## Economy Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `economy.gold_gain` | Receiving gold (kills) | Positive, coin-like | 0.15-0.25s | `economy_gold_gain_01.wav` |
| `economy.gold_spent` | Spending gold (build) | Transaction confirmation | 0.1-0.2s | `economy_gold_spent_01.wav` |
| `economy.refund` | Selling tower refund | Soft reversal | 0.15-0.25s | `economy_refund_01.wav` |
| `economy.life_lost` | Creep escapes | Negative, warning | 0.3-0.4s | `economy_life_lost_01.wav` |
| `economy.wave_reward` | Wave completion reward | Reward fanfare | 0.3-0.5s | `economy_wave_reward_01.wav` |

---

## Combat Sounds

### Tower Attacks

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.tower_attack.archer` | Archer tower fires | Sharp projectile | 0.15-0.3s | `combat_archer_attack_01.wav` |
| `combat.tower_attack.splash` | Splash/area tower fires | Impactful blast | 0.3-0.5s | `combat_splash_attack_01.wav` |

### Creep Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.creep_hit` | Creep takes damage | Impact feedback | 0.1-0.2s | `combat_creep_hit_01.wav` |
| `combat.creep_death.basic` | Basic creep dies | Death thud | 0.2-0.35s | `combat_creep_death_basic_01.wav` |
| `combat.creep_death.elite` | Elite creep dies | Heavier death | 0.3-0.5s | `combat_creep_death_elite_01.wav` |
| `combat.creep_escape` | Creep reaches exit | Failure warning | 0.25-0.4s | `combat_creep_escape_01.wav` |

### Build Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.invalid_build` | Invalid tower placement | Error rejection | 0.15-0.25s | `combat_invalid_build_01.wav` |
| `combat.successful_build` | Successful tower placement | Construction confirmation | 0.2-0.35s | `combat_successful_build_01.wav` |
| `combat.sell_tower` | Selling a tower | Dismantle sound | 0.2-0.3s | `combat_sell_tower_01.wav` |

---

## Ambient Sounds

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `ambient.map` | General map ambience | Atmospheric background | Loop | `ambient_map_01.wav` |
| `ambient.tension` | Tension during waves | Building tension | Loop | `ambient_tension_01.wav` |
| `ambient.faction.undead` | Undead faction ambience | Dark, necromantic | Loop | `ambient_faction_undead_01.wav` |
| `ambient.faction.orc` | Orc faction ambience | Brutal, war-like | Loop | `ambient_faction_orc_01.wav` |
| `ambient.faction.human` | Human faction ambience | Orderly, disciplined | Loop | `ambient_faction_human_01.wav` |
| `ambient.faction.elf` | Elf faction ambience | Magical, natural | Loop | `ambient_faction_elf_01.wav` |

---

## Faction-Specific Tower Sounds

### Undead (Necromantic Identity)

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.tower_attack.archer.undead` | Undead archer fires | Cursed magical arrow | 0.2-0.35s | `undead_archer_attack_01.wav` |
| `combat.tower_attack.splash.undead` | Undead plague/spell | Necrotic burst | 0.3-0.5s | `undead_plague_attack_01.wav` |

### Orc (Brutal Identity)

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.tower_attack.archer.orc` | Orc archer fires | Heavy bow thunk | 0.2-0.35s | `orc_archer_attack_01.wav` |
| `combat.tower_attack.splash.orc` | Orc splash tower | War drum impact | 0.3-0.5s | `orc_splash_attack_01.wav` |

### Human (Disciplined Identity)

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.tower_attack.archer.human` | Human archer fires | Clean steel bow | 0.15-0.3s | `human_archer_attack_01.wav` |
| `combat.tower_attack.splash.human` | Human splash tower | Precision burst | 0.25-0.4s | `human_splash_attack_01.wav` |

### Elf (Magical Identity)

| Sound ID | Usage | Emotion | Duration | Filename |
|----------|-------|---------|----------|----------|
| `combat.tower_attack.archer.elf` | Elf archer fires | Mystical arrow | 0.2-0.35s | `elf_archer_attack_01.wav` |
| `combat.tower_attack.splash.elf` | Elf splash tower | Arcane explosion | 0.3-0.5s | `elf_splash_attack_01.wav` |

---

## Audio Specifications

### Technical Requirements

- **Format**: WAV (preferred) or OGG/MP3 fallback
- **Sample Rate**: 44.1kHz
- **Bit Depth**: 16-bit minimum, 24-bit preferred
- **Channels**: Mono for SFX, Stereo for ambient/music

### Volume Guidelines

| Category | Base Volume | Notes |
|----------|-------------|-------|
| UI | 0.25-0.35 | Clear but not overwhelming |
| Combat | 0.28-0.40 | Must cut through gameplay |
| Economy | 0.20-0.35 | Subtle feedback |
| Ambient | 0.12-0.18 | Background layer |
| System | 0.25-0.30 | Informational |

### Pitch Variation

All combat and UI sounds should have natural pitch variation (0.95-1.05) to prevent repetitive "machine-gun" effect.

### Cooldowns

| Sound | Cooldown | Reason |
|-------|----------|--------|
| Tower attacks | 150-300ms | Prevent audio spam |
| Creep hits | 80ms | Fast but not chaotic |
| Creep deaths | 100ms | Each death unique |
| UI clicks | 50ms | Rapid clicking support |

---

## Asset Structure

```
assets/
└── audio/
    ├── sfx/
    │   ├── ui/
    │   │   ├── ui_click_01.wav
    │   │   ├── ui_hover_01.wav
    │   │   └── ...
    │   ├── combat/
    │   │   ├── combat_archer_attack_01.wav
    │   │   ├── combat_creep_hit_01.wav
    │   │   └── ...
    │   ├── economy/
    │   │   ├── economy_gold_gain_01.wav
    │   │   └── ...
    │   └── system/
    │       ├── system_pause_01.wav
    │       └── ...
    └── ambient/
        ├── ambient_map_01.wav
        ├── ambient_tension_01.wav
        └── faction/
            ├── ambient_faction_undead_01.wav
            ├── ambient_faction_orc_01.wav
            ├── ambient_faction_human_01.wav
            └── ambient_faction_elf_01.wav
```

---

## Implementation Notes

1. **Faction Routing**: The audio system routes sounds based on `selectedFaction`. If a faction-specific variant exists, it plays; otherwise, falls back to default.

2. **Throttling**: The system prevents audio spam by tracking cooldowns and limiting simultaneous sounds per category.

3. **Mobile**: Audio is locked until first user interaction to comply with browser autoplay policies.

4. **Spatial Audio**: Optional spatial positioning can be enabled for creep sounds based on their grid position.
