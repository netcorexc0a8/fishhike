import { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { Onboarding } from './components/Onboarding';
import { ForecastScreen } from './screens/ForecastScreen';
import { ChecklistsScreen } from './screens/ChecklistsScreen';
import { ChecklistDetailScreen } from './screens/ChecklistDetailScreen';
import { RecipesScreen } from './screens/RecipesScreen';
import { RecipeDetailScreen } from './screens/RecipeDetailScreen';
import { RecipeEditScreen } from './screens/RecipeEditScreen';
import { PlacesScreen } from './screens/PlacesScreen';

// HashRouter — чтобы прямые ссылки работали на GitHub Pages без серверных перенаправлений.
export function App() {
  // undefined — обучение не идёт; null — идёт без подсветки; число — подсвеченная вкладка.
  const [spot, setSpot] = useState<number | null | undefined>(undefined);
  const touring = spot !== undefined;
  return (
    <HashRouter>
      <div className="app" inert={touring || undefined} aria-hidden={touring || undefined}>
        <Routes>
          <Route path="/" element={<ForecastScreen />} />
          <Route path="/checklists" element={<ChecklistsScreen />} />
          <Route path="/checklists/:id" element={<ChecklistDetailScreen />} />
          <Route path="/recipes" element={<RecipesScreen />} />
          <Route path="/recipes/new" element={<RecipeEditScreen />} />
          <Route path="/recipes/:id" element={<RecipeDetailScreen />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditScreen />} />
          <Route path="/places" element={<PlacesScreen />} />
          <Route path="*" element={<ForecastScreen />} />
        </Routes>
      </div>
      <TabBar spotlight={spot} />
      <Onboarding onStepTab={(t) => setSpot(t)} />
    </HashRouter>
  );
}
