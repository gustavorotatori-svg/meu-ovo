import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Clock, 
  Truck, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ArrowLeft, 
  MessageCircle, 
  Share2, 
  Heart,
  AlertTriangle,
  Flame,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Badge from '../components/Badge';
import { useCart } from '../context/CartContext';
import { useRestaurant } from '../context/RestaurantContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Product, CartItem, Category, Additional, FlashDeal } from '../types';
import { ALLERGEN_MAP } from '../data/allergens';
import { motion, AnimatePresence } from 'motion/react';
import OptimizedImage from '../components/OptimizedImage';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ShareModal from '../components/ShareModal';
import FlashDealTimer from '../components/FlashDealTimer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { Skeleton } from '../components/Skeleton';
import { WA_NUMBER } from '../services/whatsappService';
import { cn } from '../lib/utils';

// Helper to match emojis to category names dynamically
const getCategoryEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('promo') || n.includes('oferta') || n.includes('desconto')) return '🏷️';
  if (n.includes('mais vend') || n.includes('favorit') || n.includes('popular')) return '🔥';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('hamb') || n.includes('burg')) return '🍔';
  if (n.includes('massa') || n.includes('italiana')) return '🍝';
  if (n.includes('marmita') || n.includes('prato') || n.includes('brasileir')) return '🍱';
  if (n.includes('bebida') || n.includes('refr') || n.includes('suco') || n.includes('cervej')) return '🥤';
  if (n.includes('sobremesa') || n.includes('doce') || n.includes('chocolat')) return '🍰';
  if (n.includes('porção') || n.includes('entradas') || n.includes('batata')) return '🍟';
  if (n.includes('salada') || n.includes('fit') || n.includes('sauda')) return '🥗';
  return '🍽️';
};

// Generates dynamic high-quality mock database items for other restaurants so the page is never blank
const getFallbackMenu = (restaurantId: string, cuisineType = '') => {
  const cuisine = cuisineType.toLowerCase();

  const ensureProductType = (item: Partial<Product>): Product => {
    return {
      isFeatured: false,
      onPromotion: false,
      createdAt: '2026-01-15',
      isActive: true,
      order: 0,
      bestSeller: false,
      isAvailable: true,
      additionalGroups: [],
      estimatedPrepTime: 15,
      ...item
    } as Product;
  };
  
  if (restaurantId === '1' || cuisine.includes('pizza')) {
    const cats: Category[] = [
      { id: 'cat1-f', restaurantId, name: 'Promoções 🏷️', order: 0 },
      { id: 'cat2-f', restaurantId, name: 'Mais Vendidas 🔥', order: 1 },
      { id: 'cat3-f', restaurantId, name: 'Pizzas Salgadas 🍕', order: 2 },
      { id: 'cat4-f', restaurantId, name: 'Pizzas Doces 🍫', order: 3 },
      { id: 'cat5-f', restaurantId, name: 'Bebidas Recipientes 🥤', order: 4 },
    ];
    
    const prods: Product[] = [
      ensureProductType({
        id: 'p1-f',
        restaurantId,
        name: 'Pizza Calabresa Artesanal',
        description: 'Molho de tomate artesanal da casa, mussarela gratinada, linguiça calabresa defumada fatiada de primeira linha, cebola roxa fresca e orégano.',
        price: 49.90,
        categoryId: 'cat2-f',
        imageUrl: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        bestSeller: true,
        estimatedPrepTime: 25,
        ingredients: 'Massa fermentada 24h, molho de tomate pelado, mussarela premium, calabresa especial, cebola e azeitonas.',
        allergens: 'Contém glúten, contém lactose.',
        additionalGroups: [
          {
            id: 'ag1',
            name: 'Tamanho da Pizza',
            type: 'single',
            items: [
              { id: 'a1', name: 'Broto (4 fatias)', price: -15 },
              { id: 'a2', name: 'Média (6 fatias)', price: 0 },
              { id: 'a3', name: 'Grande Familiar (8 fatias)', price: 10 },
            ]
          }
        ]
      }),
      ensureProductType({
        id: 'p2-f',
        restaurantId,
        name: 'Pizza Portuguesa Tradicional',
        description: 'Presunto cozido fatiado fininho, mussarela, ervilhas frescas cozidas no vapor, ovos caipiras cozidos picados e azeitonas pretas chilenas.',
        price: 54.90,
        categoryId: 'cat3-f',
        imageUrl: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        onPromotion: true,
        promotionPrice: 44.90,
        estimatedPrepTime: 30,
        ingredients: 'Massa artesanal, mussarela, presunto premium, ovos, ervilha, cebola e azeite de oliva extra virgem.',
        allergens: 'Contém ovos, glúten e lactose.'
      }),
      ensureProductType({
        id: 'p3-f',
        restaurantId,
        name: 'Pizza Margherita Gourmet',
        description: 'Mussarela de búfala fresca, fatias de tomate caipira selecionado, folhas frescas de manjericão gigante colhidas na horta e fio de azeite.',
        price: 59.90,
        categoryId: 'cat2-f',
        imageUrl: 'https://images.pexels.com/photos/1435928/pexels-photo-1435928.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        bestSeller: true,
        estimatedPrepTime: 20
      }),
      ensureProductType({
        id: 'p4-f',
        restaurantId,
        name: 'Combo Casal Meu Ovo',
        description: '1 Pizza Grande (Calabresa ou Margherita) + 1 Guaraná Antarctica 2L trincando + 2 mini churros recheados de doce de leite.',
        price: 89.90,
        categoryId: 'cat1-f',
        imageUrl: 'https://images.pexels.com/photos/367915/pexels-photo-367915.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        bestSeller: true,
        onPromotion: true,
        promotionPrice: 79.90,
        estimatedPrepTime: 35
      }),
      ensureProductType({
        id: 'p5-f',
        restaurantId,
        name: 'Pizza Doce Ninho com Nutella',
        description: 'Base de creme de leite trufado com chocolate, chocolate de avelã Nutella original e salpicado de leite em pó Ninho.',
        price: 45.00,
        categoryId: 'cat4-f',
        imageUrl: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        estimatedPrepTime: 20
      }),
      ensureProductType({
        id: 'p6-f',
        restaurantId,
        name: 'Coca-Cola Zero Lata',
        description: 'Refrigerante lata 350ml trincando de gelada, perfeita para acompanhar sua pizza.',
        price: 6.50,
        categoryId: 'cat5-f',
        imageUrl: 'https://images.pexels.com/photos/2983100/pexels-photo-2983100.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        estimatedPrepTime: 5
      })
    ];
    return { cats, prods };
  }
  
  if (restaurantId === '2' || cuisine.includes('hamb') || cuisine.includes('burg')) {
    const cats: Category[] = [
      { id: 'cat1-b', restaurantId, name: 'Combos Especiais 🎁', order: 0 },
      { id: 'cat2-b', restaurantId, name: 'Burgers Artesanais 🍔', order: 1 },
      { id: 'cat3-b', restaurantId, name: 'Porções & Fritos 🍟', order: 2 },
      { id: 'cat4-b', restaurantId, name: 'Bebidas Geladas 🥤', order: 3 },
    ];
    
    const prods: Product[] = [
      ensureProductType({
        id: 'b1',
        restaurantId,
        name: 'Soberano Bacon Burger',
        description: 'Pão brioche selado na manteiga, blend angus suculento de 150g na grelha, fatias generosas de bacon crocante caramelizado e cheddar inglês.',
        price: 36.90,
        categoryId: 'cat2-b',
        imageUrl: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        bestSeller: true,
        estimatedPrepTime: 15,
        ingredients: 'Pão brioche, carne de angus fresca grelhada, queijo cheddar artesanal, maionese defumada defumada e bacon torrado.',
        allergens: 'Contém glúten, leite, derivados de soja.',
        additionalGroups: [
          {
            id: 'b_ag1',
            name: 'Ponto da Carne',
            type: 'single',
            items: [
              { id: 'bp1', name: 'Bem Passado', price: 0 },
              { id: 'bp2', name: 'Ao Ponto do Chefe', price: 0 },
              { id: 'bp3', name: 'Mal Passado', price: 0 },
            ]
          },
          {
            id: 'b_ag2',
            name: 'Adicionais de Peso',
            type: 'multiple',
            items: [
              { id: 'ba1', name: 'Blend Extra 155g', price: 9.90 },
              { id: 'ba2', name: 'Bacon fatiado extra', price: 4.50 },
              { id: 'ba3', name: 'Queijo Cheddar Triplo', price: 4.00 },
            ]
          }
        ]
      }),
      ensureProductType({
        id: 'b2',
        restaurantId,
        name: 'Smash Duplo Defumado',
        description: 'Duas carnes smash de 80g prensadas na chapa quente, crostinha perfeita, cebola chapeada ultra fina, molho especial defumado e picles.',
        price: 29.90,
        categoryId: 'cat2-b',
        imageUrl: 'https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        onPromotion: true,
        promotionPrice: 24.90,
        estimatedPrepTime: 12
      }),
      ensureProductType({
        id: 'b3',
        restaurantId,
        name: 'Combo Brabo da Praça',
        description: '1 Soberano Bacon Burger + 1 Porção Individual batatas rústicas com páprica + 1 refri lata trincando de gelado à sua escolha.',
        price: 58.00,
        categoryId: 'cat1-b',
        imageUrl: 'https://images.pexels.com/photos/2725744/pexels-photo-2725744.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        bestSeller: true,
        estimatedPrepTime: 20
      }),
      ensureProductType({
        id: 'b4',
        restaurantId,
        name: 'Batata Rústica Divina',
        description: 'Batatas com casca fritas ao ponto perfeito de crocância, finalizadas com flor de sal e alecrim fresco e maionese verde da casa.',
        price: 15.90,
        categoryId: 'cat3-b',
        imageUrl: 'https://images.pexels.com/photos/1893556/pexels-photo-1893556.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        estimatedPrepTime: 10
      }),
      ensureProductType({
        id: 'b5',
        restaurantId,
        name: 'Água Tônica de Alecrim',
        description: 'Garrafa 350ml de água tônica artesanal aromatizada com alecrim e notas de tangerina.',
        price: 8.00,
        categoryId: 'cat4-b',
        imageUrl: 'https://images.pexels.com/photos/40594/shaker-cocktail-glass-alcohol-40594.jpeg?w=500&h=400&fit=crop',
        isAvailable: true,
        estimatedPrepTime: 2
      })
    ];
    return { cats, prods };
  }

  // Fallback for Brazilian / Marmitas / Lunch
  const cats: Category[] = [
    { id: 'cat1-m', restaurantId, name: 'Especiais de Hoje ⭐', order: 0 },
    { id: 'cat2-m', restaurantId, name: 'Marmitas Caseiras 🍱', order: 1 },
    { id: 'cat3-m', restaurantId, name: 'Porções & Acompanhamentos 🍚', order: 2 },
    { id: 'cat4-m', restaurantId, name: 'Sucos Naturais 🍊', order: 3 },
  ];
  
  const prods: Product[] = [
    ensureProductType({
      id: 'm1',
      restaurantId,
      name: 'Marmita Feijoada Premium',
      description: 'Tradicional feijoada completa com carnes selecionadas lentamente cozidas, arroz branco soltinho, couve na manteiga e gomos de laranja.',
      price: 32.95,
      categoryId: 'cat1-m',
      imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=500&h=400&fit=crop',
      isAvailable: true,
      bestSeller: true,
      estimatedPrepTime: 15,
      ingredients: 'Arroz agulhinha, feijão preto com paio, costelinha suína, bacon, farofa amanteigada com couve fresca cortada na hora.',
      allergens: 'Não contém glúten. Contém derivados de porco.'
    }),
    ensureProductType({
      id: 'm2',
      restaurantId,
      name: 'Marmita Caseira de Alcatra Acebolada',
      description: 'Deliciosas tiras de alcatra selecionada preparadas na chapa de ferro com bastante cebola, arroz caipira, feijão carioquinha e purê macio.',
      price: 29.90,
      categoryId: 'cat2-m',
      imageUrl: 'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?w=500&h=400&fit=crop',
      isAvailable: true,
      onPromotion: true,
      promotionPrice: 24.90,
      estimatedPrepTime: 12
    }),
    ensureProductType({
      id: 'm3',
      restaurantId,
      name: 'Suco de Laranja Espremido na Hora',
      description: 'Garrafa de 500ml de puro suco de laranjas selecionadas, sem adição de água, açúcares ou conservantes. Gelado.',
      price: 9.90,
      categoryId: 'cat4-m',
      imageUrl: 'https://images.pexels.com/photos/338713/pexels-photo-338713.jpeg?w=500&h=400&fit=crop',
      isAvailable: true,
      estimatedPrepTime: 5
    }),
    ensureProductType({
      id: 'm4',
      restaurantId,
      name: 'Ovo Frito Caipira Extra',
      description: 'Ovo frito caipira frito na manteiga de garrafa, com aquela bordinha crocante irresistível e gema macia.',
      price: 3.00,
      categoryId: 'cat3-m',
      imageUrl: 'https://images.pexels.com/photos/162712/egg-yolk-egg-shell-egg-food-162712.jpeg?w=500&h=400&fit=crop',
      isAvailable: true,
      estimatedPrepTime: 5
    })
  ];
  return { cats, prods };
};

export default function RestaurantMenuPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('mesa');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const { 
    currentRestaurant, 
    setCurrentRestaurant, 
    restaurants, 
    products, 
    categories, 
    orders,
    favorites,
    toggleFavorite
  } = useRestaurant();
  
  const { addItem, itemCount, total, setTableNumber } = useCart();
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [simulatedLoading, setSimulatedLoading] = useState(true);
  
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Resolve current restaurant based on slug
  const restaurant = useMemo(() => {
    return restaurants.find(r => r.slug === slug);
  }, [restaurants, slug]);

  useEffect(() => {
    if (restaurant && (!currentRestaurant || currentRestaurant.id !== restaurant.id)) {
      setCurrentRestaurant(restaurant);
    }
  }, [restaurant, currentRestaurant, setCurrentRestaurant]);
  
  useEffect(() => {
    if (tableNumber) {
      setTableNumber(tableNumber);
    }
  }, [tableNumber, setTableNumber]);

  useEffect(() => {
    if (!restaurant) return;
    const fetchDeals = async () => {
      try {
        const q = query(collection(db, 'flash_deals'), where('restaurantId', '==', restaurant.id), where('isActive', '==', true));
        const snap = await getDocs(q);
        setFlashDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }) as FlashDeal).filter(d => new Date(d.endsAt) > new Date()));
      } catch { /* silent fail */ }
    };
    fetchDeals();
  }, [restaurant?.id]);

  // Handle scroll detection for dynamic styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Performance loader simulation to guarantee extremely beautiful entry skeleton fades
  useEffect(() => {
    const timer = setTimeout(() => {
      setSimulatedLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [slug]);

  // Smart categories extractor with robust fallback to prevent empty state
  const restaurantCategories = useMemo(() => {
    if (!restaurant) return [];
    
    // Filter database categories
    const dbCats = categories
      .filter(c => c.restaurantId === restaurant.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
      
    if (dbCats.length > 0) {
      return dbCats;
    }
    
    // Fallback if DB is empty
    return getFallbackMenu(restaurant.id, restaurant.cuisineType).cats;
  }, [categories, restaurant]);

  // Smart products extractor with robust fallback to prevent empty state
  const restaurantProducts = useMemo(() => {
    if (!restaurant) return [];
    
    const dbProds = products
      .filter(p => p.restaurantId === restaurant.id && (p.isActive !== false))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
      
    if (dbProds.length > 0) {
      return dbProds;
    }
    
    // Fallback if DB is empty
    return getFallbackMenu(restaurant.id, restaurant.cuisineType).prods;
  }, [products, restaurant]);

  // Auto-set first active category
  useEffect(() => {
    if (restaurantCategories.length > 0) {
      const hasActive = restaurantCategories.some(c => c.id === activeCategory);
      if (!hasActive) {
        setActiveCategory(restaurantCategories[0].id);
      }
    } else {
      setActiveCategory('');
    }
  }, [restaurantCategories, activeCategory]);

  // Handle Share functionality
  const handleShare = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const url = window.location.href;
    setShareData({
      isOpen: true,
      url,
      title: `Confira o cardápio de ${restaurant?.name} no MEU OVO! 🥚`
    });
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const element = categoryRefs.current[catId];
    if (element) {
      const offset = 140; // sticky header offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Set up intersection observer for categories highlight on scroll
  useEffect(() => {
    if (simulatedLoading) return;
    
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const catId = entry.target.id.replace('cat-', '');
            setActiveCategory(catId);
          }
        });
      },
      { 
        threshold: 0.15, 
        rootMargin: '-120px 0px -40% 0px' 
      }
    );
    
    Object.values(categoryRefs.current).forEach((el: HTMLDivElement | null) => {
      if (el) observer.observe(el);
    });
    
    return () => observer.disconnect();
  }, [restaurantCategories, simulatedLoading]);

  if (!restaurant) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center font-sans transition-colors duration-300",
        isDark ? "bg-black text-white" : "bg-[#F5F5F5] text-black"
      )}>
        <div className="text-center max-w-md p-8 border-2 border-dashed border-gray-300 rounded-[2.5rem] bg-white shadow-2xl">
          <div className="text-8xl mb-6 animate-bounce">🍳</div>
          <h2 className="font-display font-black text-3xl text-black mb-3 uppercase italic tracking-tighter">
            {t('restaurant.notFound')}
          </h2>
          <p className="text-gray-500 mb-6 font-medium">
            Não conseguimos localizar o estabelecimento que você procura em nossa plataforma social.
          </p>
          <button 
            onClick={() => navigate('/busca')} 
            className="w-full bg-[#FFC928] hover:bg-black hover:text-white text-black font-black px-6 py-4 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-lg"
          >
            {t('restaurant.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const getCategoryProducts = (catId: string) => 
    restaurantProducts.filter(p => p.categoryId === catId);

  const isFavorited = favorites.includes(restaurant.id);

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300",
      isDark ? "bg-[#0b0c10] text-gray-100" : "bg-[#f8f9fc] text-[#111111]"
    )}>
      <SEO 
        title={`Cardápio Digital - ${restaurant.name}`}
        description={`Confira o cardápio completo de ${restaurant.name} em ${restaurant.neighborhood}. Peça delivery ou mesa sem taxas extras.`}
        restaurantName={restaurant.name}
        type="restaurant"
        image={restaurant.coverImage}
      />

      {/* Floating Animated Header on Scroll */}
      <div className={cn(
        "fixed top-0 inset-x-0 z-40 transition-all duration-300 py-4 px-6 flex items-center justify-between border-b",
        isScrolled 
          ? isDark 
            ? "bg-black/95 backdrop-blur-md border-white/5 shadow-2xl" 
            : "bg-white/95 backdrop-blur-md border-gray-100 shadow-md"
          : "bg-transparent border-transparent"
      )}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "p-2.5 rounded-2xl transition-all border outline-none",
              isScrolled
                ? isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-[#FFC928] hover:text-black"
                  : "bg-gray-100 border-gray-200 text-black hover:bg-black hover:text-white"
                : "bg-black/40 backdrop-blur-sm border-white/10 text-white hover:bg-[#FFC928] hover:text-black"
            )}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          {isScrolled && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <img 
                src={restaurant.logo} 
                alt={restaurant.name} 
                className="w-8 h-8 rounded-xl object-cover border border-white/10 shadow-sm"
              />
              <div>
                <h4 className="font-display font-black text-sm uppercase italic tracking-tight">{restaurant.name}</h4>
                <div className="flex items-center gap-1.5 text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                  <span className={restaurant.isOpen ? "text-green-500" : "text-red-500"}>
                    {restaurant.isOpen ? "Aberto" : "Fechado"}
                  </span>
                  <span>•</span>
                  <span>{restaurant.estimatedTime} min</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(restaurant.id);
            }}
            className={cn(
              "p-2.5 rounded-2xl transition-all border outline-none active:scale-95",
              isScrolled
                ? isAlreadyFav(favorites, restaurant.id)
                  ? "bg-red-500 border-red-500 text-white"
                  : isDark
                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                : isAlreadyFav(favorites, restaurant.id)
                  ? "bg-red-500 border-red-500 text-white"
                  : "bg-black/40 backdrop-blur-sm border-white/10 text-white hover:bg-black/60"
            )}
            title={isFavorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            aria-label="Favoritar restaurante"
          >
            <Heart size={18} fill={isFavorited ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => handleShare()}
            className={cn(
              "p-2.5 rounded-2xl transition-all border outline-none active:scale-95",
              isScrolled
                ? isDark
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-gray-100 border-gray-200 text-black hover:bg-gray-200"
                : "bg-black/40 backdrop-blur-sm border-white/10 text-white hover:bg-black/60"
            )}
            aria-label="Compartilhar restaurante"
          >
            <Share2 size={18} strokeWidth={2.5} />
          </button>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Hero Visual Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <OptimizedImage 
          src={restaurant.coverImage} 
          alt={restaurant.name} 
          width={1200} 
          height={400} 
          priority
          className="w-full h-full object-cover select-none scale-102 filter brightness-[0.7]" 
        />
        {/* Deep visual gradient mask bottom */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t via-transparent to-transparent z-10",
          isDark ? "from-[#0b0c10]" : "from-[#f8f9fc]"
        )} />
        <div className="absolute inset-0 bg-black/35 z-0" />
      </div>

      {/* Floating Restaurant Bento Details Card */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 relative -mt-32 md:-mt-40 z-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={cn(
            "rounded-[2.5rem] p-6 md:p-8 border-2 shadow-2xl transition-all",
            isDark 
              ? "bg-[#111218]/90 backdrop-blur-md border-white/5 text-white" 
              : "bg-white/95 backdrop-blur-md border-[#111111]/5 text-black"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center gap-5">
              <div className="relative">
                <OptimizedImage 
                  src={restaurant.logo} 
                  alt={restaurant.name} 
                  width={100} 
                  height={100} 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-cover border-4 border-white dark:border-black shadow-xl" 
                />
                {restaurant.isOpen && (
                  <span className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-black animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge size="md">🍳 100% DIRETO</Badge>
                  {tableNumber && (
                    <span className="bg-black text-[#FFC928] dark:bg-[#FFC928] dark:text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                      MESA {tableNumber}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tighter italic mt-2.5 leading-none">
                  {restaurant.name}
                </h1>
                <p className={cn(
                  "text-xs md:text-sm font-medium mt-2 leading-relaxed max-w-2xl",
                  isDark ? "text-gray-400" : "text-gray-600"
                )}>
                  {restaurant.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wider mt-3 text-gray-500">
                  <span className="text-[#FFC928] font-black">{restaurant.cuisineType}</span>
                  <span>•</span>
                  <span>{restaurant.neighborhood}</span>
                  <span>•</span>
                  <span className={restaurant.isOpen ? "text-green-500 font-extrabold" : "text-red-500 font-extrabold"}>
                    {restaurant.isOpen ? "Estamos Abertos" : "Fechados no momento"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Button & Social Sharing Icon */}
            <div className="flex flex-col gap-2.5 min-w-[200px] md:self-stretch justify-center">
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Olá! Estou vendo o delicioso cardápio de ${restaurant.name} no Meu Ovo e gostaria de tirar uma dúvida.`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl hover:-translate-y-0.5 active:scale-95 bg-green-500/10 dark:bg-green-500/25 text-green-500 border border-green-500/20 dark:border-green-500/40 hover:bg-green-500 hover:text-white shadow-green-500/5"
              >
                <MessageCircle size={15} strokeWidth={2.5} />
                <span>Dúvidas? Chame no Zap</span>
              </a>
              <p className="text-[9px] text-center text-gray-500 font-bold uppercase tracking-wider">
                🍳 PEDIDOS SEM INTERMEDIÁRIOS COM IMPACTO REAL
              </p>
            </div>
          </div>

          {/* Quick Stats Grid with Beautiful Bento Frames */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
            <div className={cn(
              "p-4 rounded-2xl border relative overflow-hidden",
              isDark ? "bg-gradient-to-br from-[#1c1e28] to-[#161722] border-white/5" : "bg-gradient-to-br from-amber-50 to-white border-amber-100"
            )}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl" />
              <div className="flex items-center gap-1.5 relative">
                <Star size={14} className="text-[#FFC928] fill-[#FFC928]" />
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Avaliação</span>
              </div>
              <p className="text-xl font-display font-black italic tracking-tight mt-1 relative">
                {restaurant.rating}{" "}
                <span className="text-xs font-bold text-gray-400">({restaurant.reviewCount})</span>
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border relative overflow-hidden",
              isDark ? "bg-gradient-to-br from-[#1c1e28] to-[#161722] border-white/5" : "bg-gradient-to-br from-blue-50 to-white border-blue-100"
            )}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl" />
              <div className="flex items-center gap-1.5 text-gray-400 relative">
                <Clock size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Preparo</span>
              </div>
              <p className="text-xl font-display font-black italic tracking-tight mt-1 relative">
                ~{restaurant.estimatedTime}{" "}
                <span className="text-xs font-bold text-gray-400">MIN</span>
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border relative overflow-hidden",
              isDark ? "bg-gradient-to-br from-[#1c1e28] to-[#161722] border-white/5" : "bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
            )}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
              <div className="flex items-center gap-1.5 text-gray-400 relative">
                <Truck size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Entrega</span>
              </div>
              <p className="text-xl font-display font-black italic tracking-tight mt-1 relative">
                {restaurant.deliveryEnabled ? (
                  (restaurant.deliverySettings?.fee ?? restaurant.deliveryFee) === 0 ? "Grátis" : `R$ ${(restaurant.deliverySettings?.fee ?? restaurant.deliveryFee).toFixed(2)}`
                ) : (
                  "Retirada local"
                )}
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border relative overflow-hidden",
              isDark ? "bg-gradient-to-br from-[#1c1e28] to-[#161722] border-white/5" : "bg-gradient-to-br from-purple-50 to-white border-purple-100"
            )}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl" />
              <div className="flex items-center gap-1.5 text-gray-400 relative">
                <Sparkles size={14} className="text-[#FFC928]" />
                <span className="text-[10px] font-black uppercase tracking-wider">Mínimo</span>
              </div>
              <p className="text-xl font-display font-black italic tracking-tight mt-1 relative">
                R$ {restaurant.minimumOrder.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Section: Humanized Story & Founder details */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">👩‍🍳</span>
                <h4 className="font-display font-black text-lg uppercase italic tracking-tight text-[#FF7A00] dark:text-[#FFC928]">
                  Nossa História Local
                </h4>
              </div>
              <p className={cn(
                "text-xs md:text-sm leading-relaxed font-semibold",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                {restaurant.historyText || "Servindo afeto e as melhores receitas artesanais diretamente do nosso balcão para você, sem intermediários corporativos gulosos."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="warning">🛡️ SEM COMISSÃO PARA O APP</Badge>
                <Badge variant="success">⚡ COMPRA 100% DIRETA</Badge>
              </div>
            </div>

            {restaurant.founderName && (
              <div className={cn(
                "p-4 rounded-3xl border flex items-center gap-4",
                isDark ? "bg-[#161722]/60 border-white/5" : "bg-gray-50 border-gray-100"
              )}>
                {restaurant.founderImage && (
                  <img
                    src={restaurant.founderImage}
                    alt={restaurant.founderName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#FFC928] shadow-md flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Fundador(a) / Chef</span>
                  <p className={cn(
                    "font-display font-black text-xs md:text-sm uppercase italic leading-tight mt-0.5",
                    isDark ? "text-white" : "text-slate-800"
                  )}>
                    {restaurant.founderName}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {restaurant.foundedYear ? `No bairro desde ${restaurant.foundedYear}` : "Cozinha Autoral"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Core Layout: Sidebar + List of items split screen for Desktop */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* CATEGORIES SIDEBAR SECTION (Sticky on Desktop, row pill menu on Mobile) */}
          <div className="w-full md:w-64 md:sticky md:top-28 z-30">
            <div className={cn(
              "p-3 md:p-5 md:rounded-[2rem] md:border-2 transition-all w-full",
              isDark 
                ? "md:bg-[#111218] md:border-white/5" 
                : "md:bg-white md:border-[#111111]/5 md:shadow-xl"
            )}>
              <h3 className="hidden md:block font-display font-black uppercase italic tracking-tighter text-xl mb-4">
                🍳 Categorias
              </h3>
              
              {/* Responsive Container: Scrollable horizontal on mobile, stacked vert on Desktop */}
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-hide no-scrollbar select-none">
                {restaurantCategories.map(cat => {
                  const isActive = activeCategory === cat.id;
                  const count = getCategoryProducts(cat.id).length;
                  if (count === 0) return null;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => scrollToCategory(cat.id)}
                      className={cn(
                        "relative flex items-center justify-between gap-3 px-4 py-2.5 md:py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 outline-none flex-shrink-0 md:w-full group",
                        isActive 
                          ? isDark
                            ? "bg-[#FFC928] text-black shadow-lg shadow-[#FFC928]/15"
                            : "bg-black text-white shadow-xl shadow-black/15"
                          : isDark
                            ? "bg-[#111218] md:bg-white/5 border border-white/5 hover:border-[#FFC928]/30 hover:bg-white/10"
                            : "bg-white border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span>{getCategoryEmoji(cat.name)}</span>
                        <span>{cat.name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim()}</span>
                      </span>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full transition-colors",
                        isActive
                          ? isDark ? "bg-black/10 text-black/80" : "bg-white/25 text-white"
                          : "bg-gray-100 dark:bg-white/10 text-gray-500"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PRODUCTS LIST SECTION (Right column on desktop, scrolling content below details card) */}
          <div className="flex-1 w-full pb-36">
            
            {/* Simulation skeletons loading fade-in */}
            <AnimatePresence mode="wait">
              {simulatedLoading ? (
                <motion.div 
                  key="skeletons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-10 w-full"
                >
                  {[1, 2].map(s => (
                    <div key={s} className="space-y-4">
                      <Skeleton className="w-48 h-8 rounded-lg" />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {[1, 2].map(c => (
                          <div key={c} className="bg-white dark:bg-[#111218] p-5 rounded-[2.5rem] flex gap-4 border border-gray-100 dark:border-white/5 h-44">
                            <div className="flex-1 space-y-3">
                              <Skeleton className="w-1/2 h-5" />
                              <Skeleton className="w-full h-10" />
                              <Skeleton className="w-1/3 h-5" />
                            </div>
                            <Skeleton className="w-28 h-28 rounded-2xl" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-12"
                >
                  {restaurantProducts.length > 0 && restaurantProducts.slice(0, 2).length > 0 && (
                    <div className="space-y-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-[#FFC928]/10 dark:to-[#FF7A00]/5 p-6 rounded-[2.5rem] border border-amber-500/20 dark:border-[#FFC928]/20 mb-8 select-none">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#FF7A00] dark:text-[#FFC928] tracking-widest leading-none">Recomendação dos Clientes</span>
                          <h3 className="font-display font-black text-xl uppercase italic tracking-tight text-slate-800 dark:text-white mt-1">🔥 Destaques e Preferidos do Bairro</h3>
                        </div>
                        <Badge size="md" className="self-start sm:self-center">
                          <Star size={10} className="fill-black" />
                          Favoritos Locais
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {restaurantProducts.filter(p => p.bestSeller).slice(0, 1).map(p => (
                          <div key={p.id} className={cn(
                            "p-4 rounded-3xl border-2 flex gap-4 cursor-pointer hover:border-[#FFC928] dark:hover:border-[#FFC928]/60 transition-all duration-300 hover:shadow-xl hover:shadow-[#FFC928]/10",
                            isDark ? "bg-[#111218] border-white/5" : "bg-white border-gray-100 shadow-sm"
                          )} onClick={() => setSelectedProduct(p)}>
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] font-extrabold uppercase bg-[#FFC928] text-black px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                <Star size={8} className="fill-black" />
                                MAIS PEDIDO
                              </span>
                              <h4 className="font-bold text-sm uppercase text-slate-800 dark:text-white truncate mt-1.5">{p.name}</h4>
                              <p className={cn("text-[10px] line-clamp-2 mt-0.5 leading-relaxed", isDark ? "text-gray-400" : "text-gray-500")}>{p.description}</p>
                              <p className="font-display font-black italic text-base mt-2.5 text-[#FF7A00] dark:text-[#FFC928]">R$ {p.price.toFixed(2)}</p>
                            </div>
                            {p.imageUrl && (
                              <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border-2 border-white/10" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        ))}
                        {restaurantProducts.filter(p => !p.bestSeller).slice(0, 1).map(p => (
                          <div key={p.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProduct(p); } }} className={cn(
                            "p-4 rounded-3xl border-2 flex gap-4 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10",
                            isDark ? "bg-[#111218] border-white/5" : "bg-white border-gray-100 shadow-sm"
                          )} onClick={() => setSelectedProduct(p)}>
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit border border-emerald-500/20">
                                <Star size={8} className="fill-emerald-500" />
                                RECOMENDADO
                              </span>
                              <h4 className="font-bold text-sm uppercase text-slate-800 dark:text-white truncate mt-1.5">{p.name}</h4>
                              <p className={cn("text-[10px] line-clamp-2 mt-0.5 leading-relaxed", isDark ? "text-gray-400" : "text-gray-500")}>{p.description}</p>
                              <p className="font-display font-black italic text-base mt-2.5 text-emerald-600 dark:text-emerald-400">R$ {p.price.toFixed(2)}</p>
                            </div>
                            {p.imageUrl && (
                              <img src={p.imageUrl} alt={p.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border-2 border-white/10" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        ))}
                        {restaurantProducts.filter(p => p.bestSeller).length === 0 && restaurantProducts[0] && (
                          <div className="md:col-span-2">
                            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProduct(restaurantProducts[0]); } }} className={cn(
                              "p-5 rounded-3xl border-2 flex gap-4 cursor-pointer hover:border-[#FFC928] dark:hover:border-[#FFC928]/60 transition-all duration-300 hover:shadow-xl hover:shadow-[#FFC928]/10",
                              isDark ? "bg-[#111218] border-white/5" : "bg-white border-gray-100 shadow-sm"
                            )} onClick={() => setSelectedProduct(restaurantProducts[0])}>
                              <div className="flex-1 min-w-0">
                                <span className="text-[8px] font-extrabold uppercase bg-[#FFC928] text-black px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">⭐ DESTAQUE DA CASA</span>
                                <h4 className="font-bold text-sm uppercase text-slate-800 dark:text-white truncate mt-1.5">{restaurantProducts[0].name}</h4>
                                <p className={cn("text-[10px] line-clamp-2 mt-0.5 leading-relaxed", isDark ? "text-gray-400" : "text-gray-500")}>{restaurantProducts[0].description}</p>
                                <p className="font-display font-black italic text-base mt-2.5 text-[#FF7A00] dark:text-[#FFC928]">R$ {restaurantProducts[0].price.toFixed(2)}</p>
                              </div>
                              {restaurantProducts[0].imageUrl && (
                                <img src={restaurantProducts[0].imageUrl} alt={restaurantProducts[0].name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border-2 border-white/10" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {restaurantCategories.map(cat => {
                    const catProducts = getCategoryProducts(cat.id);
                    if (!catProducts.length) return null;
                    
                    return (
                      <div
                        key={cat.id}
                        id={`cat-${cat.id}`}
                        ref={el => { categoryRefs.current[cat.id] = el; }}
                        className="scroll-mt-36"
                      >
                        <div className={`flex items-center gap-3 mb-6 border-b pb-3 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                          <span className="text-3xl">{getCategoryEmoji(cat.name)}</span>
                          <h2 className={`font-display font-black text-2xl tracking-tighter uppercase italic leading-none ${isDark ? 'text-white' : 'text-[#111111]'}`}>
                            {cat.name}
                          </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {catProducts.map(product => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              isDark={isDark}
                              onSelect={() => setSelectedProduct(product)}
                              flashDeal={flashDeals.find(d => d.productId === product.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Dynamic Floating Cart Total Footer action Button */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-40 max-w-lg mx-auto"
          >
            <motion.button
              key={itemCount}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/carrinho')}
              className="w-full bg-[#111111] text-white border-2 border-black/10 hover:bg-[#222] font-black py-4.5 px-6 rounded-3xl flex items-center justify-between shadow-2xl transition-all"
              style={{ boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}
            >
              <div className="flex items-center gap-3.5">
                <span className="bg-[#FFC928] text-black font-extrabold w-8 h-8 rounded-full flex items-center justify-center text-xs animate-pulse">
                  {itemCount}
                </span>
                <span className="text-xs uppercase tracking-widest font-black flex items-center gap-1.5">
                  <ShoppingBag size={14} strokeWidth={2.5} />
                  Ver sacola de compras
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mr-1">Total:</span>
                <span className="text-[#FFC928] font-display font-black italic text-lg">R$ {total.toFixed(2)}</span>
                <ChevronRight size={16} className="text-[#FFC928]" strokeWidth={2.5} />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spectacular drag bottom drawer Product options customization modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isDark={isDark}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            if (!restaurant.isOpen) {
              toast.error('Restaurante fechado no momento');
              return;
            }
            addItem(item);
            setSelectedProduct(null);
          }}
          allProducts={restaurantProducts}
          categories={restaurantCategories}
          currentCategoryName={restaurantCategories.find(c => c.id === selectedProduct.categoryId)?.name || ''}
        />
      )}

      {/* Social Network Share Modal */}
      <ShareModal 
        isOpen={shareData.isOpen}
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
        url={shareData.url}
        title={shareData.title}
      />
    </div>
  );
}

// Check favorites helper to survive local testing and strict compilation
function isAlreadyFav(list: string[] | undefined, id: string): boolean {
  if (!list) return false;
  return list.includes(id);
}

/* ==========================================
   POLISHED BENTO PRODUCT HIGHLIGHT CARD
   ========================================== */
interface ProductCardProps {
  product: Product;
  isDark: boolean;
  onSelect: () => void;
  flashDeal?: FlashDeal;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isDark, onSelect, flashDeal }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "relative rounded-[2.5rem] border-2 p-5 flex flex-col sm:flex-row gap-4 text-left transition-all overflow-hidden cursor-pointer group/card",
        product.isAvailable === false ? 'opacity-40 pointer-events-none' : '',
        isDark 
          ? "bg-[#111218] border-white/5 hover:border-[#FFC928]/40 hover:shadow-2xl hover:shadow-[#FFC928]/5" 
          : "bg-white border-[#111111]/5 hover:border-black/10 hover:shadow-2xl hover:shadow-black/5"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Card Badges Section */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {flashDeal && (
              <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm animate-pulse">
                <Zap size={8} className="text-yellow-300" />
                OFERTA RELÂMPAGO
              </span>
            )}
            {((product.bestSeller) || ((product.orderCount ?? 0) >= 10)) && !flashDeal && (
              <span className="bg-[#FFC928] text-black text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <Star size={8} className="fill-[#111] text-[#111]" />
                {(product.orderCount ?? 0) >= 20 ? 'TOP VENDAS' : 'MAIS PEDIDO'}
              </span>
            )}
            {product.onPromotion && !flashDeal && (
              <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm">
                OFERTA
              </span>
            )}
            {product.estimatedPrepTime && (
              <span className="bg-slate-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock size={8} />
                {product.estimatedPrepTime} MIN
              </span>
            )}
            {flashDeal && (
              <span className="bg-black text-[#FFC928] text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                -{flashDeal.discountPercentage}%
              </span>
            )}
          </div>
          {flashDeal && (
            <div className="mb-2">
              <FlashDealTimer endsAt={flashDeal.endsAt} className="text-orange-500" />
            </div>
          )}

          <h3 className={`font-display font-black text-lg md:text-xl leading-tight tracking-tight uppercase italic group-hover/card:text-[#FFC928] transition-colors duration-300 ${isDark ? 'text-white' : 'text-black'}`}>
            {product.name}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mt-1.5 line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Price and Add button bar */}
        <div className={`flex items-end justify-between mt-5 pt-3 border-t border-dashed ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="flex flex-col">
            {flashDeal ? (
              <div className="space-y-0.5">
                <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest line-through">
                  R$ {flashDeal.originalPrice.toFixed(2)}
                </p>
                <p className="font-display font-black italic text-xl leading-none text-red-500">
                  R$ {flashDeal.dealPrice.toFixed(2)}
                </p>
                <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">
                  Restam {flashDeal.maxUnits - flashDeal.soldUnits} un.
                </p>
              </div>
            ) : product.onPromotion && product.promotionPrice ? (
              <div className="space-y-0.5">
                <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest line-through">
                  R$ {product.price.toFixed(2)}
                </p>
                <p className={`font-display font-black italic text-xl leading-none ${isDark ? 'text-white' : 'text-black'}`}>
                  R$ {product.promotionPrice.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className={`font-display font-black italic text-xl leading-none ${isDark ? 'text-white' : 'text-black'}`}>
                R$ {product.price.toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="bg-[#FFC928] text-black font-black text-[10px] p-2 rounded-2xl flex items-center gap-1 shadow-lg shadow-[#FFC928]/10 group-hover/card:bg-black group-hover/card:text-[#FFC928] border-2 border-[#FFC928] group-hover/card:border-black transition-all">
            <Plus size={14} strokeWidth={3} />
            <span className="uppercase tracking-widest">ADICIONAR</span>
          </div>
        </div>
      </div>

      {/* Product Image Frame */}
      <div className="relative flex-shrink-0 self-center sm:self-auto">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-inner transition-colors duration-500 bg-slate-50 dark:bg-[#1c1e28]">
          <OptimizedImage
            src={product.imageUrl}
            alt={product.name}
            width={120}
            height={120}
            className="w-full h-full object-cover group-hover/card:scale-106 transition-transform duration-700"
          />
        </div>
      </div>
    </motion.div>
  );
}

/* =======================================================
   BEAUTIFUL INTERACTIVE OPTIONS & ADDITIONALS DRAWER MODAL
   ======================================================= */
interface OptionGroupField {
  id: string;
  name: string;
  type: string;
  maxSelection?: number;
  items?: Additional[];
  options?: Additional[];
}

function categorize(name: string): 'main' | 'drink' | 'dessert' | 'snack' {
  const n = name.toLowerCase();
  if (n.includes('bebida') || n.includes('refri') || n.includes('suco') || n.includes('cerveja') || n.includes('água') || n.includes('café') || n.includes('chá')) return 'drink';
  if (n.includes('sobremesa') || n.includes('doce') || n.includes('chocolate') || n.includes('pudim') || n.includes('sorvete') || n.includes('torta')) return 'dessert';
  if (n.includes('entrada') || n.includes('petisco') || n.includes('porção') || n.includes('batata') || n.includes('salada')) return 'snack';
  return 'main';
}

function getCrossSellTargets(currentType: string): string[] {
  if (currentType === 'main') return ['drink', 'dessert'];
  if (currentType === 'drink') return ['snack'];
  if (currentType === 'dessert') return ['drink'];
  if (currentType === 'snack') return ['drink', 'main'];
  return ['drink'];
}

function suggestComplementaryItems(
  currentProduct: Product,
  currentCategoryName: string,
  allProducts: Product[],
  categories: Category[]
): Product[] {
  const currentType = categorize(currentCategoryName);
  const targets = getCrossSellTargets(currentType);

  const catNameToId = new Map(categories.map(c => [c.id, c.name]));
  const targetCatIds = new Set(
    categories
      .filter(c => targets.includes(categorize(c.name)))
      .map(c => c.id)
  );

  return allProducts
    .filter(p =>
      p.id !== currentProduct.id &&
      p.isAvailable !== false &&
      targetCatIds.has(p.categoryId) &&
      p.price > 0
    )
    .slice(0, 3);
}

interface ProductModalProps {
  product: Product;
  isDark: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  allProducts: Product[];
  categories: Category[];
  currentCategoryName: string;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, isDark, onClose, onAdd, allProducts, currentCategoryName, categories }) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [selectedAdditionals, setSelectedAdditionals] = useState<{ groupId: string; additionalId: string; name: string; price: number }[]>([]);

  const suggestions = useMemo(
    () => suggestComplementaryItems(product, currentCategoryName, allProducts, categories),
    [product, currentCategoryName, allProducts, categories]
  );

  const toggleAdditional = (groupId: string, additionalId: string, name: string, price: number, isSingle: boolean) => {
    setSelectedAdditionals(prev => {
      if (isSingle) {
        const without = prev.filter(a => a.groupId !== groupId);
        const existing = prev.find(a => a.groupId === groupId && a.additionalId === additionalId);
        return existing ? without : [...without, { groupId, additionalId, name, price }];
      }
      const existing = prev.find(a => a.additionalId === additionalId);
      return existing ? prev.filter(a => a.additionalId !== additionalId) : [...prev, { groupId, additionalId, name, price }];
    });
  };

  const additionalsTotal = selectedAdditionals.reduce((s, a) => s + a.price, 0);
  const basePrice = product.onPromotion && product.promotionPrice ? product.promotionPrice : product.price;
  const itemTotal = (basePrice + additionalsTotal) * quantity;

  const handleAdd = () => {
    onAdd({ product, quantity, selectedAdditionals, observations });
    toast.success(`${product.name} adicionado!`, {
      icon: '🍳',
      style: {
        borderRadius: '1.5rem',
        background: '#111',
        color: '#fff',
        fontWeight: 'extrabold',
        fontSize: '13px',
        border: '2px solid #FFC928'
      },
    });
  };

  return (
    <AnimatePresence>
      <div role="dialog" aria-modal="true" aria-label="Detalhes do produto" className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        {/* Blur overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        {/* Main box content */}
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className={cn(
            "relative rounded-t-[3rem] md:rounded-[2.5rem] w-full md:max-w-xl max-h-[95vh] md:max-h-[85vh] overflow-y-auto z-10 flex flex-col shadow-2xl border-2",
            isDark ? "bg-[#111218] border-white/5" : "bg-white border-[#111111]/5"
          )}
        >
          {/* Cover image header */}
          <div className="relative h-56 sm:h-64 w-full flex-shrink-0 overflow-hidden group/modal">
            <OptimizedImage 
              src={product.imageUrl} 
              alt={product.name} 
              width={600} 
              height={300} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover/modal:scale-104" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            
            {/* Header close cross button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2.5 rounded-full hover:bg-black/60 text-white transition-all border border-white/10 active:scale-95"
              aria-label="Fechar"
            >
              <X size={18} strokeWidth={3} />
            </button>

            {/* floating food item name */}
            <div className="absolute bottom-5 left-6 right-6">
              <h2 className="font-display font-black text-2xl sm:text-3.5xl text-white uppercase italic tracking-tighter leading-none">
                {product.name}
              </h2>
            </div>
          </div>

          {/* scrollable parameters list */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* description and badges */}
            <div className="space-y-3">
              <p className="text-gray-400 text-sm leading-relaxed font-semibold">
                {product.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {product.bestSeller && (
                  <Badge size="md">
                    <Star size={10} className="fill-black" />
                    MAIS PEDIDO
                  </Badge>
                )}
                {product.onPromotion && (
                  <Badge variant="danger" size="md">
                    REDUÇÃO DE PREÇO
                  </Badge>
                )}
                {product.estimatedPrepTime && (
                  <Badge variant="outline" size="md">
                    <Clock size={10} />
                    SAI EM {product.estimatedPrepTime} MIN
                  </Badge>
                )}
              </div>
            </div>

            {/* Ingredients & Allergens Alert box */}
            {(product.ingredients || product.allergens) && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                {product.ingredients && (
                  <div className={cn(
                    "p-4 rounded-2xl border",
                    isDark ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
                  )}>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 select-none flex items-center gap-1">
                      <Info size={11} /> Ingredientes inclusos
                    </p>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      {product.ingredients}
                    </p>
                  </div>
                )}
                {(product.selectedAllergens?.length ? product.selectedAllergens : product.allergens) && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2 select-none flex items-center gap-1">
                      <AlertTriangle size={11} /> Informações de Alergia
                    </p>
                    {product.selectedAllergens?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {product.selectedAllergens.map(key => {
                          const a = ALLERGEN_MAP.get(key);
                          return a ? (
                            <span key={key} className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-red-500/20">
                              {a.icon} {a.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-black leading-relaxed italic">{product.allergens}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Additionals Option Groups builder */}
            {(product.additionalGroups || product.optionGroups) && 
              (product.additionalGroups || product.optionGroups).map((group: OptionGroupField) => (
              <div key={group.id} className="space-y-3">
                <div className={cn(
                  "rounded-2xl p-3 border",
                  isDark ? "bg-[#161722] border-white/5" : "bg-slate-50 border-gray-100"
                )}>
                  <h4 className="font-display font-black uppercase text-sm italic text-black dark:text-white leading-none">
                    {group.name}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">
                    {group.type === 'single' || group.maxSelection === 1 ? 'Escolha exclusivamente 1 opção' : 'Escolha quantas opções desejar'}
                  </p>
                </div>
                
                <div className="space-y-2.5">
                   {(group.items || group.options || []).map((item: Additional) => {
                    const selected = selectedAdditionals.some(a => a.additionalId === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleAdditional(group.id, item.id, item.name, item.price, group.type === 'single' || group.maxSelection === 1)}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all outline-none",
                          selected 
                            ? "border-[#FFC928] bg-[#FFC928]/5 shadow-md shadow-[#FFC928]/5" 
                            : isDark
                              ? "border-white/5 bg-white/5 hover:border-white/10"
                              : "border-gray-100 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            selected 
                              ? "bg-[#FFC928] border-[#FFC928]" 
                              : "border-gray-400"
                          )}>
                            {selected && <Check size={12} className="text-black" strokeWidth={3} />}
                          </span>
                          <span className="text-xs uppercase tracking-wider font-extrabold text-black dark:text-white">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-gray-400">
                          {item.price > 0 
                            ? `+ R$ ${item.price.toFixed(2)}` 
                            : item.price < 0 
                              ? `- R$ ${Math.abs(item.price).toFixed(2)}` 
                              : 'Grátis'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Sugestões Inteligentes — cross-sell */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#FFC928]" />
                  <h4 className="font-display font-black text-xs uppercase tracking-widest text-[#111111] dark:text-white italic">
                    Complete seu pedido
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onAdd({ product: s, quantity: 1, selectedAdditionals: [], observations: '' });
                        toast.success(`${s.name} adicionado!`, {
                          icon: '🍳',
                          style: {
                            borderRadius: '1.5rem',
                            background: '#111',
                            color: '#fff',
                            fontWeight: 'extrabold',
                            fontSize: '13px',
                            border: '2px solid #FFC928'
                          },
                        });
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left",
                        isDark
                          ? "border-white/5 bg-white/5 hover:border-[#FFC928]/40"
                          : "border-gray-100 bg-gray-50/50 hover:border-[#FFC928]/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {s.imageUrl && (
                          <img src={s.imageUrl} alt={s.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-black dark:text-white truncate">{s.name}</p>
                          <p className="text-[9px] text-gray-400 font-semibold">R$ {s.price.toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-black text-[#FFC928] bg-[#FFC928]/10 px-3 py-1.5 rounded-xl uppercase tracking-wider hover:bg-[#FFC928] hover:text-black transition-all">
                        + ADD
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Special comments text area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-display font-black text-xs uppercase tracking-widest text-[#111111] dark:text-white italic">
                  📝 Detalhes do Preparo
                </label>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-white/5 px-2 py-0.5 rounded-md">
                  Opcional
                </span>
              </div>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                placeholder="Exemplo: sem cebola, ponto bem passado, sem pimenta..."
                className={cn(
                  "w-full border-2 rounded-2xl p-4 text-xs resize-none h-20 outline-none transition-all placeholder:text-slate-400",
                  isDark 
                    ? "bg-white/5 border-white/5 focus:border-[#FFC928] focus:bg-white/10 text-white" 
                    : "bg-slate-100/50 border-gray-100 focus:border-black focus:bg-white text-black"
                )}
              />
            </div>

          </div>

          {/* Sticky checkout price indicator footer */}
          <div className={cn(
            "p-5 border-t border-gray-100 dark:border-white/5 flex items-center gap-4 flex-shrink-0 mt-auto",
            isDark ? "bg-[#111218]" : "bg-white"
          )}>
            
            {/* quantity selectors */}
            <div className="flex items-center gap-2 bg-[#F5F5F5] dark:bg-white/5 rounded-2xl p-1 border border-transparent dark:border-white/5">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shadow-sm active:scale-90"
                aria-label="Diminuir quantidade"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="font-display font-black text-black dark:text-white text-sm w-6 text-center select-none">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shadow-sm active:scale-95"
                aria-label="Aumentar quantidade"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* check in to cart button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              className="flex-1 bg-[#FFC928] text-black font-black py-4.5 rounded-2xl hover:bg-black hover:text-[#FFC928] transition-all flex items-center justify-between px-5 shadow-xl shadow-[#FFC928]/10"
            >
              <div className="flex items-center gap-1">
                <Plus size={14} strokeWidth={3} />
                <span className="text-xs uppercase tracking-widest font-black">Adicionar à Sacola</span>
              </div>
              <span className="font-display font-black italic text-sm">
                R$ {itemTotal.toFixed(2)}
              </span>
            </motion.button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
