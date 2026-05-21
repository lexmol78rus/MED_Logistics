import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import App from './App.tsx';
import './index.css';
import { migrateSettingsStorage } from './lib/settings/storage';

migrateSettingsStorage();

// AG Grid v33+ requires explicit module registration; without this grids render empty.
ModuleRegistry.registerModules([AllCommunityModule]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
