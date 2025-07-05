import React from 'react';
import { motion } from 'framer-motion';
import { Save, Bell, Shield, Globe, Palette, Database } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your admin panel preferences</p>
        </div>
        <button className="mt-4 sm:mt-0 btn btn-primary btn-md">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Site Name</label>
              <input type="text" defaultValue="PixieKat Admin" className="input" />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <select className="input">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select className="input">
                <option>UTC</option>
                <option>EST</option>
                <option>PST</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email notifications</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Order alerts</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Low stock alerts</span>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Two-factor authentication</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Session timeout (minutes)</span>
              <input type="number" defaultValue="30" className="input w-20" />
            </div>
            <button className="btn btn-outline btn-sm">Change Password</button>
          </div>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center mb-4">
            <Palette className="w-5 h-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Theme</label>
              <select className="input">
                <option>Light</option>
                <option>Dark</option>
                <option>Auto</option>
              </select>
            </div>
            <div>
              <label className="label">Sidebar Position</label>
              <select className="input">
                <option>Left</option>
                <option>Right</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Database Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center mb-4">
          <Database className="w-5 h-5 text-primary-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Database & Backup</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-outline btn-md">Backup Database</button>
          <button className="btn btn-outline btn-md">Export Data</button>
          <button className="btn btn-outline btn-md">Clear Cache</button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
