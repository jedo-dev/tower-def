/** The dock's two tabs, in rail order. */
export type MatchDockTab = 'towers' | 'send';

export const MATCH_DOCK_TABS: readonly MatchDockTab[] = ['towers', 'send'];

/** The dock opens on the tower cards, like the Claude Design default state. */
export const DEFAULT_MATCH_DOCK_TAB: MatchDockTab = 'towers';

/**
 * Roving focus of the tab rail (WAI-ARIA tabs, automatic activation): the
 * arrows wrap, Home and End jump to the ends. Any other key keeps the tab.
 */
export function resolveDockTabForKey(current: MatchDockTab, key: string): MatchDockTab | null {
  const index = MATCH_DOCK_TABS.indexOf(current);
  const count = MATCH_DOCK_TABS.length;
  switch (key) {
    case 'ArrowRight':
      return MATCH_DOCK_TABS[(index + 1) % count];
    case 'ArrowLeft':
      return MATCH_DOCK_TABS[(index - 1 + count) % count];
    case 'Home':
      return MATCH_DOCK_TABS[0];
    case 'End':
      return MATCH_DOCK_TABS[count - 1];
    default:
      return null;
  }
}
