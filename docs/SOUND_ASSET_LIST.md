# Sound Assets

Every sound effect in the game is **our own**: it is synthesized from a recipe
by `npm run gen:sfx`. The only authored files are the two ambience loops.

| Kind | Source | Location |
| --- | --- | --- |
| Generated SFX (57 clips) | recipes in `src/shared/lib/sfx-synth/recipes/` | `public/assets/audio/sfx/{ui,system,economy,combat}/` |
| Ambience (2 loops) | authored, never regenerated | `public/assets/audio/sfx/ambient/` |

Which tower or creature plays which clip is decided by the sound profiles in
`src/content/audio/` (tower -> archetype -> race -> default). See "Sound
Profiles" in `docs/08-content-authoring.md`. Every sound id owns exactly one
file; a test fails if two ids share one.

## Format

- WAV, PCM 16-bit, mono, 22050 Hz.
- Normalized towards one loudness (RMS 0.2, peak ceiling 0.95), so registry
  volumes in `src/shared/lib/phaser/sound/registry/` are the real mix controls.
- Budget: all generated clips together stay under 1.5 MB (currently ~700 KB).
  The generator and a test both enforce it.

## Regenerating

```bash
npm run gen:sfx
```

The generator renders every recipe to the path its id is registered with,
deletes generated wav files no id points at, and prints duration and size per
clip. It is deterministic: the same recipe and seed give the same bytes on
every machine. `generatedSfx.node.test.ts` re-renders each recipe and compares
it with the committed file, so a recipe edit without regenerating fails the
suite.

## Palette

Dark fantasy around D minor: low-mid, soft attacks, short tails. Frequent cues
(hits, coins, attacks) are the shortest and quietest.

### UI

| Sound ID | What to listen for |
| --- | --- |
| `ui.click` | Short wooden tick. |
| `ui.hover` | Faint, very short upward blip. |
| `ui.open` | Rising breathy whoosh with a soft D-to-A glide. |
| `ui.close` | The same whoosh falling back down. |
| `ui.error` | Two low, beating buzz pulses. |
| `ui.success` | Two-note chime, D then A. |
| `ui.build_select` | Wooden knock with a low G tone. |
| `ui.faction_select` | Small gong strike with a chime on top. |
| `ui.wave_start` | War horn on D with a fifth and a drum hit. |
| `ui.wave_complete` | Rising D minor bell arpeggio with a short echo. |
| `ui.game_over` | Low gong and a descending A-F-D dirge (~1.2 s). |
| `ui.victory` | Brass D major fanfare ending on a held chord (~1.2 s). |

### System

| Sound ID | What to listen for |
| --- | --- |
| `system.pause` | Two soft blips stepping down. |
| `system.unpause` | Two soft blips stepping up. |
| `system.restart` | Falling whoosh landing on a thump. |

### Economy

| Sound ID | What to listen for |
| --- | --- |
| `economy.gold_gain` | Tiny double coin clink (every kill, kept quiet). |
| `economy.gold_spent` | Coin dropping into a pouch. |
| `economy.refund` | Two rising clinks with a light swish. |
| `economy.life_lost` | Heavy heartbeat thud under a dissonant low drone. |
| `economy.wave_reward` | Cascade of coins over a low bell. |

### Combat fallbacks and status effects

| Sound ID | What to listen for |
| --- | --- |
| `combat.attack.default` | Generic bow twang (any tower without a race sound). |
| `combat.impact.default` | Dull thud. |
| `combat.build` | Two stone knocks and a small chime. |
| `combat.sell` | Rattling crumble with a falling tone. |
| `combat.upgrade` | Rising three-bell shimmer with sparkle. |
| `combat.creep_hit` | Very short soft body thump, layered under impacts. |
| `combat.creep_death` | Low growl falling away. |
| `combat.creep_escape` | Two-tone low warning, A then F. |
| `combat.effect_applied.chill` | Icy high shimmer with frost crackle. |
| `combat.effect_applied.poison` | Wet hiss with little bubbles. |
| `combat.effect_applied.stun` | Dull concussive drop. |

### Undead - bony clicks and necrotic hiss

| Sound ID | What to listen for |
| --- | --- |
| `combat.attack.single.undead` | Bone click, dark twang, hissing tail. |
| `combat.attack.splash.undead` | Gloopy plague lob with a wobbling hiss. |
| `combat.attack.frost.undead` | Wyrm breath: cold airy rush over a low growl. |
| `combat.impact.undead` | Dry bone crack. |
| `combat.build.undead` | Rattle of bones over a low hum. |
| `combat.creep_death.undead` | Crumbling clicks and a hollow exhale. |

### Orc - thuds and drums

| Sound ID | What to listen for |
| --- | --- |
| `combat.attack.single.orc` | Spear whoosh ending in a heavy thunk. |
| `combat.attack.splash.orc` | Gritty fire roar over a deep drum. |
| `combat.attack.chain.orc` | Crackling lightning with a growling buzz. |
| `combat.attack.frost.orc` | Tar gloop: two wobbling low bubbles. |
| `combat.impact.orc` | War drum thud. |
| `combat.build.orc` | Double drum hit and a wood knock. |
| `combat.creep_death.orc` | Gritty grunt and a thud. |

### Human - steel, powder and glass

| Sound ID | What to listen for |
| --- | --- |
| `combat.attack.single.human` | Crisp crossbow snap with a metal click. |
| `combat.attack.splash.human` | Cannon boom. |
| `combat.attack.poison.human` | Glass flask pop and fizz. |
| `combat.impact.human` | Steel clang. |
| `combat.build.human` | Hammer on anvil, two strikes. |
| `combat.creep_death.human` | Armour clatter and a fall. |

### Elf - bowstrings, air and chimes

| Sound ID | What to listen for |
| --- | --- |
| `combat.attack.single.elf` | Soft bowstring with an airy swish. |
| `combat.attack.splash.elf` | Two airy chimes and a breath. |
| `combat.attack.frost.elf` | Glassy shimmering tones. |
| `combat.attack.poison.elf` | Thorny whip crack. |
| `combat.impact.elf` | Light chime tick. |
| `combat.build.elf` | Leaf rustle into two rising chimes. |
| `combat.creep_death.elf` | Soft sigh with a falling chime. |

### Ambience (authored)

| Sound ID | Usage | File |
| --- | --- | --- |
| `ambient.map` | Menu and map ambience loop | `ambient/ambient_map_01.wav` |
| `ambient.tension` | In-game tension loop | `ambient/ambient_tension_01.wav` |

## Recipes

A recipe is data: a seed and a list of layers. Each layer is an oscillator
(`sine`, `triangle`, `square`, `saw`, `fm`) or sample-and-hold `noise`, with an
ADSR envelope, optional pitch sweep, vibrato, tremolo, soft drive and
low/high/band-pass filters (sweepable). A recipe may add a feedback echo.
Types live in `src/shared/lib/sfx-synth/sfxRecipe.types.ts`; shorthands such
as `bell`, `thump` and `burst` in `recipes/recipeKit.ts`.

## Adding or changing a sound

1. Register the id in `SOUND_IDS` (`src/shared/types/sound-ids.ts`) and its
   clip in `src/shared/lib/phaser/sound/registry/`.
2. Add its recipe to the matching file in `src/shared/lib/sfx-synth/recipes/`
   (the recipe map is typed, so a missing recipe does not compile).
3. If a tower or creature should use it, point a sound profile at it.
4. Run `npm run gen:sfx`, listen, and commit the recipe and the wav together.

## Playback rules

- **Throttling**: each clip has a cooldown and each category a voice limit
  (`AUDIO_CONSTANTS`), so a splash on twenty creeps stays one cue.
- **Pitch variation**: combat clips vary slightly (about 6%) to avoid the
  machine-gun effect; stingers stay in key.
- **Mobile**: audio is locked until the first user interaction.
