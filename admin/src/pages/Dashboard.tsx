import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  Wallet,
  UserPlus,
  Ticket,
  UserCheck,
  Activity,
  CreditCard,
  Crown,
  ArrowUpRight,
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
  const navigate = useNavigate();

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

  // Today's snapshot
  const todayStats = [
    { label: "Today's Revenue", value: '$1,842', icon: DollarSign, accent: 'bg-blue-50 text-blue-600' },
    { label: "Today's Orders", value: '47', icon: ShoppingCart, accent: 'bg-emerald-50 text-emerald-600' },
    { label: 'New Signups', value: '12', icon: UserPlus, accent: 'bg-purple-50 text-purple-600' },
    { label: 'Deposits Today', value: '$2,310', icon: Wallet, accent: 'bg-amber-50 text-amber-600' },
  ];

  // Pending action items
  const pendingTasks: Array<{ label: string; count: number; icon: React.ComponentType<{ className?: string }>; to: string; tone: 'amber' | 'blue' | 'red' | 'purple' }> = [
    { label: 'Pending Orders', count: 8, icon: ShoppingCart, to: '/orders', tone: 'amber' },
    { label: 'Pending Deposits', count: 3, icon: Wallet, to: '/wallets', tone: 'blue' },
    { label: 'Open Support Tickets', count: 5, icon: Ticket, to: '/messages', tone: 'red' },
    { label: 'KYC Verifications', count: 2, icon: UserCheck, to: '/users', tone: 'purple' },
  ];

  const toneClasses: Record<'amber' | 'blue' | 'red' | 'purple', string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  // Recent activity feed
  const recentActivity = [
    { type: 'order', text: 'New order #3211 from Alex Tan', time: '2m ago', icon: ShoppingCart, color: 'text-emerald-600' },
    { type: 'deposit', text: 'Reza deposited $50.00', time: '12m ago', icon: Wallet, color: 'text-amber-600' },
    { type: 'signup', text: 'New user: priya@example.com', time: '34m ago', icon: UserPlus, color: 'text-purple-600' },
    { type: 'order', text: 'Order #3208 marked completed', time: '1h ago', icon: ShoppingCart, color: 'text-emerald-600' },
    { type: 'ticket', text: 'New support ticket from Mike', time: '2h ago', icon: Ticket, color: 'text-red-600' },
  ];

  // New signups trend (this week)
  const signupsData = [
    { day: 'Mon', signups: 8 },
    { day: 'Tue', signups: 12 },
    { day: 'Wed', signups: 15 },
    { day: 'Thu', signups: 9 },
    { day: 'Fri', signups: 21 },
    { day: 'Sat', signups: 27 },
    { day: 'Sun', signups: 19 },
  ];

  // Top selling products / games
  const topGames = [
    { name: 'PUBG Mobile UC', sales: 312, revenue: '$7,840' },
    { name: 'Free Fire Diamonds', sales: 264, revenue: '$5,210' },
    { name: 'Mobile Legends Diamonds', sales: 198, revenue: '$4,950' },
    { name: 'Genshin Impact Genesis', sales: 142, revenue: '$3,890' },
    { name: 'Valorant Points', sales: 98, revenue: '$2,140' },
  ];

  // Top customers / spenders
  const topCustomers = [
    { name: 'Alex Tan', email: 'alex@example.com', spent: '$1,420', orders: 38 },
    { name: 'Priya Sharma', email: 'priya@example.com', spent: '$1,180', orders: 31 },
    { name: 'Reza Putra', email: 'reza@example.com', spent: '$980', orders: 27 },
    { name: 'Maria Lopez', email: 'maria@example.com', spent: '$870', orders: 22 },
    { name: 'Tom Brown', email: 'tom@example.com', spent: '$720', orders: 19 },
  ];

  // Payment method breakdown
  const paymentMethods = [
    { name: 'Credit Card', value: 45, color: '#3b82f6' },
    { name: 'PayPal', value: 25, color: '#10b981' },
    { name: 'Crypto', value: 15, color: '#f59e0b' },
    { name: 'Bank Transfer', value: 10, color: '#8b5cf6' },
    { name: 'Wallet Balance', value: 5, color: '#ef4444' },
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

      {/* Today's Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {todayStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.accent}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

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

      {/* Pending Tasks + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pending Tasks</h3>
              <p className="text-sm text-gray-500">Items waiting for your action</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pendingTasks.map((task) => (
              <button
                key={task.label}
                onClick={() => navigate(task.to)}
                className={`flex items-center justify-between p-4 rounded-lg border ${toneClasses[task.tone]} hover:shadow-sm transition-all text-left`}
              >
                <div className="flex items-center gap-3">
                  <task.icon className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-medium">{task.label}</p>
                    <p className="text-xs opacity-75">Click to review</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{task.count}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{a.text}</p>
                    <p className="text-xs text-gray-500">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
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

        {/* New Signups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">New Signups</h3>
            <p className="text-sm text-gray-500">User registrations this week</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={signupsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="signups" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Signups" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Orders + Top Selling Games */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <button onClick={() => navigate('/orders')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
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

        {/* Top Selling Games */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Games</h3>
            </div>
            <button onClick={() => navigate('/products')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topGames.map((g, i) => (
                <div key={g.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-500">{g.sales} sales</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{g.revenue}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Customers + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
            </div>
            <button onClick={() => navigate('/users')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topCustomers.map((c) => (
                <div key={c.email} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{c.spent}</p>
                    <p className="text-xs text-gray-500">{c.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                  {paymentMethods.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2">
              {paymentMethods.map((m) => (
                <li key={m.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: m.color }} />
                    <span className="text-gray-700">{m.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{m.value}%</span>
                </li>
              ))}
            </ul>
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
              <button onClick={() => navigate('/quick/add-product')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Package className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Add Product</p>
                <p className="text-sm text-gray-500">Create new product</p>
              </button>
              <button onClick={() => navigate('/quick/manage-users')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Users className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">View all customers</p>
              </button>
              <button onClick={() => navigate('/orders')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <ShoppingCart className="w-8 h-8 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">View Orders</p>
                <p className="text-sm text-gray-500">Check recent orders</p>
              </button>
              <button onClick={() => navigate('/analytics')} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
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
