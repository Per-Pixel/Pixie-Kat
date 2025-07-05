import React from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, MessageSquare, Clock, CheckCircle } from 'lucide-react';

const Messages: React.FC = () => {
  const messages = [
    { id: '1', customer: 'John Doe', subject: 'Payment Issue', content: 'Having trouble with payment processing...', status: 'Open', priority: 'High', date: '2024-06-17' },
    { id: '2', customer: 'Jane Smith', subject: 'Product Question', content: 'Can you help me understand the difference...', status: 'In Progress', priority: 'Medium', date: '2024-06-17' },
    { id: '3', customer: 'Mike Johnson', subject: 'Refund Request', content: 'I would like to request a refund for...', status: 'Resolved', priority: 'Low', date: '2024-06-16' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Customer support and communication</p>
        </div>
        <button className="mt-4 sm:mt-0 btn btn-primary btn-md">
          <MessageSquare className="w-4 h-4 mr-2" />
          New Message
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search messages..." className="input pl-10" />
            </div>
          </div>
          <button className="btn btn-outline btn-md">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="divide-y divide-gray-200">
          {messages.map((message) => (
            <div key={message.id} className="p-6 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{message.subject}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      message.status === 'Open' ? 'bg-red-100 text-red-800' :
                      message.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {message.status === 'Open' && <Clock className="w-3 h-3 mr-1" />}
                      {message.status === 'Resolved' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {message.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{message.content}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>From: {message.customer}</span>
                    <span className="mx-2">•</span>
                    <span>Priority: {message.priority}</span>
                    <span className="mx-2">•</span>
                    <span>{message.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Messages;
