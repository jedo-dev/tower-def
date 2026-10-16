/**
 * Optional abilities a creature grade may carry under `abilities` (resistances,
 * dodge, regeneration, shields and the like, docs/12-unit-talents-ru.md). The
 * fields land with the creature abilities task; until then the object is
 * accepted empty, so content and talent grades already have a typed place for
 * them. Every field will be optional: absent means "no such ability".
 */
export type CreatureAbilities = { readonly [key in CreatureAbilityKey]?: number };

/** Ability fields known to the loader; extended by the creature abilities task. */
export const CREATURE_ABILITY_KEYS = [] as const;

export type CreatureAbilityKey = (typeof CREATURE_ABILITY_KEYS)[number];
