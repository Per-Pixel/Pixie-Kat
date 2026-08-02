import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Messages from './pages/Messages';
import Resellers from './pages/Resellers';
import Settings from './pages/Settings';
import Pages from './pages/Pages';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Wallets from './pages/Wallets';
import Memberships from './pages/Memberships';
import RevenueProducts from './pages/revenue/RevenueProducts';
import SalesOverview from './pages/revenue/SalesOverview';
import Referral from './pages/revenue/Referral';
import Compose from './pages/messages/Compose';
import Clients from './pages/auth/Clients';
import AddProduct from './pages/AddProduct';
import ManageUsers from './pages/ManageUsers';
import UserDetail from './pages/users/UserDetail';
import GamesList from './pages/products/GamesList';
import GameEditor from './pages/products/GameEditor';
import GameHelp from './pages/products/GameHelp';
import ProductsList from './pages/products/ProductsList';
import PromoList from './pages/content/PromoList';
import HeroEditor from './pages/content/HeroEditor';
import HomepageAboutEditor from './pages/content/homepage/AboutEditor';
import HowItWorksEditor from './pages/content/HowItWorksEditor';
import FaqEditor from './pages/content/FaqEditor';
import ContactEditor from './pages/content/ContactEditor';
import PricingCopyEditor from './pages/content/PricingCopyEditor';
import ProductsPageEditor from './pages/content/ProductsPageEditor';
import PromoEditor from './pages/content/PromoEditor';
import JjkCheaperEditor from './pages/content/events/JjkCheaperEditor';
import StoragePage from './pages/storage/StoragePage';
import PermissionsPage from './pages/PermissionsPage';
import DocumentationPage from './pages/DocumentationPage';
import TasksPage from './pages/TasksPage';
import EventsPage from './pages/EventsPage';
import ActivityLogs from './pages/ActivityLogs';
import ProvidersPage from './pages/providers/ProvidersPage';
import SmileOneDetailPage from './pages/providers/SmileOneDetailPage';
import SmileCoinDetailPage from './pages/providers/SmileCoinDetailPage';
import SmileCoinApiConsolePage from './pages/providers/SmileCoinApiConsolePage';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="overview" element={<Navigate to="/dashboard" replace />} />
        <Route path="products" element={<ProductsList title="All Products" />} />
        <Route path="products/active" element={<ProductsList statusFilter="active" title="Active Products" />} />
        <Route path="products/drafts" element={<ProductsList statusFilter="draft" title="Draft Products" />} />
        <Route path="products/legacy" element={<Products />} />
        <Route path="products/games" element={<GamesList title="All Games" />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="content/trending" element={<Navigate to="/pages/homepage/trending-games" replace />} />
        <Route path="content/trending/new" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="content/trending/:id" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="content/exclusive-offers" element={<Navigate to="/pages/homepage/exclusive-offers" replace />} />
        <Route path="content/exclusive-offers/new" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="content/exclusive-offers/:id" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="products/games/new" element={<GameEditor />} />
        <Route path="products/games/help" element={<GameHelp />} />
        <Route path="products/games/:id" element={<GameEditor />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="games" element={<GamesList title="All Games" />} />
        <Route path="messages" element={<Messages />} />
        <Route path="resellers" element={<Resellers />} />
        <Route path="settings" element={<Settings />} />
        <Route path="pages" element={<Pages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="providers/smile-one" element={<SmileOneDetailPage />} />
        <Route path="providers/smile-coin" element={<SmileCoinDetailPage />} />
        <Route path="providers/smile-coin/api-console" element={<SmileCoinApiConsolePage />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="memberships" element={<Memberships />} />
        {/* Revenue Routes */}
        <Route path="revenue/sales-overview" element={<SalesOverview />} />
        <Route path="revenue/products" element={<RevenueProducts />} />
        <Route path="revenue/orders" element={<Orders />} />
        <Route path="revenue/brokers" element={<Resellers />} />
        <Route path="revenue/referral" element={<Referral />} />
        {/* Message Routes */}
        <Route path="messages/compose" element={<Compose />} />
        <Route path="messages/received" element={<Messages />} />
        <Route path="messages/sent" element={<Messages />} />
        <Route path="messages/history" element={<Messages />} />
        {/* Auth Routes */}
        <Route path="auth/clients" element={<Clients />} />
        <Route path="auth/users" element={<ManageUsers defaultRoleFilter="user" title="Users" subtitle="Manage customer accounts" />} />
        <Route path="auth/broker" element={<ManageUsers defaultRoleFilter="reseller" title="Brokers / Resellers" subtitle="Manage broker and reseller accounts" />} />
        <Route path="auth/admin" element={<ManageUsers defaultRoleFilter="admin" title="Admins" subtitle="Manage administrator accounts" />} />
        <Route path="auth/referrals" element={<Referral />} />
        <Route path="auth/permissions" element={<PermissionsPage />} />
        {/* Component Routes */}
        <Route path="components/tasks" element={<TasksPage />} />
        <Route path="components/events" element={<EventsPage />} />
        <Route path="documentation" element={<DocumentationPage />} />
        {/* Page Management Routes */}
        <Route path="pages/homepage" element={<Pages />} />
        <Route path="pages/homepage/hero" element={<HeroEditor />} />
        <Route path="pages/homepage/about" element={<HomepageAboutEditor />} />
        <Route path="pages/homepage/trending-games" element={<PromoList section="trending" title="Trending Games" description="Manage cards shown in the homepage carousel" basePath="/pages/homepage/trending-games" />} />
        <Route path="pages/homepage/trending-games/new" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="pages/homepage/trending-games/:id" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="pages/homepage/exclusive-offers" element={<PromoList section="exclusive_offers" title="Exclusive Offers" description="Manage promotional offer cards on the homepage" basePath="/pages/homepage/exclusive-offers" />} />
        <Route path="pages/homepage/exclusive-offers/new" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="pages/homepage/exclusive-offers/:id" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="pages/products" element={<ProductsPageEditor />} />
        <Route path="pages/events/jjk-cheaper" element={<JjkCheaperEditor />} />
        <Route path="pages/how-it-works" element={<HowItWorksEditor />} />
        <Route path="pages/faq" element={<FaqEditor />} />
        <Route path="pages/contact" element={<ContactEditor />} />
        <Route path="pages/pricing" element={<PricingCopyEditor />} />
        {/* Quick Action Routes */}
        <Route path="quick/add-product" element={<AddProduct />} />
        <Route path="quick/manage-users" element={<ManageUsers />} />
        <Route path="quick/orders" element={<Orders />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
