import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import RevenueProducts from './pages/revenue/RevenueProducts';
import Referral from './pages/revenue/Referral';
import Compose from './pages/messages/Compose';
import Clients from './pages/auth/Clients';
import AddProduct from './pages/AddProduct';
import ManageUsers from './pages/ManageUsers';
import UserDetail from './pages/users/UserDetail';
import GamesList from './pages/products/GamesList';
import GameEditor from './pages/products/GameEditor';
import ProductsList from './pages/products/ProductsList';
import PromoList from './pages/content/PromoList';
import PromoEditor from './pages/content/PromoEditor';
import StoragePage from './pages/storage/StoragePage';
import PlaceholderPage from './pages/PlaceholderPage';
import ActivityLogs from './pages/ActivityLogs';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
        <Route path="overview" element={<Analytics />} />
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
        <Route path="wallets" element={<Wallets />} />
        {/* Revenue Routes */}
        <Route path="revenue/sales-overview" element={<Analytics />} />
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
        <Route path="auth/users" element={<ManageUsers />} />
        <Route path="auth/broker" element={<ManageUsers />} />
        <Route path="auth/admin" element={<ManageUsers />} />
        <Route path="auth/permissions" element={<PlaceholderPage title="Permissions" description="Manage admin roles, access rules, and permission groups." items={['Admin access', 'Support access', 'Reseller access']} />} />
        {/* Component Routes */}
        <Route path="components/tasks" element={<PlaceholderPage title="Tasks" description="Track internal admin tasks and operational follow-ups." items={['Open tasks', 'Assigned work', 'Completed tasks']} />} />
        <Route path="components/events" element={<PlaceholderPage title="Events" description="Review operational events and scheduled admin activity." items={['Upcoming events', 'Recent events', 'Event history']} />} />
        <Route path="documentation" element={<PlaceholderPage title="Documentation" description="Keep admin guides, internal process notes, and setup references in one place." items={['Admin guide', 'Supabase setup', 'Release notes']} />} />
        {/* Page Management Routes */}
        <Route path="pages/homepage" element={<Pages />} />
        <Route path="pages/homepage/trending-games" element={<PromoList section="trending" title="Trending Games" description="Manage cards shown in the homepage carousel" basePath="/pages/homepage/trending-games" />} />
        <Route path="pages/homepage/trending-games/new" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="pages/homepage/trending-games/:id" element={<PromoEditor section="trending" backPath="/pages/homepage/trending-games" sectionLabel="Trending Games" />} />
        <Route path="pages/homepage/exclusive-offers" element={<PromoList section="exclusive_offers" title="Exclusive Offers" description="Manage promotional offer cards on the homepage" basePath="/pages/homepage/exclusive-offers" />} />
        <Route path="pages/homepage/exclusive-offers/new" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="pages/homepage/exclusive-offers/:id" element={<PromoEditor section="exclusive_offers" backPath="/pages/homepage/exclusive-offers" sectionLabel="Exclusive Offers" />} />
        <Route path="pages/products" element={<Pages />} />
        <Route path="pages/about" element={<Pages />} />
        <Route path="pages/contact" element={<Pages />} />
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
