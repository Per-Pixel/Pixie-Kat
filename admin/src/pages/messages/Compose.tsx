import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Users, User, X } from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'user' | 'group';
}

const availableRecipients: Recipient[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', type: 'user' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', type: 'user' },
  { id: '3', name: 'All Users', email: 'all@users', type: 'group' },
  { id: '4', name: 'Premium Members', email: 'premium@members', type: 'group' },
];

const Compose: React.FC = () => {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  const addRecipient = (recipient: Recipient) => {
    if (!recipients.find(r => r.id === recipient.id)) {
      setRecipients([...recipients, recipient]);
    }
    setShowRecipientDropdown(false);
  };

  const removeRecipient = (recipientId: string) => {
    setRecipients(recipients.filter(r => r.id !== recipientId));
  };

  const handleSend = () => {
    if (recipients.length === 0 || !subject.trim() || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Handle send logic here
    console.log('Sending message:', { recipients, subject, message });
    alert('Message sent successfully!');
    
    // Reset form
    setRecipients([]);
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center">
          <Send className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compose Message</h1>
            <p className="text-gray-600">Send messages to users and groups</p>
          </div>
        </div>
      </motion.div>

      {/* Compose Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="space-y-6">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipients *
            </label>
            <div className="space-y-3">
              {/* Selected Recipients */}
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((recipient) => (
                    <span
                      key={recipient.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {recipient.type === 'group' ? (
                        <Users className="w-4 h-4 mr-1" />
                      ) : (
                        <User className="w-4 h-4 mr-1" />
                      )}
                      {recipient.name}
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Add Recipients */}
              <div className="relative">
                <button
                  onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  {recipients.length === 0 ? 'Select recipients...' : 'Add more recipients...'}
                </button>
                
                {showRecipientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    {availableRecipients
                      .filter(r => !recipients.find(selected => selected.id === r.id))
                      .map((recipient) => (
                        <button
                          key={recipient.id}
                          onClick={() => addRecipient(recipient)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center"
                        >
                          {recipient.type === 'group' ? (
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                          ) : (
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                          )}
                          <div>
                            <div className="font-medium">{recipient.name}</div>
                            <div className="text-sm text-gray-500">{recipient.email}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter message subject..."
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Type your message here..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              <Paperclip className="w-4 h-4 mr-2" />
              Attach File
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={handleSend}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Compose;
