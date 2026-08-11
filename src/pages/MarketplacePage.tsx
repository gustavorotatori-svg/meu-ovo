import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, SlidersHorizontal, Clock, Truck, X, ChevronDown, Filter, Share2, Utensils, Building2, Landmark, Heart, Loader2, RotateCcw, Flame } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import ShareModal from '../components/ShareModal';
import VoiceSearch from '../components/VoiceSearch';
import OnboardingTutorial from '../components/OnboardingTutorial';
import Badge from '../components/Badge';
import SectionHeader from '../components/SectionHeader';
import SEO from '../components/SEO';
import { RestaurantCardSkeleton } from '../components/Skeleton';
import { cuisineTypes, cuisineEmojis } from '../data/mockData';
import { Restaurant, Order } from '../types';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { rankRestaurants } from '../lib/recommendations';
import { encodeGeohash, getGeohashRange } from '../lib/geohash';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { trackCuisineClick, trackSearch, trackRestaurantView, getUserProfile, hasMinHistory } from '../lib/userPreferences';
import { scoreRestaurantsForUser } from '../lib/smartFeed';
import {
  collection,
  query,
  where,
  orderBy as firestoreOrderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import BackButton from '../components/BackButton';

const PAGE_SIZE = 9;
const priceLabels = { low: 'R$', medium: 'R$ R$', high: 'R$ R$ R$' };

export default function MarketplacePage() {
  const { restaurants: contextRestaurants, orders, products } = useRestaurant();
  const { user } = useAuth();
  const { items: cartItems } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState('São Paulo');
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Paginated Firestore state
  const [pageRestaurants, setPageRestaurants] = useState<Restaurant[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [totalEstimate, setTotalEstimate] = useState(0);

  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(searchParams.get('cuisine'));
  const [filterPriceRange, setFilterPriceRange] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Fetch last order for reorder card
  useEffect(() => {
    if (!user?.id) return;
    const fetchLastOrder = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.id),
          firestoreOrderBy('createdAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setLastOrder({ id: doc.id, ...doc.data() } as Order);
        }
      } catch (err) {
        console.error('[Marketplace] Failed to fetch last order:', err);
      }
    };
    fetchLastOrder();
  }, [user?.id]);

  // Fetch from Firestore with pagination
  const fetchPage = useCallback(async (lastDocSnapshot?: QueryDocumentSnapshot | null, append = false) => {
    setPageLoading(true);
    setPageError(null);
    try {
      const constraints: any[] = [];
      
      if (nearbyEnabled && userLocation) {
        const range = getGeohashRange(userLocation.lat, userLocation.lng, 10);
        constraints.push(where('geohash', '>=', range.start));
        constraints.push(where('geohash', '<=', range.end));
      } else {
        constraints.push(where('city', '==', selectedCity));
      }
      if (selectedCuisine) {
        constraints.push(where('cuisineType', '==', selectedCuisine));
      }
      if (filterPriceRange) {
        constraints.push(where('priceRange', '==', filterPriceRange));
      }
      constraints.push(firestoreOrderBy('createdAt', 'desc'));
      constraints.push(limit(PAGE_SIZE));
      if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
      }

      const q = query(collection(db, 'restaurants'), ...constraints);
      const snapshot = await getDocs(q);

      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      const last = snapshot.docs[snapshot.docs.length - 1] || null;

      if (append) {
        setPageRestaurants(prev => [...prev, ...fetched]);
      } else {
        setPageRestaurants(fetched);
      }
      setLastDoc(last);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      if ((error as any).code === 'FAILED_PRECONDITION' || (error as any).message?.includes('index')) {
        setPageError('Índice do Firestore não encontrado. Usando fallback client-side.');
        // Fallback: fetch all restaurants matching geo or city, apply filters client-side
        const field = nearbyEnabled && userLocation ? 'geohash' : 'city';
        const fallbackQ = query(collection(db, 'restaurants'), limit(100));
        const snapshot = await getDocs(fallbackQ);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));

        if (nearbyEnabled && userLocation) {
          const range = getGeohashRange(userLocation.lat, userLocation.lng, 10);
          results = results.filter(r => r.geohash && r.geohash >= range.start && r.geohash <= range.end);
        } else {
          results = results.filter(r => r.city === selectedCity);
        }
        if (selectedCuisine) {
          results = results.filter(r => r.cuisineType === selectedCuisine);
        }
        if (filterPriceRange) {
          results = results.filter(r => r.priceRange === filterPriceRange);
        }

        if (append) {
          setPageRestaurants(prev => [...prev, ...results]);
        } else {
          setPageRestaurants(results);
        }
        setLastDoc(null);
        setHasMore(false);
        setTotalEstimate(results.length);
      } else {
        setPageError('Erro ao carregar restaurantes. Tente novamente.');
      }
    } finally {
      setPageLoading(false);
      setInitialLoading(false);
    }
  }, [selectedCity, selectedCuisine, filterPriceRange, nearbyEnabled, userLocation]);

  // Reset and fetch when primary filters change
  useEffect(() => {
    setPageRestaurants([]);
    setLastDoc(null);
    setHasMore(true);
    setInitialLoading(true);
    setTotalEstimate(0);
    fetchPage(null, false);
  }, [fetchPage]);

  const loadMore = () => {
    if (!pageLoading && hasMore) {
      fetchPage(lastDoc, true);
    }
  };

  // Sync URL params
  useEffect(() => {
    const term = searchParams.get('search') || searchParams.get('q');
    if (term !== null) setSearch(term);
    const cuis = searchParams.get('cuisine');
    if (cuis !== null) setSelectedCuisine(cuis);
    const sort = searchParams.get('sort');
    if (sort !== null) setSortBy(sort);
    const hood = searchParams.get('bairro');
    if (hood !== null) setFilterNeighbourhood(hood);
    if (searchParams.get('aberto') === '1') setFilterOpenNow(true);
    if (searchParams.get('delivery') === '1') setFilterDelivery(true);
    if (searchParams.get('retirada') === '1') setFilterPickup(true);
    const price = searchParams.get('preco');
    if (price !== null) setFilterPriceRange(price);
  }, [searchParams]);

  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    
    const searchLower = search.toLowerCase();
    const matches: { type: 'restaurant' | 'cuisine' | 'neighborhood'; value: string; extra?: string }[] = [];
    
    cuisineTypes.forEach(c => {
      if (c.toLowerCase().includes(searchLower)) {
        matches.push({ type: 'cuisine', value: c });
      }
    });

    contextRestaurants.forEach(r => {
      if ((r.name || '').toLowerCase().includes(searchLower)) {
        matches.push({ type: 'restaurant', value: r.name || '', extra: r.cuisineType || '' });
      }
      if ((r.neighborhood || '').toLowerCase().includes(searchLower)) {
        const neighborhoodValue = `${r.neighborhood || ''}, ${r.city || ''}`;
        if (!matches.some(m => m.value === neighborhoodValue)) {
          matches.push({ type: 'neighborhood', value: neighborhoodValue });
        }
      }
    });

    return matches.slice(0, 8);
  }, [search, contextRestaurants]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setShowSuggestions(false);
  };

  const [showFilters, setShowFilters] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterPickup, setFilterPickup] = useState(false);
  const [filterIndependent, setFilterIndependent] = useState(false);
  const [filterFamilyRun, setFilterFamilyRun] = useState(false);
  const [filterNeighbourhood, setFilterNeighbourhood] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('relevance');

  const neighborhoods = useMemo(() => {
    const list = contextRestaurants
      .filter(r => !selectedCity || r.city === selectedCity)
      .map(r => r.neighborhood);
    return Array.from(new Set(list));
  }, [contextRestaurants, selectedCity]);

  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const handleShare = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/r/${restaurant.slug}`;
    setShareData({
      isOpen: true,
      url,
      title: `Confira o cardápio de ${restaurant.name} no MEU OVO!`
    });
  };

  // Rank fetched restaurants by order frequency (for relevance sort)
  const rankedPage = useMemo(() => {
    return rankRestaurants(pageRestaurants, orders);
  }, [pageRestaurants, orders]);

  // Client-side filtering on paginated results
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    const matchingProductRestaurantIds = searchLower.length > 2 
      ? new Set(products.filter(p => 
          (p.name || '').toLowerCase().includes(searchLower) || 
          p.description?.toLowerCase().includes(searchLower)
        ).map(p => p.restaurantId))
      : new Set();

    const source = sortBy === 'relevance' ? rankedPage : pageRestaurants;

    return source.filter(r => {
      const matchesSearch = !search || 
        (r.name || '').toLowerCase().includes(searchLower) || 
        (r.cuisineType || '').toLowerCase().includes(searchLower) ||
        (r.neighborhood || '').toLowerCase().includes(searchLower) ||
        (r.city || '').toLowerCase().includes(searchLower) ||
        matchingProductRestaurantIds.has(r.id);

      if (!matchesSearch) return false;
      if (filterOpenNow && !r.isOpen) return false;
      if (filterDelivery && !r.deliveryEnabled) return false;
      if (filterPickup && !r.pickupEnabled) return false;
      if (filterIndependent && !r.isIndependent) return false;
      if (filterFamilyRun && !r.familyRun) return false;
      if (filterNeighbourhood && r.neighborhood !== filterNeighbourhood) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'delivery') return (a.estimatedTime ?? 999) - (b.estimatedTime ?? 999);
      if (sortBy === 'name') return (a.name ?? '').localeCompare(b.name ?? '');
      return 0;
    });
  }, [search, filterOpenNow, filterDelivery, filterPickup, filterIndependent, filterFamilyRun, filterNeighbourhood, sortBy, rankedPage, pageRestaurants, products]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCuisine) params.set('cuisine', selectedCuisine);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (filterNeighbourhood) params.set('bairro', filterNeighbourhood);
    if (filterOpenNow) params.set('aberto', '1');
    if (filterDelivery) params.set('delivery', '1');
    if (filterPickup) params.set('retirada', '1');
    if (filterPriceRange) params.set('preco', filterPriceRange);
    setSearchParams(params, { replace: true });
  }, [search, selectedCuisine, sortBy, filterNeighbourhood, filterOpenNow, filterDelivery, filterPickup, filterPriceRange, setSearchParams]);

  const clearFilters = () => {
    setSelectedCuisine(null);
    setFilterOpenNow(false);
    setFilterDelivery(false);
    setFilterPickup(false);
    setFilterPriceRange(null);
    setFilterIndependent(false);
    setFilterFamilyRun(false);
    setFilterNeighbourhood(null);
    setSortBy('relevance');
    setSearch('');
    setSearchParams({});
  };

  const hasFilters = selectedCuisine || filterOpenNow || filterDelivery || filterPickup || filterPriceRange || filterIndependent || filterFamilyRun || filterNeighbourhood || search;

  const showLoadMore = hasMore;

  return (
    <>
      {user && user.role === 'customer' && !user.onboardingComplete && <OnboardingTutorial />}
      <div className="min-h-screen bg-[#F5F5F5] marketplace-page">
      <SEO 
        title="Busca de Restaurantes"
        description="Encontre os melhores restaurantes perto de você. Peça direto, sem intermediários e com impacto social real."
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      {/* Hero search */}
      <div className="bg-[#111111] pt-20 md:pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white text-center mb-8 leading-tight">
            O que você quer comer hoje?
          </h1>
          <p className="text-gray-400 text-center mb-8 font-medium">Pedido direto. Sem comissão. Apoie o restaurante local.</p>
          <div className="flex justify-center mb-8">
            <Link
              to="/mais-pedidos"
              className="inline-flex items-center gap-2 bg-[#FFC928] text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-amber-400 transition-all"
            >
              <Flame size={14} /> Ver ranking dos mais pedidos
            </Link>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-white/10 p-2 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
            <div className="flex items-center gap-2 sm:border-r sm:border-gray-100 sm:pr-5 pl-2 sm:pl-4 py-1 sm:py-2">
              <MapPin size={18} className="text-[#FFC928] shrink-0" />
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="text-xs sm:text-sm text-gray-700 bg-transparent outline-none font-black uppercase tracking-widest cursor-pointer"
              >
                <option>São Paulo</option>
                <option>Rio de Janeiro</option>
                <option>Belo Horizonte</option>
              </select>
            </div>
            <div className="flex-1 flex items-center gap-2 relative bg-gray-50 sm:bg-transparent rounded-2xl sm:rounded-none px-3 sm:px-0 py-2 sm:py-0">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Busque por restaurante ou tipo de comida..."
                value={search}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={e => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                className="flex-1 outline-none text-sm sm:text-base font-bold text-gray-700 placeholder-gray-400 min-w-0"
              />
              <VoiceSearch onTranscript={(text) => setSearch(text)} className="p-2 shrink-0" />

              {/* Autocomplete Suggestions */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 sm:mt-4 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(s.value)}
                        className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50 rounded-xl sm:rounded-2xl transition-all text-left group"
                      >
                        <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${
                          s.type === 'cuisine' ? 'bg-orange-100 text-orange-600' : 
                          s.type === 'restaurant' ? 'bg-blue-100 text-blue-600' : 
                          'bg-green-100 text-green-600'
                        }`}>
                          {s.type === 'cuisine' ? <Utensils size={16} /> : 
                           s.type === 'restaurant' ? <Building2 size={16} /> : 
                           <MapPin size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-[#FFC928] transition-colors truncate">{s.value}</p>
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {s.type === 'cuisine' ? 'Tipo de Culinária' : 
                             s.type === 'restaurant' ? `Restaurante • ${s.extra}` : 
                             'Localidade'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {search && (
              <button onClick={() => setSearch('')} className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0" aria-label="Limpar busca">
                <X size={18} className="text-gray-400" />
              </button>
            )}
            <button onClick={() => trackSearch(search)} className="w-full sm:w-auto bg-[#FFC928] text-[#111] font-display font-black px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-[#FFC928]/20 shrink-0">
              Buscar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cuisine types */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCuisine(null)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl flex-shrink-0 transition-all ${!selectedCuisine ? 'bg-[#111111] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="text-2xl">🍽️</span>
              <span className="text-xs font-bold">Todos</span>
            </button>
            {cuisineTypes.map(c => (
              <button
                key={c}
                onClick={() => {
                  const willSelect = selectedCuisine !== c;
                  setSelectedCuisine(willSelect ? c : null);
                  if (willSelect) trackCuisineClick(c);
                }}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl flex-shrink-0 transition-all ${selectedCuisine === c ? 'bg-[#FFC928] text-[#111]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-2xl">{cuisineEmojis[c] || '🍴'}</span>
                <span className="text-xs font-bold">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-3 rounded-full text-sm font-medium hover:border-[#FFC928] transition-colors"
          >
            <Filter size={16} />
            Filtros
            {hasFilters && <span className="bg-[#FFC928] text-[#111] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">!</span>}
          </button>

          <button
            onClick={() => {
              if (nearbyEnabled) {
                setNearbyEnabled(false);
              } else if (userLocation) {
                setNearbyEnabled(true);
              } else {
                setGeoLoading(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setNearbyEnabled(true);
                    setGeoLoading(false);
                  },
                  (err) => {
                    setGeoLoading(false);
                    if (err.code === 1) toast.error('Permissão de localização negada');
                    else toast.error('Erro ao obter localização');
                  }
                );
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border flex items-center gap-1.5 ${
              nearbyEnabled ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFC928]'
            }`}
          >
            <MapPin size={14} className={geoLoading ? 'animate-pulse' : ''} />
            {nearbyEnabled ? 'Perto de mim' : geoLoading ? 'Obtendo local...' : 'Perto de mim'}
          </button>

          <button
            onClick={() => setFilterOpenNow(!filterOpenNow)}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border ${filterOpenNow ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFC928]'}`}
          >
            Aberto agora
          </button>
          <button
            onClick={() => setFilterDelivery(!filterDelivery)}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border ${filterDelivery ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFC928]'}`}
          >
            Com delivery
          </button>
          <button
            onClick={() => setFilterPickup(!filterPickup)}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border ${filterPickup ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFC928]'}`}
          >
            Com retirada
          </button>
          {['low', 'medium', 'high'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriceRange(filterPriceRange === p ? null : p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterPriceRange === p ? 'bg-[#111] text-white border-[#111]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#FFC928]'}`}
            >
              {priceLabels[p as keyof typeof priceLabels]}
            </button>
          ))}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-500 font-medium hover:text-red-700">
              <X size={14} /> Limpar
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">Filtrar por Bairro</h4>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    <button
                      onClick={() => setFilterNeighbourhood(null)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors border ${
                        !filterNeighbourhood
                          ? 'bg-[#111] text-white border-[#111]'
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-[#FFC928]'
                      }`}
                    >
                      Todos os Bairros
                    </button>
                    {neighborhoods.map(n => (
                      <button
                        key={n}
                        onClick={() => setFilterNeighbourhood(filterNeighbourhood === n ? null : n)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors border ${
                          filterNeighbourhood === n
                            ? 'bg-[#111] text-white border-[#111]'
                            : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-[#FFC928]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">Estrutura e Gestão</h4>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setFilterIndependent(!filterIndependent)}
                      className={`w-full text-left font-bold text-xs p-3 rounded-2xl flex items-center justify-between border transition-all ${
                        filterIndependent
                          ? 'bg-[#FFC928]/10 text-slate-800 border-[#FFC928]'
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-[#FFC928]'
                      }`}
                    >
                      <span>👤 Restaurante Independente</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${filterIndependent ? 'bg-black text-[#FFC928] border-black' : 'border-gray-300'}`}>
                        {filterIndependent && '✓'}
                      </span>
                    </button>

                    <button
                      onClick={() => setFilterFamilyRun(!filterFamilyRun)}
                      className={`w-full text-left font-bold text-xs p-3 rounded-2xl flex items-center justify-between border transition-all ${
                        filterFamilyRun
                          ? 'bg-[#FFC928]/10 text-slate-800 border-[#FFC928]'
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-[#FFC928]'
                      }`}
                    >
                      <span>❤️ Familiar / Comercial Local</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${filterFamilyRun ? 'bg-black text-[#FFC928] border-black' : 'border-gray-300'}`}>
                        {filterFamilyRun && '✓'}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">Filosofia Meu Ovo</h4>
                  <div className="bg-[#FF7A00]/5 border border-[#FF7A00]/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-[#FF7A00] leading-normal mb-1">🍳 100% Pedidos Diretos</p>
                    <p className="text-[9px] font-semibold text-slate-500 leading-normal">
                      Ao pedir pelo Meu Ovo, você compra diretamente do restaurante independente, sem intermediários corporativos e taxas abusivas de 30% dos marketplaces convencionais.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h2 className="font-display font-black text-[#111] text-2xl tracking-tight">
            {initialLoading ? '—' : filtered.length} {filtered.length === 1 ? 'restaurante' : 'restaurantes'} {selectedCity && `em ${selectedCity}`}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ordenar</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-sm font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="relevance">Relevância</option>
              <option value="delivery">Entrega mais rápida</option>
              <option value="name">A-Z</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-xs font-medium">
            {pageError}
          </div>
        )}

        {/* Abandoned cart banner */}
        {cartItems.length > 0 && (
          <Link
            to="/carrinho"
            className="block mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand-egg/20 to-yellow-400/20 border border-brand-egg/30 hover:from-brand-egg/30 hover:to-yellow-400/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <div>
                  <p className="font-black text-sm text-[#111] uppercase tracking-tight">
                    Você tem {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'} no carrinho
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                    Finalize seu pedido agora
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-brand-egg group-hover:translate-x-1 transition-transform">
                Ir para o carrinho →
              </span>
            </div>
          </Link>
        )}

        {/* Quick Reorder Card */}
        {lastOrder && lastOrder.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <SectionHeader
              subtitle="Pedir de novo 🔄"
              title="Seu último pedido"
              description={`${lastOrder.items.length} ${lastOrder.items.length === 1 ? 'item' : 'itens'} • R$ ${lastOrder.total.toFixed(2)}`}
              align="left"
              subtitleClass="text-emerald-600"
              className="mb-4"
            />
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-[#111] uppercase tracking-tight truncate">
                      {contextRestaurants.find(r => r.id === lastOrder.restaurantId)?.name || 'Restaurante'}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(lastOrder.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {lastOrder.items.length} {lastOrder.items.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  <span className="text-xs font-black text-emerald-600">R$ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {lastOrder.items.slice(0, 4).map((item, i) => (
                    <span key={i} className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {item.quantity}x {item.productName}
                    </span>
                  ))}
                  {lastOrder.items.length > 4 && (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      +{lastOrder.items.length - 4} mais
                    </span>
                  )}
                </div>
                <Link
                  to={`/r/${contextRestaurants.find(r => r.id === lastOrder.restaurantId)?.slug || ''}`}
                  className="w-full bg-emerald-50 text-emerald-700 font-black py-3 rounded-2xl hover:bg-emerald-100 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-200"
                >
                  <RotateCcw size={14} />
                  Pedir de novo
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Personalized shelf */}
        {!initialLoading && hasMinHistory() && (
          <div className="mb-10">
            <SectionHeader
              subtitle="Pra Você 🎯"
              title="Descobertas para Você"
              description="Baseado nas suas preferências e histórico"
              align="left"
              subtitleClass="text-purple-600"
              className="mb-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {scoreRestaurantsForUser(pageRestaurants, orders, getUserProfile()).slice(0, 3).map(r => (
                <RestaurantCard key={`personal-${r.id}`} restaurant={r} onShare={(e) => handleShare(e, r)} />
              ))}
            </div>
          </div>
        )}

        {/* Restaurant grid */}
        {initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="font-black text-[#111] text-xl mb-2">Nenhum restaurante encontrado</h3>
            <p className="text-gray-500">Tente outros filtros ou busque por outro tipo de comida.</p>
            <button onClick={clearFilters} className="mt-4 bg-[#FFC928] text-[#111] font-bold px-6 py-3 rounded-full">
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(r => (
                <RestaurantCard key={r.id} restaurant={r} onShare={(e) => handleShare(e, r)} />
              ))}
            </div>

            {/* Load More */}
            {showLoadMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={pageLoading}
                  className="bg-white border-2 border-[#111] text-[#111] font-black px-10 py-4 rounded-2xl text-sm hover:bg-[#111] hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {pageLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Carregando...</>
                  ) : (
                    <>Carregar mais restaurantes <ChevronDown size={18} /></>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Curated shelves for Local Discovery */}
        <div className="mt-16 space-y-16 mb-20 border-t border-gray-100 pt-12">
          {/* Section 1: Restaurantes Familiares do Bairro */}
          <div>
            <SectionHeader
              subtitle="Liderados por Famílias ❤️"
              title="Restaurantes Familiares do Bairro"
              description="A comida com tempero, afeto e receitas de gerações"
              align="left"
              subtitleClass="text-[#FF7A00]"
              className="mb-8"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`family-skeleton-${i}`} />)
              ) : (
                contextRestaurants.filter(r => r.familyRun).map(r => (
                  <RestaurantCard key={`family-${r.id}`} restaurant={r} onShare={(e) => handleShare(e, r)} />
                ))
              )}
            </div>
          </div>

          {/* Section 2: Proprietários Independentes */}
          <div className="bg-[#111111] text-white -mx-4 md:-mx-8 px-6 md:px-12 py-12 rounded-[2.5rem] my-12 border-l-4 border-[#FFC928]">
            <SectionHeader
              subtitle="Soberania Local 👤"
              title="Apoie Empreendedores Independentes"
              description="Onde o valor do seu pedido apoia pessoas e não conglomerados corporativos"
              align="left"
              subtitleClass="text-[#FFC928]"
              titleClass="text-[#FFC928]"
              className="mb-8"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`independent-skeleton-${i}`} />)
              ) : (
                contextRestaurants.filter(r => r.isIndependent).map(r => (
                  <RestaurantCard key={`independent-${r.id}`} restaurant={r} onShare={(e) => handleShare(e, r)} />
                ))
              )}
            </div>
          </div>

          {/* Section 3: Mais Pedidos Próximos de Você */}
          <div>
            <SectionHeader
              subtitle="Os favoritos do Bairro 🔥"
              title="Mais Pedidos Perto de Você"
              description="Os estabelecimentos mais requisitados da nossa comunidade local"
              align="left"
              subtitleClass="text-amber-600"
              className="mb-8"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`featured-skeleton-${i}`} />)
              ) : (
                contextRestaurants.slice(0, 3).map(r => (
                  <RestaurantCard key={`featured-${r.id}`} restaurant={r} featured onShare={(e) => handleShare(e, r)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ShareModal 
        isOpen={shareData.isOpen}
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
        url={shareData.url}
        title={shareData.title}
      />

      <Footer />
    </div>
    </>
  );
}

const RestaurantCard: React.FC<{ 
  restaurant: Restaurant; 
  featured?: boolean;
  onShare: (e: React.MouseEvent) => void;
}> = ({ restaurant: r, featured, onShare }) => {
  const { favorites, toggleFavorite, products } = useRestaurant();
  const isFav = favorites.includes(r.id);
  const hasPromo = products.some(p => p.restaurantId === r.id && p.onPromotion && p.promotionPrice && p.price > p.promotionPrice);

  return (
    <Link to={`/r/${r.slug}`} onClick={() => trackRestaurantView(r.id, r.cuisineType)} className="group block">
      <div className={`bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 ${featured ? 'ring-2 ring-[#FFC928] ring-offset-2' : 'border border-gray-100'}`}>
        <div className="relative h-48 overflow-hidden">
          <OptimizedImage
            src={r.coverImage}
            alt={r.name}
            width={400}
            height={192}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <Badge>🍳 Direto</Badge>
            {r.isOpen ? (
              <Badge variant="success">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Aberto
              </Badge>
            ) : (
              <Badge variant="outline">Fechado</Badge>
            )}
            {hasPromo && (
              <Badge variant="danger" className="animate-pulse">🔥 Promo</Badge>
            )}
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button 
              onClick={onShare}
              className="p-3 bg-black/50 rounded-full text-white hover:bg-[#FFC928] hover:text-[#111] transition-all shadow-lg"
              aria-label="Compartilhar restaurante"
            >
              <Share2 size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(r.id);
              }}
              className={`p-3 rounded-full transition-all shadow-lg ${
                isFav 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-black/50 text-white hover:bg-red-500 hover:text-white'
              }`}
              title={isFav ? "Remover dos favoritos" : "Favoritar"}
              aria-label="Favoritar restaurante"
            >
              <Heart size={14} className={isFav ? "fill-white" : ""} />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-black text-white text-xl leading-tight drop-shadow-lg">{r.name}</h3>
                <p className="text-gray-200 text-xs font-semibold drop-shadow">{r.cuisineType} • {r.neighborhood}</p>
              </div>
              <div className="bg-black/50 rounded-full p-1 shadow-lg">
                <OptimizedImage
                  src={r.logo}
                  alt={r.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          {featured && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFC928] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-lg tracking-wider animate-pulse">
                🔥 Em alta esta semana
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
              <span className="font-semibold">{r.priceRange === 'low' ? '$' : r.priceRange === 'medium' ? '$$' : '$$$'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs bg-gray-50 px-2.5 py-1 rounded-full">
              <Clock size={12} />
              <span className="font-semibold">{r.estimatedTime} min</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4 py-2.5 border-y border-gray-100">
            {r.foundedYear && (
              <span className="text-[9px] font-extrabold uppercase tracking-tight bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                ⏳ {2026 - r.foundedYear} anos no bairro
              </span>
            )}
            {r.isIndependent && (
              <span className="text-[9px] font-extrabold uppercase tracking-tight bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                👤 Independente
              </span>
            )}
            {r.familyRun && (
              <span className="text-[9px] font-extrabold uppercase tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg">
                ❤️ Familiar
              </span>
            )}
            <span className="text-[9px] font-extrabold uppercase tracking-tight bg-[#FFC928]/10 text-[#B8860B] border border-[#FFC928]/30 px-2 py-0.5 rounded-lg">
              🍳 Pedido Direto
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="p-1 bg-gray-50 rounded-md">
                <Truck size={12} className="text-gray-500" />
              </div>
              {r.deliveryEnabled ? (
                r.deliveryFee === 0 ? (
                  <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md text-[11px]">Grátis</span>
                ) : (
                  <span className="text-gray-500">R$ {((r.deliveryFee ?? 0)).toFixed(2)}</span>
                )
              ) : (
                <span className="text-gray-400">Sem delivery</span>
              )}
            </div>
            <span className="font-extrabold text-sm bg-gradient-to-r from-[#FF7A00] to-[#FFC928] bg-clip-text text-transparent">
              {priceLabels[r.priceRange]}
            </span>
          </div>

          {r.minimumOrder > 0 && (
            <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-gray-300" />
              Pedido mínimo: R$ {r.minimumOrder.toFixed(2)}
            </p>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="bg-[#111111] text-[#FFC928] text-xs font-black text-center py-2 rounded-xl group-hover:bg-[#FFC928] group-hover:text-[#111] transition-colors">
            Ver cardápio
          </div>
        </div>
      </div>
    </Link>
  );
}
