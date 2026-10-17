# Sound Assets

Every sound effect in the game is **our own**: it is synthesized from a recipe
by `npm run gen:sfx`. The only authored files are the two ambience loops,
which `npm run encode:ambient` cuts and compresses from the full recordings.

| Kind | Source | Location |
| --- | --- | --- |
| Generated SFX (64 clips) | recipes in `src/shared/lib/sfx-synth/recipes/` | `public/assets/audio/sfx/{ui,system,economy,combat}/`, race clips under `combat/<race>/` |
| Ambience (2 loops) | recordings in `assets-src/audio/ambient/` (not shipped) | `public/assets/audio/sfx/ambient/` as `.ogg` + `.m4a` |

Which tower or creature plays which clip is decided by the sound profiles in
`src/content/audio/` (tower -> archetype -> race -> default, creature -> race
-> default) and by per-tower and per-creature `sounds` in their content. See
"Sound Profiles" in `docs/08-content-authoring.md`. Every sound id owns exactly one
file; a test fails if two ids share one.

## Format

- WAV, PCM 16-bit, mono, 22050 Hz.
- Normalized towards one loudness (RMS 0.2, peak ceiling 0.95), so registry
  volumes in `src/shared/lib/sound-registry/registry/` are the real mix controls.
- Budget per authoring group, enforced by the generator and
  `generatedSfx.node.test.ts` (`SFX_GROUP_BUDGET_BYTES` in
  `src/shared/lib/sfx-synth/sfxGroups.ts`). At ~44 KB per second of sound:

  | Group | Files | Budget | Now |
  | --- | --- | --- | --- |
  | core | `ui/`, `system/`, `economy/`, `combat/default/`, `combat/effects/` | 800 KB | ~448 KB |
  | undead | `combat/undead/` | 900 KB | ~581 KB |
  | orc | `combat/orc/` | 900 KB | ~130 KB |
  | human | `combat/human/` | 900 KB | ~59 KB |
  | elf | `combat/elf/` | 900 KB | ~70 KB |
  | total | | 4400 KB | ~770 KB |

### Ambience

- Primary: OGG Vorbis, libvorbis quality 2 (~96 kbps), stereo 48 kHz, as the
  recordings are. Chromium, Firefox and Phaser's Web Audio path decode it.
- Fallback: AAC-LC 96 kbps in `.m4a`, for Safari and iOS, which decode no
  Vorbis. `resolveSoundClipUrl` picks the file per session with
  `HTMLMediaElement.canPlayType` (`shared/lib/sound-registry/audioFormatSupport.ts`),
  so the menu player and the game preloader fetch the same file.
- Budget: both `.ogg` files together stay under 1.5 MB (currently ~1.2 MB).
  The encoder and `ambientAssets.node.test.ts` both enforce it.
- Each file is one seamless loop (61 s map, 47 s tension) cut from the full
  recording: the loop end is chosen where the music repeats best and its tail
  is crossfaded into the pre-roll before the loop start, so the jump back is a
  normal sample step. The encoder checks the boundary numerically and that
  the Ogg stream declares exactly the loop length.

## Regenerating

```bash
npm run gen:sfx                  # every group
npm run gen:sfx -- --race orc    # one race: undead, orc, human or elf
npm run gen:sfx -- --race core   # the race-neutral clips
```

The ambience loops are cut and encoded separately:

```bash
npm run encode:ambient
```

It reads the full recordings from `assets-src/audio/ambient/` (Suno exports;
ID3-tagged MP3, 48 kHz stereo, 11 MB and 4.5 MB, kept in git because they are
already in its history), the loop points from
`src/shared/lib/ambient-loop/ambientEncoding.ts`, and writes the `.ogg` and
`.m4a` files the registry points at. Encoding goes through the ffmpeg binary
that the `@ffmpeg-installer/ffmpeg` devDependency ships, so nothing has to be
installed on the machine. Commit the encoded files with any change to the
loop points.

The generator renders every recipe to the path its id is registered with,
deletes generated wav files no id points at, and prints duration and size per
clip and per group. With `--race` it renders, deletes and budgets only that
group's files; the other groups' files are never touched. It is deterministic: the same recipe and seed give the same bytes on
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
| `combat.creep_spawn` | Short low rush with a dull drum and a rising D-A tone (sent creature arrives). |
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
| `combat.creep.undead_skeleton.hit` | Bright bone click on a small hollow knock. |
| `combat.creep.undead_skeleton.death` | Dry rattle of bones collapsing into a clatter. |
| `combat.creep.undead_skeleton.escape` | Chattering jaw rattle over two hollow knocks, A then F. |
| `combat.creep.undead_skeleton.spawn` | Bones clicking together faster and faster, a small rising D-A tone. |
| `combat.creep.undead_ghoul.hit` | Wet tear with a clipped snarl. |
| `combat.creep.undead_ghoul.death` | Long snarl falling into wet tearing and a slump. |
| `combat.creep.undead_ghoul.escape` | Two hungry snarls, each climbing. |
| `combat.creep.undead_ghoul.spawn` | Claws tearing out of the ground into a rising snarl. |
| `combat.creep.undead_crypt_fiend.hit` | Two hard chitin ticks, high and hollow. |
| `combat.creep.undead_crypt_fiend.death` | Falling cascade of chitin clicks, a thin screech and a web hiss. |
| `combat.creep.undead_crypt_fiend.escape` | Fast mandible chitter swelling into a web hiss. |
| `combat.creep.undead_crypt_fiend.spawn` | Low burrowing rumble, three clicks and a sticky hiss. |
| `combat.creep.undead_gargoyle.hit` | Gritty stone knock. |
| `combat.creep.undead_gargoyle.death` | Last wingbeat, stone scrape and a crumbling fall. |
| `combat.creep.undead_gargoyle.escape` | Two leathery wingbeats under a gravelly cry. |
| `combat.creep.undead_gargoyle.spawn` | Stone cracking loose, then two wingbeats taking off. |
| `combat.creep.undead_abomination.hit` | Heavy wet thud with a faint chain. |
| `combat.creep.undead_abomination.death` | Gurgling bellow sinking, chains clinking, a huge body drop. |
| `combat.creep.undead_abomination.escape` | Rising gurgling bellow with rattling chains. |
| `combat.creep.undead_abomination.spawn` | Two heavy footfalls, chains swinging, a gurgle. |
| `combat.creep.undead_necromancer.hit` | Sharp whispered gasp on a dull knock. |
| `combat.creep.undead_necromancer.death` | Whispered chant falling A to D, the staff hitting the ground twice. |
| `combat.creep.undead_necromancer.escape` | Staff tap, then a two-note chant D-F under whispers. |
| `combat.creep.undead_necromancer.spawn` | Staff tap into a swelling D-A chant with whispers. |
| `combat.creep.undead_banshee.hit` | Glassy ping with a breath of air. |
| `combat.creep.undead_banshee.death` | Long wail falling an octave, fading shimmer. |
| `combat.creep.undead_banshee.escape` | Quavering wail rising A to D with a shimmer. |
| `combat.creep.undead_banshee.spawn` | Wind swelling into a wail and a high shimmer. |
| `combat.creep.undead_frost_wyrm.hit` | Icy crackle on a deep thud. |
| `combat.creep.undead_frost_wyrm.death` | Deep cold roar falling away, ice shattering, a heavy fall. |
| `combat.creep.undead_frost_wyrm.escape` | Deep roar rising, frosty wind and crackle. |
| `combat.creep.undead_frost_wyrm.spawn` | Two huge wingbeats, a cold roar and crackling frost. |
| `combat.tower.undead_bone_archer_tower.attack` | Creaking sinew bow, dark twang with a bone click, hissing tail. |
| `combat.tower.undead_bone_archer_tower.impact` | Bone-tipped arrow: two sharp clicks on a light knock. |
| `combat.tower.undead_plague_tower.attack` | Three bubbles rising and a plague burst. |
| `combat.tower.undead_plague_tower.impact` | Wet splat with popping bubbles. |
| `combat.tower.undead_frost_wyrm_nest.attack` | Icy breath over a small cold growl. |
| `combat.tower.undead_frost_wyrm_nest.impact` | Frost shatter: high glassy tones and crackle. |
| `combat.tower.undead_bone_obelisk.attack` | Low resonant D hum, pulsing. |
| `combat.tower.undead_bone_obelisk.impact` | Dark falling pulse. |

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
| `combat.creep.orc_grunt.hit` | Meaty thud with a clipped hoarse grunt. |
| `combat.creep.orc_grunt.death` | Long wavering death groan falling into a body drop. |
| `combat.creep.orc_grunt.escape` | Two hoarse taunting barks over a drum. |
| `combat.creep.orc_grunt.spawn` | Rising hoarse bark and a war drum. |
| `combat.tower.orc_spear_watchtower.attack` | Heavy shaft whoosh and a wooden snap. |
| `combat.tower.orc_spear_watchtower.impact` | Double wooden crack on a thunk. |

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
| `ambient.map` | Menu and map ambience loop | `ambient/ambient_map_01.ogg` (+ `.m4a`) |
| `ambient.tension` | In-game tension loop | `ambient/ambient_tension_01.ogg` (+ `.m4a`) |

## Recipes

A recipe is data: a seed and a list of layers. Each layer is an oscillator
(`sine`, `triangle`, `square`, `saw`, `fm`) or sample-and-hold `noise`, with an
ADSR envelope, optional pitch sweep, vibrato, tremolo, soft drive and
low/high/band-pass filters (sweepable). A recipe may add a feedback echo.
Types live in `src/shared/lib/sfx-synth/sfxRecipe.types.ts`; shorthands such
as `bell`, `thump` and `burst` in `recipes/recipeKit.ts`.

## Adding or changing a sound

1. Register the id in its group file under `src/shared/types/sound-ids/`
   (`core.ts` or the race file) and its clip in the matching registry file
   under `src/shared/lib/sound-registry/registry/`.
2. Add its recipe to the matching file in `src/shared/lib/sfx-synth/recipes/`
   (the recipe maps are typed, so a missing recipe does not compile).
3. If a tower or creature should use it, point a sound profile or the
   tower's / creature's `sounds` at it.
4. Run `npm run gen:sfx` (or `-- --race <group>`), listen, and commit the
   recipe and the wav together.

## Authoring a race

Each race is authored in its own five files, so four authors can work at once
without touching the same file. For race `<race>` (`undead`, `orc`, `human`,
`elf`):

| # | File | What goes in |
| --- | --- | --- |
| 1 | `src/shared/types/sound-ids/<race>.ts` | The ids. |
| 2 | `src/shared/lib/sound-registry/registry/combatSounds.<race>.ts` | One clip per id: file and playback preset from `combatPlayback.ts`. |
| 3 | `src/shared/lib/sfx-synth/recipes/<race>Recipes.ts` | One recipe per id. |
| 4 | `src/content/units/<race>.json` | Each creature's `sounds` (only that field). |
| 5 | `src/content/towers/<race>.json` | Each tower's `sounds` (only that field). |

Checklist:

1. Name ids `combat.creep.<unitId>.<hit|death|escape|spawn>` and
   `combat.tower.<towerId>.<attack|impact|upgrade>`. A test fails on an id
   that names another race's creature or tower, or no real one.
2. Put files under `combat/<race>/creeps/<unitId>_<slot>.wav` and
   `combat/<race>/towers/<towerId>_<slot>.wav`: register with
   `raceCombatClip.bind(null, '<race>')` (the file's `clip` helper), which
   prefixes `combat/<race>/` for you.
3. Pick playback presets by slot: `CREEP_HIT`, `CREEP_DEATH`, `CREEP_ESCAPE`,
   `CREEP_SPAWN` (its 1.2 s cooldown is what throttles a batch of sends),
   `ATTACK` or `HEAVY_ATTACK`, `IMPACT`, `UPGRADE`.
4. Give each recipe a fresh seed in the race's range (undead 5xx, orc 6xx,
   human 7xx, elf 8xx). Keep frequent cues short: hits under 0.1 s, attacks
   and impacts under 0.2 s, deaths and spawns under 0.6 s.
5. Render only your group: `npm run gen:sfx -- --race <race>`. It prints each
   clip and your group's size against its 900 KB budget.
6. Listen: open the wavs in `public/assets/audio/sfx/combat/<race>/` (any
   player), and play a match with that race to hear them in the mix.
7. Add a row per id to this file's race table, run `npm run check`, commit
   recipes and wavs together.

A race author must not:

- edit another race's five files, `core.ts`, `combatSounds.core.ts`,
  `combatRecipes.ts` or the shared helpers in `recipeKit.ts` (copy a helper
  into the race recipe file instead);
- change an existing recipe without meaning to: committed wavs are compared
  byte for byte, so an unintended change fails `generatedSfx.node.test.ts`;
- run `npm run gen:sfx` without `--race` while others are authoring, and
  commit wavs of other groups;
- touch any content field other than `sounds`, or bump `schemaVersion`;
- put two ids on one file, or reuse an id of another race (point content at
  it instead);
- change the race profiles in `src/content/audio/` or `default.json` unless
  the race-wide fallback itself should change.

## Playback rules

- **Throttling**: each clip has a cooldown and each category a voice limit
  (`AUDIO_CONSTANTS`), so a splash on twenty creeps stays one cue.
- **Pitch variation**: combat clips vary slightly (about 6%) to avoid the
  machine-gun effect; stingers stay in key.
- **Mobile**: audio is locked until the first user interaction.
