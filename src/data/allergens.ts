import { AllergenInfo } from '../types';

export const ALLERGENS: AllergenInfo[] = [
  { key: 'gluten', label: 'Glúten', icon: '🌾' },
  { key: 'lactose', label: 'Lactose', icon: '🥛' },
  { key: 'milk', label: 'Leite', icon: '🐄' },
  { key: 'eggs', label: 'Ovos', icon: '🥚' },
  { key: 'peanuts', label: 'Amendoim', icon: '🥜' },
  { key: 'tree_nuts', label: 'Castanhas e Nozes', icon: '🌰' },
  { key: 'soy', label: 'Soja', icon: '🫘' },
  { key: 'crustaceans', label: 'Crustáceos', icon: '🦐' },
  { key: 'fish', label: 'Peixe', icon: '🐟' },
  { key: 'sesame', label: 'Gergelim', icon: '🫓' },
  { key: 'sulfites', label: 'Sulfitos', icon: '🧪' },
  { key: 'celery', label: 'Salsão/Aipo', icon: '🥬' },
  { key: 'mustard', label: 'Mostarda', icon: '🫙' },
  { key: 'lupin', label: 'Tremoço', icon: '🫛' },
];

export const ALLERGEN_MAP = new Map(ALLERGENS.map(a => [a.key, a]));

export const STORAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'refrigerated', label: 'Refrigerado' },
  { value: 'frozen', label: 'Congelado' },
  { value: 'dry', label: 'Despensa' },
  { value: 'ambient', label: 'Ambiente' },
];
