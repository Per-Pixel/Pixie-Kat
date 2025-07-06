import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SalesMetric {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
}

const salesMetrics: SalesMetric[] = [
  {
    title: 'Total Revenue',
    value: '$124,567',
    change: '+18.2%',
    changeType: 'increase',
    icon: DollarSign,
  },
  {
    title: 'Total Orders',
    value: '2,847',
    change: '+12.5%',
    changeType: 'increase',
    icon: ShoppingCart,
  },
  {
    title: 'New Customers',
    value: '456',
    change: '+8.7%',
    changeType: 'increase',
    icon: Users,
  },
  {
    title: 'Products Sold',
    value: '3,921',
    change: '+15.3%',
    changeType: 'increase',
    icon: Package,
  },
];

const topProducts = [
  { name: 'Gaming Mouse Pro', sales: '$12,450', units: '245', growth: '+23%' },
  { name: 'Mechanical Keyboard', sales: '$8,920', units: '178', growth: '+18%' },
  { name: 'Gaming Headset', sales: '$6,780', units: '156', growth: '+12%' },
  { name: 'Webcam HD', sales: '$4,560', units: '89', growth: '+8%' },
];

const SalesOverview: React.FC = () => {
  // Chart data
  const revenueData = [
    { month: 'Jan', revenue: 45000, orders: 320, customers: 180 },
    { month: 'Feb', revenue: 52000, orders: 380, customers: 220 },
    { month: 'Mar', revenue: 48000, orders: 350, customers: 200 },
    { month: 'Apr', revenue: 61000, orders: 420, customers: 280 },
    { month: 'May', revenue: 55000, orders: 390, customers: 250 },
    { month: 'Jun', revenue: 67000, orders: 480, customers: 320 },
    { month: 'Jul', revenue: 72000, orders: 520, customers: 350 },
    { month: 'Aug', revenue: 68000, orders: 490, customers: 330 },
    { month: 'Sep', revenue: 75000, orders: 550, customers: 380 },
    { month: 'Oct', revenue: 82000, orders: 600, customers: 420 },
    { month: 'Nov', revenue: 89000, orders: 650, customers: 450 },
    { month: 'Dec', revenue: 95000, orders: 720, customers: 500 },
  ];

  const categoryData = [
    { name: 'PUBG Mobile Credits', value: 35, color: '#3b82f6', sales: 42500 },
    { name: 'Free Fire Diamonds', value: 28, color: '#10b981', sales: 34000 },
    { name: 'Mobile Legends', value: 20, color: '#f59e0b', sales: 24300 },
    { name: 'Genshin Impact', value: 12, color: '#ef4444', sales: 14600 },
    { name: 'Valorant Points', value: 5, color: '#8b5cf6', sales: 6100 },
  ];

  const weeklyData = [
    { day: 'Mon', sales: 12000, target: 15000 },
    { day: 'Tue', sales: 15000, target: 15000 },
    { day: 'Wed', sales: 18000, target: 15000 },
    { day: 'Thu', sales: 14000, target: 15000 },
    { day: 'Fri', sales: 22000, target: 15000 },
    { day: 'Sat', sales: 25000, target: 15000 },
    { day: 'Sun', sales: 20000, target: 15000 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center">
          <PieChart className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Overview</h1>
            <p className="text-gray-600">Track your sales performance and revenue metrics</p>
          </div>
        </div>
      </motion.div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {salesMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`w-4 h-4 mr-1 ${
                    metric.changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                <metric.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === 'revenue' ? `$${value.toLocaleString()}` : value,
                  name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Customers'
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#10b981"
                strokeWidth={2}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sales by Category */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Game Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => [
                  `${value}% ($${props.payload.sales.toLocaleString()})`,
                  'Market Share'
                ]}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Weekly Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Sales Performance</h3>
          <p className="text-sm text-gray-500">Daily sales vs targets this week</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
              <Legend />
              <Bar dataKey="sales" fill="#3b82f6" name="Actual Sales" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.units} units sold</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-900">{product.sales}</span>
                  <span className="text-sm font-medium text-green-600">{product.growth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SalesOverview;
