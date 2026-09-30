import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, RefreshCw, Calendar, Lock, AlertCircle } from 'lucide-react';
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
      <div className="relative min-h-screen bg-[#0b0c10] px-4 pb-20 pt-28 text-gray-100 sm:px-6 lg:px-8">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-full max-w-4xl -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <Shield className="size-4" /> Legal & Governance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {doc.title}
            </h1>
            <p className="mx-auto max-w-2xl text-base text-gray-400 sm:text-lg">
              {doc.subtitle}
            </p>
            {doc.last_updated && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-white/5 bg-white/5 px-3 py-1 text-xs text-gray-500">
                <Calendar className="size-3.5" /> Last updated: {doc.last_updated}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 sm:gap-3">
            {policyTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeKey === tab.key;
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Policy Content Sections */}
          {loading ? (
            <div className="space-y-3 py-20 text-center text-gray-500">
              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-sm">Loading legal document...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {doc.sections && doc.sections.length > 0 ? (
                doc.sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="space-y-3 rounded-2xl border border-white/10 bg-[#12141c]/80 p-6 backdrop-blur-sm transition-colors hover:border-violet-500/30 sm:p-8"
                  >
                    <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                      <span className="size-2 rounded-full bg-violet-500" />
                      {section.heading}
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300 sm:text-base">
                      {section.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
                  <AlertCircle className="mx-auto mb-2 size-8 text-violet-400" />
                  No policy sections configured yet.
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="border-t border-white/10 pt-6 text-center text-xs text-gray-500">
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
