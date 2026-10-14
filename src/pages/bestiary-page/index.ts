// Only the lazy entry is public: importing `BestiaryPage` directly would pull
// the content registries into the start menu chunk.
export { LazyBestiaryPage } from './LazyBestiaryPage';
export { resetBestiaryPageLoad } from './bestiaryPageChunk';
export type { BestiaryPageProps } from './ui/BestiaryPage';
