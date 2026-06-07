import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  items?: string[];
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, items = [] }) => (
  <div className="space-y-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-gray-600">{description}</p>
      </div>
    </motion.div>

    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Construction className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ready for setup</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            This section is now available in the admin navigation. Add the working tools here when the feature is ready.
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
              <span>{item}</span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>
      ) : null}
    </motion.section>
  </div>
);

export default PlaceholderPage;
