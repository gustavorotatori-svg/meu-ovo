import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, SlidersHorizontal, Star, Clock, Truck, X, ChevronDown, Filter, Share2, Utensils, Building2, Landmark, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import OptimizedImage from '../components/OptimizedImage';
import ShareModal from '../components/ShareModal';
import VoiceSearch from '../components/VoiceSearch';
import SEO from '../components/SEO';
import { RestaurantCardSkeleton } from '../components/Skeleton';
import { cuisineTypes, cuisineEmojis } from '../data/mockData';
import { Restaurant } from '../types';
import { useRestaurant } from '../context/RestaurantContext';
import { rankRestaurants } from '../lib/recommendations';

const priceLabels = { low: 'R$', medium: 'R$ R$', high: 'R$ R$ R$' };

export default function MarketplacePage() {
  const { restaurants, orders, products } = useRestaurant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState('São Paulo');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setLoadingProgress(0);

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 12) + 8;
        const next = prev + increment;
        return next > 95 ? 95 : next;
      });
    }, 100);

    const timer = setTimeout(() => {
      setLoadingProgress(100);
      const finishTimer = setTimeout(() => {
        setIsLoading(false);
      }, 200);
      return () => clearTimeout(finishTimer);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const suggestions = useMemo(() => {
    if (search.length < 2) return [];
    
    const searchLower = search.toLowerCase();
    const matches: { type: 'restaurant' | 'cuisine' | 'neighborhood'; value: string; extra?: string }[] = [];
    
    // Check cuisines
    cuisineTypes.forEach(c => {
      if (c.toLowerCase().includes(searchLower)) {
        matches.push({ type: 'cuisine', value: c });
      }
    });

    // Check restaurants & neighborhoods
    restaurants.forEach(r => {
      if (r.name.toLowerCase().includes(searchLower)) {
        matches.push({ type: 'restaurant', value: r.name, extra: r.cuisineType });
      }
      if (r.neighborhood.toLowerCase().includes(searchLower)) {
        const neighborhoodValue = `${r.neighborhood}, ${r.city}`;
        if (!matches.some(m => m.value === neighborhoodValue)) {
          matches.push({ type: 'neighborhood', value: neighborhoodValue });
        }
      }
    });

    return matches.slice(0, 8);
  }, [search, restaurants]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
    setShowSuggestions(false);
  };
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(searchParams.get('cuisine'));

  useEffect(() => {
    const term = searchParams.get('search') || searchParams.get('q');
    if (term !== null) {
      setSearch(term);
    }
    const cuis = searchParams.get('cuisine');
    if (cuis !== null) {
      setSelectedCuisine(cuis);
    }
  }, [searchParams]);

  const [showFilters, setShowFilters] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterPickup, setFilterPickup] = useState(false);
  const [filterPriceRange, setFilterPriceRange] = useState<string | null>(null);
  const [filterIndependent, setFilterIndependent] = useState(false);
  const [filterFamilyRun, setFilterFamilyRun] = useState(false);
  const [filterNeighbourhood, setFilterNeighbourhood] = useState<string | null>(null);

  const neighborhoods = useMemo(() => {
    const list = restaurants
      .filter(r => !selectedCity || r.city === selectedCity)
      .map(r => r.neighborhood);
    return Array.from(new Set(list));
  }, [restaurants, selectedCity]);
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

  // Intelligence: Analyze user patterns
  // In a real app we'd filter orders by the current user's phone/ID
  // For this prototype, we use the orders in the context as the "history"
  const rankedRestaurants = useMemo(() => {
    return rankRestaurants(restaurants, orders);
  }, [restaurants, orders]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    // Find products that match search to include their restaurants
    const matchingProductRestaurantIds = searchLower.length > 2 
      ? new Set(products.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description?.toLowerCase().includes(searchLower)
        ).map(p => p.restaurantId))
      : new Set();

    return rankedRestaurants.filter(r => {
      const matchesSearch = !search || 
        r.name.toLowerCase().includes(searchLower) || 
        r.cuisineType.toLowerCase().includes(searchLower) ||
        r.neighborhood.toLowerCase().includes(searchLower) ||
        r.city.toLowerCase().includes(searchLower) ||
        matchingProductRestaurantIds.has(r.id);

      if (!matchesSearch) return false;
      if (selectedCity && r.city !== selectedCity) return false;
      if (selectedCuisine && r.cuisineType !== selectedCuisine) return false;
      if (filterOpenNow && !r.isOpen) return false;
      if (filterDelivery && !r.deliveryEnabled) return false;
      if (filterPickup && !r.pickupEnabled) return false;
      if (filterPriceRange && r.priceRange !== filterPriceRange) return false;
      if (filterIndependent && !r.isIndependent) return false;
      if (filterFamilyRun && !r.familyRun) return false;
      if (filterNeighbourhood && r.neighborhood !== filterNeighbourhood) return false;
      return true;
    });
  }, [search, selectedCity, selectedCuisine, filterOpenNow, filterDelivery, filterPickup, filterPriceRange, filterIndependent, filterFamilyRun, filterNeighbourhood, rankedRestaurants, products]);

  const clearFilters = () => {
    setSelectedCuisine(null);
    setFilterOpenNow(false);
    setFilterDelivery(false);
    setFilterPickup(false);
    setFilterPriceRange(null);
    setFilterIndependent(false);
    setFilterFamilyRun(false);
    setFilterNeighbourhood(null);
    setSearch('');
    setSearchParams({});
  };

  const hasFilters = selectedCuisine || filterOpenNow || filterDelivery || filterPickup || filterPriceRange || filterIndependent || filterFamilyRun || filterNeighbourhood || search;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SEO 
        title="Busca de Restaurantes"
        description="Encontre os melhores restaurantes perto de você. Peça direto, sem intermediários e com impacto social real."
      />
      <Navbar />

      {/* Hero search */}
      <div className="bg-[#111111] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white text-center mb-4 leading-tight">
            O que você quer comer hoje?
          </h1>
          <p className="text-gray-400 text-center mb-8 font-medium">Pedido direto. Sem comissão. Apoie o restaurante local.</p>
          <div className="bg-white rounded-3xl flex items-center gap-3 p-2 shadow-2xl border-4 border-white/10">
            <div className="flex items-center gap-2 border-r border-gray-100 pr-5 pl-4 py-2">
              <MapPin size={22} className="text-[#FFC928]" />
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="text-sm text-gray-700 bg-transparent outline-none font-black uppercase tracking-widest cursor-pointer"
              >
                <option>São Paulo</option>
                <option>Rio de Janeiro</option>
                <option>Belo Horizonte</option>
              </select>
            </div>
            <div className="flex-1 flex items-center gap-2 relative">
              <Search size={22} className="text-gray-400 ml-4" />
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
                className="flex-1 outline-none text-base font-bold text-gray-700 placeholder-gray-400"
              />
              <VoiceSearch onTranscript={(text) => setSearch(text)} className="p-3" />

              {/* Autocomplete Suggestions */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(s.value)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all text-left group"
                      >
                        <div className={`p-3 rounded-xl ${
                          s.type === 'cuisine' ? 'bg-orange-100 text-orange-600' : 
                          s.type === 'restaurant' ? 'bg-blue-100 text-blue-600' : 
                          'bg-green-100 text-green-600'
                        }`}>
                          {s.type === 'cuisine' ? <Utensils size={18} /> : 
                           s.type === 'restaurant' ? <Building2 size={18} /> : 
                           <MapPin size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-[#FFC928] transition-colors">{s.value}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
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
              <button onClick={() => setSearch('')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            )}
            <button className="bg-[#FFC928] text-[#111] font-display font-black px-8 py-4 rounded-2xl text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#FFC928]/20">
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
                onClick={() => setSelectedCuisine(selectedCuisine === c ? null : c)}
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
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:border-[#FFC928] transition-colors"
          >
            <Filter size={16} />
            Filtros
            {hasFilters && <span className="bg-[#FFC928] text-[#111] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">!</span>}
          </button>

          <button
            onClick={() => setFilterOpenNow(!filterOpenNow)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterOpenNow ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-200 hover:border-[#FFC928]'}`}
          >
            Aberto agora
          </button>
          <button
            onClick={() => setFilterDelivery(!filterDelivery)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterDelivery ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-200 hover:border-[#FFC928]'}`}
          >
            Com delivery
          </button>
          <button
            onClick={() => setFilterPickup(!filterPickup)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterPickup ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-200 hover:border-[#FFC928]'}`}
          >
            Com retirada
          </button>
          {['low', 'medium', 'high'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriceRange(filterPriceRange === p ? null : p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${filterPriceRange === p ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-200 hover:border-[#FFC928]'}`}
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display font-black text-[#111] text-2xl tracking-tight">
            {filtered.length} {filtered.length === 1 ? 'restaurante' : 'restaurantes'} {selectedCity && `em ${selectedCity}`}
          </h2>
        </div>

        {/* Restaurant grid */}
        {isLoading ? (
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl p-6 border-2 border-dashed border-[#FFC928]/30 shadow-xl shadow-[#FFC928]/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A00] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF7A00]"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-[#111111] font-display">
                    Sincronizando estabelecimentos e cardápios...
                  </span>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="text-[10px] uppercase font-black text-gray-400">conexão estável</span>
                  <span className="text-xs font-black text-[#FF7A00] font-mono bg-orange-50 px-2 py-0.5 rounded-md">{loadingProgress}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3.5 p-[2px] overflow-hidden">
                <motion.div 
                  initial={{ width: '0%' }}
                  animate={{ width: `${loadingProgress}%` }}
                  className="bg-gradient-to-r from-[#FFC928] to-[#FF7A00] h-full rounded-full shadow-[0_0_8px_rgba(255,201,40,0.5)]"
                  transition={{ ease: "easeInOut" }}
                />
              </div>
              <p className="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                Carregando cardápios locais de {selectedCity} • 100% livre de taxas para os restaurantes • Totalmente direto
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(r => (
              <RestaurantCard key={r.id} restaurant={r} onShare={(e) => handleShare(e, r)} />
            ))}
          </div>
        )}

        {/* Curated shelves for Local Discovery */}
        <div className="mt-16 space-y-16 mb-20 border-t border-gray-100 pt-12">
          {/* Section 1: Restaurantes Familiares do Bairro */}
          <div>
            <div className="flex flex-col gap-1 mb-8">
              <span className="text-xs font-black uppercase text-[#FF7A00] tracking-widest">Liderados por Famílias ❤️</span>
              <h2 className="font-display font-black text-[#111] text-2xl md:text-3xl tracking-tight leading-none uppercase italic">Restaurantes Familiares do Bairro</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">A comida com tempero, afeto e receitas de gerações</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`family-skeleton-${i}`} />)
              ) : (
                restaurants.filter(r => r.familyRun).map(r => (
                  <RestaurantCard key={`family-${r.id}`} restaurant={r} onShare={(e) => handleShare(e, r)} />
                ))
              )}
            </div>
          </div>

          {/* Section 2: Proprietários Independentes */}
          <div className="bg-[#111111] text-white -mx-4 md:-mx-8 px-6 md:px-12 py-12 rounded-[2.5rem] my-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full bg-[#FFC928]/5 -z-10" />
            <div className="flex flex-col gap-1 mb-8">
              <span className="text-xs font-black uppercase text-[#FFC928] tracking-widest">Soberania Local 👤</span>
              <h2 className="font-display font-black text-[#FFC928] text-2xl md:text-3xl tracking-tight leading-none uppercase italic">Apoie Empreendedores Independentes</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Onde o valor do seu pedido apoia pessoas e não conglomerados corporativos</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`independent-skeleton-${i}`} />)
              ) : (
                restaurants.filter(r => r.isIndependent).map(r => (
                  <RestaurantCard key={`independent-${r.id}`} restaurant={r} onShare={(e) => handleShare(e, r)} />
                ))
              )}
            </div>
          </div>

          {/* Section 3: Mais Pedidos Próximos de Você */}
          <div>
            <div className="flex flex-col gap-1 mb-8">
              <span className="text-xs font-black uppercase text-amber-600 tracking-widest">Os favoritos do Bairro 🔥</span>
              <h2 className="font-display font-black text-[#111] text-2xl md:text-3xl tracking-tight leading-none uppercase italic">Mais Pedidos Perto de Você</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Os estabelecimentos mais requisitados da nossa comunidade local</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoading ? (
                [...Array(3)].map((_, i) => <RestaurantCardSkeleton key={`featured-skeleton-${i}`} />)
              ) : (
                restaurants.slice(0, 3).map(r => (
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
  );
}

const RestaurantCard: React.FC<{ 
  restaurant: Restaurant; 
  featured?: boolean;
  onShare: (e: React.MouseEvent) => void;
}> = ({ restaurant: r, featured, onShare }) => {
  const { favorites, toggleFavorite } = useRestaurant();
  const isFav = favorites.includes(r.id);

  return (
    <Link to={`/r/${r.slug}`} className="group block">
      <div className={`bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 ${featured ? 'ring-2 ring-[#FFC928] ring-offset-2' : 'border border-gray-100'}`}>
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden">
          <OptimizedImage
            src={r.coverImage}
            alt={r.name}
            width={400}
            height={192}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <span className="bg-[#FFC928] text-[#111] text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
              🍳 Direto
            </span>
            {r.isOpen ? (
              <span className="bg-green-500/90 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Aberto
              </span>
            ) : (
              <span className="bg-gray-500/80 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
                Fechado
              </span>
            )}
          </div>

          {/* Top Right Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button 
              onClick={onShare}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-[#FFC928] hover:text-[#111] transition-all shadow-lg hover:scale-110"
            >
              <Share2 size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(r.id);
              }}
              className={`p-2.5 backdrop-blur-md rounded-full transition-all shadow-lg hover:scale-110 ${
                isFav 
                  ? 'bg-red-500/90 text-white hover:bg-red-600' 
                  : 'bg-white/20 text-white hover:bg-red-500 hover:text-white'
              }`}
              title={isFav ? "Remover dos favoritos" : "Favoritar"}
            >
              <Heart size={14} className={isFav ? "fill-white" : ""} />
            </button>
          </div>

          {/* Bottom Info Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-black text-white text-xl leading-tight drop-shadow-lg">{r.name}</h3>
                <p className="text-gray-200 text-xs font-semibold drop-shadow">{r.cuisineType} • {r.neighborhood}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-full p-1.5 shadow-lg ring-2 ring-white/30">
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
          {/* Rating + Time Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <Star size={14} className="text-[#FFC928] fill-[#FFC928]" />
                <span className="font-bold text-sm text-[#111]">{r.rating}</span>
              </div>
              <span className="text-gray-200">|</span>
              <span className="text-gray-400 text-xs font-medium">{r.reviewCount} avaliações</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-xs bg-gray-50 px-2.5 py-1 rounded-full">
              <Clock size={12} />
              <span className="font-semibold">{r.estimatedTime} min</span>
            </div>
          </div>

          {/* Strategic Humanizer Stamps */}
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

          {/* Delivery + Price Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <div className="p-1 bg-gray-50 rounded-md">
                <Truck size={12} className="text-gray-500" />
              </div>
              {r.deliveryEnabled ? (
                r.deliveryFee === 0 ? (
                  <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md text-[11px]">Grátis</span>
                ) : (
                  <span className="text-gray-500">R$ {r.deliveryFee.toFixed(2)}</span>
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
