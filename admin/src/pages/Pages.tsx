import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, Plus, ArrowRight, Eye, EyeOff, Image, ListOrdered, HelpCircle, Mail, BadgePercent, Gamepad2, Sparkles, Layout, Shield } from 'lucide-react';
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

  const pageEditors = [
    {
      title: 'JJK Cheaper Guide',
      description: 'Draft event archive at /event/jjk-cheaper — sections, placements & publish',
      icon: Sparkles,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accentColor: 'border-rose-500',
      editPath: '/pages/events/jjk-cheaper',
    },
    {
      title: 'Products Page',
      description: 'Hero carousel slides for the /games products page',
      icon: Gamepad2,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      accentColor: 'border-sky-500',
      editPath: '/pages/products',
    },
    {
      title: 'How It Works',
      description: 'Steps, features, stats & banners for /how-it-works',
      icon: ListOrdered,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      accentColor: 'border-indigo-500',
      editPath: '/pages/how-it-works',
    },
    {
      title: 'FAQ',
      description: 'Categories, questions & support copy for /faq',
      icon: HelpCircle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accentColor: 'border-amber-500',
      editPath: '/pages/faq',
    },
    {
      title: 'Contact Page',
      description: 'Support email, phone, hours, office address & map',
      icon: Mail,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accentColor: 'border-rose-500',
      editPath: '/pages/contact',
    },
    {
      title: 'Pricing Copy',
      description: 'Headings, empty state & FAQ copy for /pricing',
      icon: BadgePercent,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accentColor: 'border-emerald-500',
      editPath: '/pages/pricing',
    },
    {
      title: 'Footer Section',
      description: 'CTA headings, contact email, social links, nav links & copyright',
      icon: Layout,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      accentColor: 'border-violet-500',
      editPath: '/pages/footer',
    },
    {
      title: 'Legal & Policies',
      description: 'Terms of Service, Privacy Policy & Refund Policy document sections',
      icon: Shield,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accentColor: 'border-blue-500',
      editPath: '/pages/legal',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage homepage sections and dynamic content areas.</p>
      </motion.div>

      {/* Hero section shortcut */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="bg-white rounded-xl border-l-4 border-primary-500 border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Image className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Hero Section</h2>
            <p className="text-xs text-gray-500 mt-0.5">Images, transforms, text & CTA button for the homepage hero</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/pages/homepage/hero')}
          className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Edit Hero
        </button>
      </motion.div>

      {/* About section shortcut */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="bg-white rounded-xl border-l-4 border-teal-500 border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Image className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">About Section</h2>
            <p className="text-xs text-gray-500 mt-0.5">Homepage about block — text, CTA, image transforms, colors & layout</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/pages/homepage/about')}
          className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          Edit About
        </button>
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

      {/* Page content editors */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {pageEditors.map((page) => {
          const Icon = page.icon;
          return (
            <div
              key={page.editPath}
              className={`bg-white rounded-xl border-l-4 ${page.accentColor} border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${page.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${page.iconColor}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{page.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{page.description}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(page.editPath)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          );
        })}
      </motion.div>

    </div>
  );
};

export default Pages;
