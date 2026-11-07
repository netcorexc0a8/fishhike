import ukha from '../assets/recipes/ukha.webp';
import coals from '../assets/recipes/coals.webp';
import kasha from '../assets/recipes/kasha.webp';

// Фото встроенных рецептов — свободные снимки с Wikimedia Commons.
// Лицензии CC BY-SA требуют указать автора и лицензию: подпись выводится на экране рецепта.

export interface RecipePhoto {
  src: string;
  alt: string;
  author: string;
  license: string;
  /** Страница файла на Wikimedia Commons. */
  source: string;
}

export const RECIPE_PHOTOS: Record<string, RecipePhoto> = {
  'seed-ukha': {
    src: ukha,
    alt: 'Тарелка ухи с куском рыбы и овощами',
    author: 'Kagor',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Uha_013.jpg',
  },
  'seed-coals': {
    src: coals,
    alt: 'Рыба в фольге на мангале',
    author: 'Ansgar Koreng',
    license: 'CC BY-SA 3.0 DE',
    source: 'https://commons.wikimedia.org/wiki/File:140531_Forellen_auf_dem_Grill.jpg',
  },
  'seed-kasha': {
    src: kasha,
    alt: 'Гречка с тушёным мясом в тарелке',
    author: 'Samurai2593',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Гречяна_каша_з_душениною2.jpg',
  },
};

export const recipePhoto = (id: string): RecipePhoto | undefined => RECIPE_PHOTOS[id];
