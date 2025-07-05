import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

const Overview: React.FC = () => {
  const monthlyData = [
    { month: 'Jan', revenue: 4000, orders: 240 },
    { month: 'Feb', revenue: 3000, orders: 198 },
    { month: 'Mar', revenue: 5000, orders: 300 },
    { month: 'Apr', revenue: 4500, orders: 278 },
    { month: 'May', revenue: 6000, orders: 389 },
    { month: 'Jun', revenue: 5500, orders: 349 },
  ];

  const gameData = [
    { name: 'PUBG Mobile', value: 35, color: '#3B82F6' },
    { name: 'Free Fire', value: 25, color: '#10B981' },
    { name: 'Mobile Legends', value: 20, color: '#F59E0B' },
    { name: 'Genshin Impact', value: 15, color: '#EF4444' },
    { name: 'Others', value: 5, color: '#6B7280' },
  ];

  const stats = [
    { title: 'Total Revenue', value: '$28,500', change: '+12.5%', icon: DollarSign, color: 'text-green-600' },
    { title: 'Total Orders', value: '1,754', change: '+8.2%', icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Active Users', value: '892', change: '+15.3%', icon: Users, color: 'text-purple-600' },
    { title: 'Growth Rate', value: '23.1%', change: '+2.4%', icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Overview</h1>
        <p className="text-gray-600">Comprehensive insights into your business performance</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm font-medium mt-2 ${stat.color}`}>{stat.change}</p>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Game Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gameData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {gameData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Orders Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

export default Overview;
