import { memo, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import styles from './MatchDock.module.css';
import { CreepDevelopToggle, CreepSendPanel } from '../../../widgets/creep-send-panel';
import { TowerBuildCards } from '../../../widgets/hud';
import type { GameSetupConfig } from '../../../shared/config/game-setup';
import { getGameHudSnapshot, sendGameCommand } from '../../../shared/lib/game-bridge/bridge';
import { usePlayerSendLimits } from '../../../shared/lib/game-bridge/useSendLimits';
import {
  DEFAULT_MATCH_DOCK_TAB,
  MATCH_DOCK_TABS,
  resolveDockTabForKey,
  type MatchDockTab,
} from './matchDockTabs';

export const MATCH_DOCK_LABEL = 'Action dock';

export type MatchDockProps = {
  setup: GameSetupConfig | null;
};

const TAB_TITLES: Record<MatchDockTab, string> = {
  towers: 'Towers',
  send: 'Send',
};

/**
 * The dock under the status bar (docs/design/match-screen-concept.webp): a
 * tab rail with TOWERS and SEND, and ONE row of cards for the active tab,
 * never both. The tab and the develop mode are UI state; the dock stays
 * mounted through the wave collapse and under the tower sheet, so both
 * survive until the match ends. Both tab rows are equally tall, so switching
 * never moves the board.
 */
function MatchDockComponent({ setup }: MatchDockProps) {
  const [activeTab, setActiveTab] = useState<MatchDockTab>(DEFAULT_MATCH_DOCK_TAB);
  const [isDevelopMode, setIsDevelopMode] = useState(false);
  const sendLimits = usePlayerSendLimits();
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<MatchDockTab, HTMLButtonElement | null>>>({});
  const tabId = (tab: MatchDockTab): string => `${baseId}-tab-${tab}`;
  const panelId = `${baseId}-panel`;

  function selectTab(tab: MatchDockTab): void {
    if (tab === activeTab) {
      return;
    }
    // Leaving the tower cards drops a picked tower, so no placement ghost
    // follows the player into the send cards.
    if (activeTab === 'towers' && getGameHudSnapshot().selectedTowerType !== null) {
      sendGameCommand('select-tower', { towerType: null });
    }
    setActiveTab(tab);
  }

  function handleRailKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const nextTab = resolveDockTabForKey(activeTab, event.key);
    if (nextTab === null) {
      return;
    }
    event.preventDefault();
    selectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  return (
    <section
      className={`ui-panel ${styles.dock}`}
      aria-label={MATCH_DOCK_LABEL}
      data-dock-tab={activeTab}
    >
      <div className={styles.rail}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Dock tabs"
          onKeyDown={handleRailKeyDown}
        >
          {MATCH_DOCK_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                ref={(element) => {
                  tabRefs.current[tab] = element;
                }}
                type="button"
                role="tab"
                id={tabId(tab)}
                className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ''}`}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                data-sound="ui.open"
                onClick={() => selectTab(tab)}
              >
                <span className={styles.tabTitle}>{TAB_TITLES[tab]}</span>
                {tab === 'send' && sendLimits !== null && (
                  <span className={styles.tabCount}>
                    {' '}
                    {sendLimits.waveSendsRemaining}/{sendLimits.waveSendCap}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {activeTab === 'send' && (
          <CreepDevelopToggle
            setup={setup}
            isDevelopMode={isDevelopMode}
            onDevelopModeChange={setIsDevelopMode}
          />
        )}
      </div>
      <div className={styles.panel} role="tabpanel" id={panelId} aria-labelledby={tabId(activeTab)}>
        {activeTab === 'towers' ? (
          <TowerBuildCards setup={setup} />
        ) : (
          <CreepSendPanel
            setup={setup}
            isDevelopMode={isDevelopMode}
            onDevelopModeChange={setIsDevelopMode}
          />
        )}
      </div>
    </section>
  );
}

export const MatchDock = memo(MatchDockComponent);
