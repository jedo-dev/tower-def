import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { preloadTerrainAssets } from './features/game-engine/runtime/assets/terrainAssetRegistry';
import './app/styles/global.css';
import './app/styles/ui-kit.css';

void preloadTerrainAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
