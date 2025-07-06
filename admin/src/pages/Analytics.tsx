import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Eye, Clock, DollarSign } from 'lucide-react';
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

interface AnalyticsCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
}

const analyticsData: AnalyticsCard[] = [
  {
    title: 'Page Views',
    value: '24,567',
    change: '+12.5%',
    changeType: 'increase',
    icon: Eye,
  },
  {
    title: 'Unique Visitors',
    value: '8,234',
    change: '+8.2%',
    changeType: 'increase',
    icon: Users,
  },
  {
    title: 'Avg. Session Duration',
    value: '4m 32s',
    change: '+15.3%',
    changeType: 'increase',
    icon: Clock,
  },
  {
    title: 'Conversion Rate',
    value: '3.24%',
    change: '-2.1%',
    changeType: 'decrease',
    icon: TrendingUp,
  },
];

const Analytics: React.FC = () => {
  // Chart data
  const trafficData = [
    { month: 'Jan', organic: 4000, direct: 2400, social: 1200, referral: 800 },
    { month: 'Feb', organic: 3000, direct: 1398, social: 1100, referral: 900 },
    { month: 'Mar', organic: 5000, direct: 2800, social: 1300, referral: 1000 },
    { month: 'Apr', organic: 4500, direct: 2780, social: 1400, referral: 1100 },
    { month: 'May', organic: 6000, direct: 3890, social: 1500, referral: 1200 },
    { month: 'Jun', organic: 5500, direct: 3490, social: 1600, referral: 1300 },
  ];

  const deviceData = [
    { name: 'Desktop', value: 45, color: '#3b82f6' },
    { name: 'Mobile', value: 40, color: '#10b981' },
    { name: 'Tablet', value: 15, color: '#f59e0b' },
  ];

  const conversionData = [
    { step: 'Landing', users: 10000, rate: 100 },
    { step: 'Product View', users: 7500, rate: 75 },
    { step: 'Add to Cart', users: 3000, rate: 30 },
    { step: 'Checkout', users: 1500, rate: 15 },
    { step: 'Purchase', users: 450, rate: 4.5 },
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
          <BarChart3 className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">Track your website performance and user behavior</p>
          </div>
        </div>
      </motion.div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsData.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{item.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{item.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`w-4 h-4 mr-1 ${
                    item.changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="organic" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="direct" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="social" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="referral" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Demographics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Conversion Funnel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Conversion Funnel</h3>
          <p className="text-sm text-gray-500">User journey from landing to purchase</p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="step" type="category" width={100} />
              <Tooltip formatter={(value, name) => [value, name === 'users' ? 'Users' : 'Rate %']} />
              <Bar dataKey="users" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Pages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Pages</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { page: '/dashboard', views: '5,234', percentage: '23.4%' },
              { page: '/products', views: '3,891', percentage: '17.2%' },
              { page: '/about', views: '2,567', percentage: '11.8%' },
              { page: '/contact', views: '1,892', percentage: '8.9%' },
            ].map((item, index) => (
              <div key={item.page} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.page}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{item.views} views</span>
                  <span className="text-sm font-medium text-primary-600">{item.percentage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
