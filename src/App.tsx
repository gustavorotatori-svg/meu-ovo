import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { CartProvider } from './context/CartContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition';
import OvosDeOuroVotePopup from './components/OvosDeOuroVotePopup';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import CookieConsent from './components/CookieConsent';
import AbandonedCartWatcher from './components/AbandonedCartWatcher';

const basename = window.location.hostname.includes('github.io') ? '/meu-ovo' : window.location.hostname.includes('vercel.app') ? '/' : '/';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const InstallAppPage = lazy(() => import('./pages/InstallAppPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const MaisPedidosPage = lazy(() => import('./pages/MaisPedidosPage'));
const RestaurantMenuPage = lazy(() => import('./pages/RestaurantMenuPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const RestaurantOnboarding = lazy(() => import('./pages/RestaurantOnboarding'));
const SelfSignupPage = lazy(() => import('./pages/SelfSignupPage'));
const SocialImpactPage = lazy(() => import('./pages/SocialImpactPage'));
const ForRestaurantsPage = lazy(() => import('./pages/ForRestaurantsPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const OvosDeOuroInfoPage = lazy(() => import('./pages/OvosDeOuroInfoPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCashier = lazy(() => import('./pages/admin/AdminCashier'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminRecipeSheets = lazy(() => import('./pages/admin/AdminRecipeSheets'));
const AdminFinancial = lazy(() => import('./pages/admin/AdminFinancial'));
const MenuManagement = lazy(() => import('./pages/admin/MenuManagement'));
const AdminWaiter = lazy(() => import('./pages/admin/AdminWaiter'));
const KitchenMode = lazy(() => import('./pages/admin/KitchenMode'));
const WaiterMode = lazy(() => import('./pages/admin/WaiterMode'));
const AdminDelivery = lazy(() => import('./pages/admin/AdminDelivery'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const CouponManagement = lazy(() => import('./pages/admin/CouponManagement'));
const LoyaltyManagement = lazy(() => import('./pages/admin/LoyaltyManagement'));
const StoreSettings = lazy(() => import('./pages/admin/StoreSettings'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const OvosDeOuro = lazy(() => import('./pages/admin/OvosDeOuro'));
const FlashDealManagement = lazy(() => import('./pages/admin/FlashDealManagement'));
const LabelManagement = lazy(() => import('./pages/admin/LabelManagement'));
const AdminWhatsAppAI = lazy(() => import('./pages/admin/AdminWhatsAppAI'));
const OrderStatusPage = lazy(() => import('./pages/OrderStatusPage'));

const PlatformDashboard = lazy(() => import('./pages/platform/PlatformDashboard'));
const PlatformRestaurants = lazy(() => import('./pages/platform/PlatformRestaurants'));
const PlatformIntelligence = lazy(() => import('./pages/platform/PlatformIntelligence'));
const PlatformMarketReports = lazy(() => import('./pages/platform/PlatformMarketReports'));
const PlatformPartners = lazy(() => import('./pages/platform/PlatformPartners'));
const PlatformDonations = lazy(() => import('./pages/platform/PlatformDonations'));
const PlatformOvosDeOuro = lazy(() => import('./pages/platform/PlatformOvosDeOuro'));
const PlatformCustomers = lazy(() => import('./pages/platform/PlatformCustomers'));

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FFC928] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <BrowserRouter basename={basename}>
              <ScrollToTop />
              <AbandonedCartWatcher />
              <ErrorBoundary>
                <Routes>
                  <Route element={<PageTransition><Outlet /></PageTransition>}>
                    {/* Public */}
                    <Route path="/" element={<PageSuspense><LandingPage /></PageSuspense>} />
                    <Route path="/busca" element={<PageSuspense><MarketplacePage /></PageSuspense>} />
                    <Route path="/mais-pedidos" element={<PageSuspense><MaisPedidosPage /></PageSuspense>} />
                    <Route path="/r/:slug" element={<PageSuspense><RestaurantMenuPage /></PageSuspense>} />
                    <Route path="/carrinho" element={<PageSuspense><CartPage /></PageSuspense>} />
                    <Route path="/checkout" element={<PageSuspense><CheckoutPage /></PageSuspense>} />
                    <Route path="/login" element={<PageSuspense><LoginPage /></PageSuspense>} />
                    <Route path="/install-app" element={<PageSuspense><InstallAppPage /></PageSuspense>} />
                    <Route path="/cadastro-restaurante" element={<PageSuspense><RestaurantOnboarding /></PageSuspense>} />
                    <Route path="/cadastro" element={<PageSuspense><SelfSignupPage /></PageSuspense>} />
                    <Route path="/impacto-social" element={<PageSuspense><SocialImpactPage /></PageSuspense>} />
                    <Route path="/para-restaurantes" element={<PageSuspense><ForRestaurantsPage /></PageSuspense>} />
                    <Route path="/ovos-de-ouro" element={<PageSuspense><OvosDeOuroInfoPage /></PageSuspense>} />
                    <Route path="/meus-pedidos" element={<ProtectedRoute roles={['customer', 'restaurant', 'admin']}><PageSuspense><OrderHistoryPage /></PageSuspense></ProtectedRoute>} />
                    <Route path="/perfil" element={<ProtectedRoute roles={['customer', 'restaurant', 'admin']}><PageSuspense><CustomerProfilePage /></PageSuspense></ProtectedRoute>} />
                    <Route path="/blog" element={<PageSuspense><BlogPage /></PageSuspense>} />
                    <Route path="/pedido/:id" element={<PageSuspense><OrderStatusPage /></PageSuspense>} />
                    <Route path="/sobre" element={<PageSuspense><AboutPage /></PageSuspense>} />
                    <Route path="/termos" element={<PageSuspense><TermsPage /></PageSuspense>} />
                    <Route path="/privacidade" element={<PageSuspense><PrivacyPage /></PageSuspense>} />

                    {/* Restaurant admin (requires restaurant role) */}
                    <Route path="/admin" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminDashboard /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/caixa" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminCashier /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/estoque" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminInventory /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/ficha-tecnica" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminRecipeSheets /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/financeiro" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminFinancial /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/pedidos" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminOrders /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/cardapio" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><MenuManagement /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/garcom" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><WaiterMode /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/mesas" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminWaiter /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/cozinha" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><KitchenMode /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/delivery" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminDelivery /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/relatorios" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminReports /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/cupons" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><CouponManagement /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/fidelidade" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><LoyaltyManagement /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/analytics" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminAnalytics /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/configuracoes" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><StoreSettings /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/ovos-de-ouro" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><OvosDeOuro /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/flash-deals" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><FlashDealManagement /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/etiquetas" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><LabelManagement /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/whatsapp-ai" element={
                      <ProtectedRoute roles={['restaurant', 'admin']}>
                        <PageSuspense><AdminWhatsAppAI /></PageSuspense>
                      </ProtectedRoute>
                    } />

                    {/* Platform admin (requires admin role) */}
                    <Route path="/plataforma" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformDashboard /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/restaurantes" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformRestaurants /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/clientes" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformCustomers /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/inteligencia" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformIntelligence /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/relatorios" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformMarketReports /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/parceiros" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformPartners /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/doacoes" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformDonations /></PageSuspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/plataforma/ovos-de-ouro" element={
                      <ProtectedRoute roles={['admin']}>
                        <PageSuspense><PlatformOvosDeOuro /></PageSuspense>
                      </ProtectedRoute>
                    } />

                    {/* 404 */}
                    <Route path="*" element={<PageSuspense><NotFoundPage /></PageSuspense>} />
                  </Route>
                </Routes>
                <OvosDeOuroVotePopup />
                <PwaInstallPrompt />
              </ErrorBoundary>
              <CookieConsent />
              <Toaster position="top-right" />
            </BrowserRouter>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
