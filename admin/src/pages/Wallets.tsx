import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, DollarSign, TrendingUp, Plus, Send, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface WalletData {
  id: string;
  name: string;
  balance: string;
  currency: string;
  change: string;
  changeType: 'increase' | 'decrease';
}

interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

const walletData: WalletData[] = [
  {
    id: '1',
    name: 'Main Wallet',
    balance: '12,450.00',
    currency: 'USD',
    change: '+5.2%',
    changeType: 'increase',
  },
  {
    id: '2',
    name: 'Crypto Wallet',
    balance: '0.5847',
    currency: 'BTC',
    change: '+12.8%',
    changeType: 'increase',
  },
  {
    id: '3',
    name: 'Savings',
    balance: '8,920.00',
    currency: 'USD',
    change: '+2.1%',
    changeType: 'increase',
  },
];

const recentTransactions: Transaction[] = [
  {
    id: '1',
    type: 'incoming',
    amount: '+$1,250.00',
    description: 'Payment from client #12345',
    timestamp: '2 hours ago',
    status: 'completed',
  },
  {
    id: '2',
    type: 'outgoing',
    amount: '-$450.00',
    description: 'Withdrawal to bank account',
    timestamp: '1 day ago',
    status: 'completed',
  },
  {
    id: '3',
    type: 'incoming',
    amount: '+$890.00',
    description: 'Referral commission',
    timestamp: '2 days ago',
    status: 'completed',
  },
];

const Wallets: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
              <p className="text-gray-600">Manage your digital wallets and transactions</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Wallet
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Send className="w-4 h-4 mr-2" />
              Transfer
            </button>
          </div>
        </div>
      </motion.div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {walletData.map((wallet, index) => (
          <motion.div
            key={wallet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg p-6 text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{wallet.name}</h3>
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold">
                {wallet.balance} {wallet.currency}
              </p>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">{wallet.change} this month</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'incoming' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'incoming' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : transaction.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Wallets;
