const STORAGE_KEY = 'meuovo_preferences';

export interface UserProfile {
  preferredCuisines: string[];
  viewedRestaurants: string[];
  recentSearches: string[];
  cuisineRestaurantCount: Record<string, number>;
}

function load(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { preferredCuisines: [], viewedRestaurants: [], recentSearches: [], cuisineRestaurantCount: {} };
}

function save(profile: UserProfile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
}

export function trackCuisineClick(cuisine: string) {
  const profile = load();
  profile.preferredCuisines = [cuisine, ...profile.preferredCuisines.filter(c => c !== cuisine)].slice(0, 10);
  profile.cuisineRestaurantCount[cuisine] = (profile.cuisineRestaurantCount[cuisine] || 0) + 1;
  save(profile);
}

export function trackRestaurantView(restaurantId: string, cuisineType?: string) {
  const profile = load();
  profile.viewedRestaurants = [restaurantId, ...profile.viewedRestaurants.filter(id => id !== restaurantId)].slice(0, 20);
  if (cuisineType) {
    profile.preferredCuisines = [cuisineType, ...profile.preferredCuisines.filter(c => c !== cuisineType)].slice(0, 10);
    profile.cuisineRestaurantCount[cuisineType] = (profile.cuisineRestaurantCount[cuisineType] || 0) + 1;
  }
  save(profile);
}

export function trackSearch(term: string) {
  if (term.trim().length < 2) return;
  const profile = load();
  profile.recentSearches = [term, ...profile.recentSearches.filter(s => s !== term)].slice(0, 10);
  save(profile);
}

export function getUserProfile(): UserProfile {
  return load();
}

export function hasMinHistory(): boolean {
  const p = load();
  return p.preferredCuisines.length >= 1 || p.viewedRestaurants.length >= 2;
}

export function clearProfile() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
