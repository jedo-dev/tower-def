import { Suspense } from 'react';
import type { GamePageProps } from './GamePage';
import { gamePageChunk } from './gamePageChunk';
import { GameLoadingScreen } from './ui/GameLoadingScreen';

const { Component: GamePageFromChunk } = gamePageChunk;

/** The game screen, shown behind a loading state while its chunk downloads. */
export function LazyGamePage(props: GamePageProps) {
  return (
    <Suspense fallback={<GameLoadingScreen />}>
      <GamePageFromChunk {...props} />
    </Suspense>
  );
}
