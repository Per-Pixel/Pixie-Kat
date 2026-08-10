import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, Plus, ArrowRight, Eye, EyeOff, Code2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listPromoItems, PromoItem } from '../services/catalogService';

interface SectionStats {
  items: PromoItem[];
  loading: boolean;
}

const Pages: React.FC = () => {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<SectionStats>({ items: [], loading: true });
  const [exclusive, setExclusive] = useState<SectionStats>({ items: [], loading: true });

  useEffect(() => {
    listPromoItems('trending')
      .then(items => setTrending({ items, loading: false }))
      .catch(() => { toast.error('Failed to load trending items'); setTrending(p => ({ ...p, loading: false })); });

    listPromoItems('exclusive_offers')
      .then(items => setExclusive({ items, loading: false }))
      .catch(() => { toast.error('Failed to load exclusive offers'); setExclusive(p => ({ ...p, loading: false })); });
  }, []);

  const dynamicSections = [
    {
      id: 'trending',
      title: 'Trending Games',
      description: 'Featured game cards shown in the homepage carousel.',
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accentColor: 'border-blue-500',
      stats: trending,
      listPath: '/pages/homepage/trending-games',
      newPath: '/pages/homepage/trending-games/new',
    },
    {
      id: 'exclusive',
      title: 'Exclusive Offers',
      description: 'Promotional offer cards displayed in the homepage banner.',
      icon: Zap,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      accentColor: 'border-purple-500',
      stats: exclusive,
      listPath: '/pages/homepage/exclusive-offers',
      newPath: '/pages/homepage/exclusive-offers/new',
    },
  ];

  const staticPages = [
    { name: 'Homepage Layout', path: '/', note: 'React component — main/src/pages/index' },
    { name: 'Products Page', path: '/products', note: 'Dynamic — fetched from games table' },
    { name: 'About Page', path: '/about', note: 'Static page — managed in code' },
    { name: 'Contact Page', path: '/contact', note: 'Static page — managed in code' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage homepage sections and dynamic content areas.</p>
      </motion.div>

      {/* Dynamic content sections */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {dynamicSections.map((section) => {
          const Icon = section.icon;
          const { items, loading } = section.stats;
          const activeCount = items.filter(i => i.is_active).length;
          const recentItems = items.slice(0, 3);

          return (
            <div
              key={section.id}
              className={`bg-white rounded-xl border-l-4 ${section.accentColor} border border-gray-200 shadow-sm overflow-hidden`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${section.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${section.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{section.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 mb-4">
                  {loading ? (
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                        <p className="text-xs text-gray-500">Total items</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                        <p className="text-xs text-gray-500">Active / visible</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-400">{items.length - activeCount}</p>
                        <p className="text-xs text-gray-500">Hidden</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Recent items preview */}
                {!loading && recentItems.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {recentItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">
                          {item.is_active
                            ? <Eye className="w-3.5 h-3.5 text-green-500" />
                            : <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                          }
                        </span>
                        <span className="text-gray-700 truncate flex-1">{item.title}</span>
                        {item.flag && <span className="text-base">{item.flag}</span>}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-gray-400 pl-5">+{items.length - 3} more</p>
                    )}
                  </div>
                )}

                {!loading && items.length === 0 && (
                  <p className="text-sm text-gray-400 mb-4">No items yet — add your first one.</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(section.listPath)}
                    className="flex-1 btn btn-outline btn-sm flex items-center justify-center gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Manage
                  </button>
                  <button
                    onClick={() => navigate(section.newPath)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Static pages */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Code2 className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Static Pages</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5" />
            Managed via code — not editable from admin
          </span>
        </div>
        <ul className="divide-y divide-gray-100">
          {staticPages.map(page => (
            <li key={page.name} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{page.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{page.note}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Static</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
};

export default Pages;
