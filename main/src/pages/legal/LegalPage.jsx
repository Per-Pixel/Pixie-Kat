import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, RefreshCw, ChevronRight, Calendar, Lock, AlertCircle } from 'lucide-react';
import { fetchLegalSettings, DEFAULT_LEGAL } from '../../lib/storeContent';
import PageWrapper from '../../components/common/PageWrapper';

const policyTabs = [
  { key: 'terms', path: '/terms', label: 'Terms of Service', icon: FileText },
  { key: 'privacy', path: '/privacy', label: 'Privacy Policy', icon: Lock },
  { key: 'refund', path: '/refund-policy', label: 'Refund Policy', icon: RefreshCw },
];

const LegalPage = ({ docKey }) => {
  const location = useLocation();
  const [legalData, setLegalData] = useState(DEFAULT_LEGAL);
  const [loading, setLoading] = useState(true);

  // Determine current key based on prop or pathname
  const activeKey = docKey || (
    location.pathname.includes('privacy')
      ? 'privacy'
      : location.pathname.includes('refund')
      ? 'refund'
      : 'terms'
  );

  useEffect(() => {
    fetchLegalSettings().then((data) => {
      if (data) setLegalData(data);
      setLoading(false);
    });
  }, []);

  const doc = legalData[activeKey] || DEFAULT_LEGAL[activeKey] || DEFAULT_LEGAL.terms;

  return (
    <PageWrapper>
      <div className="relative min-h-screen bg-[#0b0c10] text-gray-100 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-violet-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Legal & Governance
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              {doc.title}
            </h1>
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
              {doc.subtitle}
            </p>
            {doc.last_updated && (
              <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-md border border-white/5">
                <Calendar className="w-3.5 h-3.5" /> Last updated: {doc.last_updated}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10">
            {policyTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeKey === tab.key;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Policy Content Sections */}
          {loading ? (
            <div className="py-20 text-center text-gray-500 space-y-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm">Loading legal document...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {doc.sections && doc.sections.length > 0 ? (
                doc.sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="bg-[#12141c]/80 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-3 hover:border-violet-500/30 transition-colors"
                  >
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      {section.heading}
                    </h2>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-violet-400" />
                  No policy sections configured yet.
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="pt-6 border-t border-white/10 text-center text-xs text-gray-500">
            Have questions regarding these policies? Reach out to our 24/7 team at{' '}
            <a href="mailto:support@pixiekatstore.com" className="text-violet-400 hover:underline">
              support@pixiekatstore.com
            </a>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default LegalPage;
