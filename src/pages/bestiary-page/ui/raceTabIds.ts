import type { RaceId } from '../../../shared/types/content-ids';

/** DOM ids that tie each race tab to the panel it controls. */
export function raceTabId(raceId: RaceId): string {
  return `bestiary-tab-${raceId.toLowerCase()}`;
}

export function racePanelId(raceId: RaceId): string {
  return `bestiary-panel-${raceId.toLowerCase()}`;
}
