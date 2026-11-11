import React from 'react';
import { Globe, MousePointerClick } from 'lucide-react';
import clsx from 'clsx';
import type { WebsiteVisitorStats } from '../../hooks/useWebsiteVisitors';

type Props = {
  periodLabel: string;
  visits: WebsiteVisitorStats | null;
  visitsNote: string | null;
  loading?: boolean;
  id?: string;
  compact?: boolean;
};

const WebsiteVisitorsPanel: React.FC<Props> = ({
  periodLabel,
  visits,
  visitsNote,
  loading,
  id = 'website-visitors',
  compact,
}) => (
  <section
    id={id}
    className={clsx(
      'rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm',
      compact && 'p-3'
    )}
  >
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <Globe className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold text-gray-900">Website visitors ({periodLabel})</h2>
        <p className="mt-0.5 text-xs text-gray-600">
          People who opened the shop — device and region. Same numbers on Dashboard and Analytics.
        </p>
      </div>
      <MousePointerClick className="hidden h-5 w-5 shrink-0 text-blue-400 sm:block" aria-hidden />
    </div>
    {loading ? (
      <p className="mt-3 text-sm text-gray-500">Loading visitor stats…</p>
    ) : visitsNote ? (
      <p className="mt-3 text-sm text-amber-800">{visitsNote}</p>
    ) : (
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-white/90 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">People</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">
            {visits ? visits.people.toLocaleString() : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white/90 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Devices</p>
          {visits && visits.devices.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {visits.devices.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{row.name}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{row.people.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              {visits && visits.people > 0 ? 'Unknown device' : 'No visits in this period yet.'}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-blue-100 bg-white/90 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Locations</p>
          {visits && visits.places.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {visits.places.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">{row.name}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{row.people.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              {visits && visits.people > 0 ? 'Unknown location' : 'No visits in this period yet.'}
            </p>
          )}
        </div>
      </div>
    )}
  </section>
);

export default WebsiteVisitorsPanel;
