import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Overview from './pages/Overview';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Games from './pages/Games';
import Messages from './pages/Messages';
import Resellers from './pages/Resellers';
import Settings from './pages/Settings';
import Pages from './pages/Pages';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Wallets from './pages/Wallets';
import SalesOverview from './pages/revenue/SalesOverview';
import RevenueProducts from './pages/revenue/RevenueProducts';
import Brokers from './pages/revenue/Brokers';
import Referral from './pages/revenue/Referral';
import Compose from './pages/messages/Compose';
import Clients from './pages/auth/Clients';
import AddProduct from './pages/AddProduct';
import ManageUsers from './pages/ManageUsers';
import UserDetail from './pages/users/UserDetail';

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
        <Route path="overview" element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="games" element={<Games />} />
        <Route path="messages" element={<Messages />} />
        <Route path="resellers" element={<Resellers />} />
        <Route path="settings" element={<Settings />} />
        <Route path="pages" element={<Pages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="wallets" element={<Wallets />} />
        {/* Revenue Routes */}
        <Route path="revenue/sales-overview" element={<SalesOverview />} />
        <Route path="revenue/products" element={<RevenueProducts />} />
        <Route path="revenue/brokers" element={<Brokers />} />
        <Route path="revenue/referral" element={<Referral />} />
        {/* Message Routes */}
        <Route path="messages/compose" element={<Compose />} />
        <Route path="messages/received" element={<Messages />} />
        <Route path="messages/history" element={<Messages />} />
        {/* Auth Routes */}
        <Route path="auth/clients" element={<Clients />} />
        <Route path="auth/users" element={<ManageUsers />} />
        <Route path="auth/broker" element={<ManageUsers />} />
        <Route path="auth/admin" element={<ManageUsers />} />
        {/* Page Management Routes */}
        <Route path="pages/homepage" element={<Pages />} />
        <Route path="pages/products" element={<Pages />} />
        <Route path="pages/about" element={<Pages />} />
        <Route path="pages/contact" element={<Pages />} />
        {/* Quick Action Routes */}
        <Route path="quick/add-product" element={<AddProduct />} />
        <Route path="quick/manage-users" element={<ManageUsers />} />
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
