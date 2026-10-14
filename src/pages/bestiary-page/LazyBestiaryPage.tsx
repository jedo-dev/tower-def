import { Suspense } from 'react';
import { bestiaryPageChunk } from './bestiaryPageChunk';
import type { BestiaryPageProps } from './ui/BestiaryPage';
import { BestiaryLoadingScreen } from './ui/BestiaryLoadingScreen';

const { Component: BestiaryPageFromChunk } = bestiaryPageChunk;

/** The bestiary screen, shown behind a loading state while its chunk downloads. */
export function LazyBestiaryPage(props: BestiaryPageProps) {
  return (
    <Suspense fallback={<BestiaryLoadingScreen />}>
      <BestiaryPageFromChunk {...props} />
    </Suspense>
  );
}
