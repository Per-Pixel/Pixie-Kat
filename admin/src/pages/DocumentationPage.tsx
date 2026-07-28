import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Database, Crown, FileText, ArrowRight, ExternalLink } from 'lucide-react';

interface DocLink {
  label: string;
  path: string;
  description: string;
}

const contentEditors: DocLink[] = [
  { label: 'Hero Section', path: '/pages/homepage/hero', description: 'Homepage hero images, text & CTA' },
  { label: 'About Section', path: '/pages/homepage/about', description: 'Homepage about block — copy & image (animation preserved on storefront)' },
  { label: 'Products Page', path: '/pages/products', description: 'Hero carousel slides for /games' },
  { label: 'Trending Games', path: '/pages/homepage/trending-games', description: 'Homepage carousel cards' },
  { label: 'Exclusive Offers', path: '/pages/homepage/exclusive-offers', description: 'Promotional offer cards' },
  { label: 'How It Works', path: '/pages/how-it-works', description: 'Steps, features & stats for /how-it-works' },
  { label: 'FAQ', path: '/pages/faq', description: 'Categories & questions for /faq' },
  { label: 'Contact Page', path: '/pages/contact', description: 'Support email, phone, hours & map' },
  { label: 'Pricing Copy', path: '/pages/pricing', description: 'Headings & FAQ copy for /pricing' },
];

const DocumentationPage: React.FC = () => (
  <div className="space-y-6">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Documentation</h1>
          <p className="text-sm text-gray-500">Internal guides for Pixie-Kat admin operations</p>
        </div>
      </div>
    </motion.div>

    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-900">Admin Guide Overview</h2>
      <div className="prose prose-sm max-w-none text-gray-600">
        <p>
          The Pixie-Kat admin panel manages products, orders, users, memberships, and storefront content.
          Content editors write to the <code className="text-xs bg-gray-100 px-1 rounded">store_settings</code> table
          (singleton row with <code className="text-xs bg-gray-100 px-1 rounded">id = true</code>). The customer
          frontend reads these JSONB columns on page load — no redeploy needed after saving.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-3">
          <li>Use <strong>Content → Homepage</strong> for hero, about, trending games, and exclusive offers.</li>
          <li>Use <strong>Memberships</strong> for plan prices, discounts, and benefits (not Pricing Copy).</li>
          <li>Use <strong>Products → Games</strong> for game catalog and top-up products.</li>
          <li>Changes appear on the live site after the next customer page load.</li>
        </ul>
      </div>
    </motion.section>

    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Supabase Setup</h2>
      </div>
      <div className="text-sm text-gray-600 space-y-3">
        <p>
          Database schema is versioned in <code className="text-xs bg-gray-100 px-1 rounded">supabase/migrations/</code>.
          Apply migrations in order before running the admin or storefront apps.
        </p>
        <p>Key migrations for CMS content:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="text-xs bg-gray-100 px-1 rounded">021_about_settings.sql</code> — homepage <code className="text-xs bg-gray-100 px-1 rounded">about_settings</code> JSONB</li>
          <li><code className="text-xs bg-gray-100 px-1 rounded">022_cms_page_settings.sql</code> — how_it_works, faq, contact, pricing_settings</li>
          <li><code className="text-xs bg-gray-100 px-1 rounded">023_about_page_settings.sql</code> — client /about page <code className="text-xs bg-gray-100 px-1 rounded">about_page_settings</code> (separate from homepage)</li>
          <li><code className="text-xs bg-gray-100 px-1 rounded">024_products_page_settings.sql</code> — <code className="text-xs bg-gray-100 px-1 rounded">products_page_settings</code> (Games page hero slides)</li>
          <li><code className="text-xs bg-gray-100 px-1 rounded">025_appearance_settings.sql</code> — <code className="text-xs bg-gray-100 px-1 rounded">appearance_settings</code> (favicon, logo, tab titles, music)</li>
        </ul>
        <p>
          Branding lives under <strong>Settings → Appearance</strong> (not Content). Apply migrations{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">024</code> and{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">025</code> before saving from those editors.
        </p>
        <p>
          Configure <code className="text-xs bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in both{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">admin/.env</code> and{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">main/.env</code>.
        </p>
      </div>
    </motion.section>

    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Memberships CMS</h2>
      </div>
      <p className="text-sm text-gray-600">
        Membership plan prices, durations, discount percentages, and benefit lists live in the{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">membership_plans</code> table.
        The Pricing page editor only controls headings, empty-state message, and FAQ copy.
      </p>
      <Link to="/memberships" className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
        Open Memberships <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.section>

    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Content Editors</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {contentEditors.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 hover:border-primary-200 hover:bg-primary-50/30 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-500 shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </motion.section>
  </div>
);

export default DocumentationPage;
