import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        <div className="flex items-center mt-2">
          {changeType === 'increase' ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${
            changeType === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {change}
          </span>
          <span className="text-sm text-gray-500 ml-1">vs last month</span>
        </div>
      </div>
      <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
    </div>
  </motion.div>
);

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      changeType: 'increase' as const,
      icon: DollarSign,
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: '+15.3%',
      changeType: 'increase' as const,
      icon: ShoppingCart,
    },
    {
      title: 'Total Customers',
      value: '856',
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: Users,
    },
    {
      title: 'Active Products',
      value: '42',
      change: '-2.4%',
      changeType: 'decrease' as const,
      icon: Package,
    },
  ];

  // Chart data
  const revenueData = [
    { month: 'Jan', revenue: 4000, orders: 240 },
    { month: 'Feb', revenue: 3000, orders: 198 },
    { month: 'Mar', revenue: 5000, orders: 300 },
    { month: 'Apr', revenue: 4500, orders: 278 },
    { month: 'May', revenue: 6000, orders: 389 },
    { month: 'Jun', revenue: 5500, orders: 349 },
    { month: 'Jul', revenue: 7000, orders: 430 },
  ];

  const salesData = [
    { name: 'PUBG Mobile', value: 35, color: '#8884d8' },
    { name: 'Free Fire', value: 25, color: '#82ca9d' },
    { name: 'Mobile Legends', value: 20, color: '#ffc658' },
    { name: 'Genshin Impact', value: 15, color: '#ff7300' },
    { name: 'Others', value: 5, color: '#00ff88' },
  ];

  const dailyStats = [
    { day: 'Mon', sales: 120, visitors: 400 },
    { day: 'Tue', sales: 150, visitors: 450 },
    { day: 'Wed', sales: 180, visitors: 500 },
    { day: 'Thu', sales: 200, visitors: 550 },
    { day: 'Fri', sales: 250, visitors: 600 },
    { day: 'Sat', sales: 300, visitors: 700 },
    { day: 'Sun', sales: 280, visitors: 650 },
  ];

  const recentOrders = [
    { id: '#3210', customer: 'John Doe', product: 'PUBG Mobile Credits', amount: '$25.00', status: 'Completed' },
    { id: '#3209', customer: 'Jane Smith', product: 'Free Fire Diamonds', amount: '$15.00', status: 'Processing' },
    { id: '#3208', customer: 'Mike Johnson', product: 'Mobile Legends Diamonds', amount: '$30.00', status: 'Completed' },
    { id: '#3207', customer: 'Sarah Wilson', product: 'Genshin Impact Genesis', amount: '$50.00', status: 'Pending' },
    { id: '#3206', customer: 'Tom Brown', product: 'Valorant Points', amount: '$20.00', status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">Welcome back, Admin!</h1>
        <p className="text-primary-100">Here's what's happening with your store today.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <p className="text-sm text-gray-500">Monthly revenue and order count</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? `$${value}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sales Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Sales by Game</h3>
            <p className="text-sm text-gray-500">Distribution of sales across games</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {salesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Performance</h3>
            <p className="text-sm text-gray-500">Sales and visitor trends this week</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                <Bar dataKey="visitors" fill="#10b981" name="Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'Processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.product}</p>
                    <p className="text-sm font-medium text-gray-900">{order.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Third Row - Quick Actions */}
      <div className="grid grid-cols-1 gap-6">

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Package className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Add Product</p>
                <p className="text-sm text-gray-500">Create new product</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Users className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">View all customers</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <ShoppingCart className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">View Orders</p>
                <p className="text-sm text-gray-500">Check recent orders</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Eye className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Analytics</p>
                <p className="text-sm text-gray-500">View detailed stats</p>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
