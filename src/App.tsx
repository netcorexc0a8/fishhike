import { lazy, Suspense, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Onboarding } from './components/Onboarding';
import { InstallScreen } from './components/InstallScreen';
import { ForecastScreen } from './screens/ForecastScreen';
import { ChecklistsScreen } from './screens/ChecklistsScreen';
import { ChecklistDetailScreen } from './screens/ChecklistDetailScreen';
import { RecipesScreen } from './screens/RecipesScreen';
import { RecipeDetailScreen } from './screens/RecipeDetailScreen';
import { RecipeEditScreen } from './screens/RecipeEditScreen';
import { PlacesScreen } from './screens/PlacesScreen';
import { CatchesScreen } from './screens/CatchesScreen';
import { CatchDetailScreen } from './screens/CatchDetailScreen';
import { CatchEditScreen } from './screens/CatchEditScreen';

// Карта с Leaflet грузится отдельным файлом — остальные разделы открываются быстрее.
const MapScreen = lazy(() => import('./screens/MapScreen'));
const mapFallback = (
  <main className="screen">
    <div className="skeleton" style={{ height: 360 }} />
  </main>
);

// HashRouter — чтобы прямые ссылки работали на GitHub Pages без серверных перенаправлений.
export function App() {
  // undefined — обучение не идёт; null — идёт без подсветки; число — подсвеченная вкладка.
  const [spot, setSpot] = useState<number | null | undefined>(undefined);
  const [installing, setInstalling] = useState(true);
  const touring = spot !== undefined;
  const blocked = touring || installing;
  return (
    <HashRouter>
      <div className="app" inert={blocked || undefined} aria-hidden={blocked || undefined}>
        <Routes>
          <Route path="/" element={<ForecastScreen />} />
          <Route path="/catches" element={<CatchesScreen />} />
          <Route path="/catches/new" element={<CatchEditScreen />} />
          <Route path="/catches/:id" element={<CatchDetailScreen />} />
          <Route path="/catches/:id/edit" element={<CatchEditScreen />} />
          <Route path="/checklists" element={<ChecklistsScreen />} />
          <Route path="/checklists/:id" element={<ChecklistDetailScreen />} />
          <Route path="/recipes" element={<RecipesScreen />} />
          <Route path="/recipes/new" element={<RecipeEditScreen />} />
          <Route path="/recipes/:id" element={<RecipeDetailScreen />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditScreen />} />
          <Route path="/map" element={<Suspense fallback={mapFallback}><MapScreen /></Suspense>} />
          <Route path="/places" element={<PlacesScreen />} />
          <Route path="*" element={<ForecastScreen />} />
        </Routes>
      </div>
      <TabBar spotlight={spot} />
      <Onboarding onStepTab={(t) => setSpot(t)} waiting={installing} />
      <InstallScreen onVisibleChange={setInstalling} />
    </HashRouter>
  );
}
