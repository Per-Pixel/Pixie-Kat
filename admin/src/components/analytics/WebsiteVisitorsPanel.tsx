import React from 'react';
import { Globe } from 'lucide-react';
import type { WebsiteVisitorStats } from '../../hooks/useWebsiteVisitors';

type Props = {
  periodLabel: string;
  visits: WebsiteVisitorStats | null;
  visitsNote: string | null;
  loading?: boolean;
  id?: string;
};

const WebsiteVisitorsPanel: React.FC<Props> = ({
  periodLabel,
  visits,
  visitsNote,
  loading,
  id = 'website-visitors',
}) => (
  <section id={id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Globe className="h-4 w-4 text-primary-600" />
        Website visitors ({periodLabel})
      </h2>
      <p className="text-xs text-gray-400">
        Real shop traffic — not hardcoded; low counts are normal while tracking is new
      </p>
    </div>

    {loading ? (
      <p className="mt-4 text-sm text-gray-400">Loading visitor stats…</p>
    ) : visitsNote ? (
      <p className="mt-4 text-sm text-amber-700">{visitsNote}</p>
    ) : (
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <p className="text-xs text-gray-400">People</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            {visits ? visits.people.toLocaleString() : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">One per browser; repeat visits count once</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Devices</p>
          <div className="mt-2 divide-y divide-gray-50">
            {visits && visits.devices.length > 0 ? (
              visits.devices.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="truncate text-sm text-gray-700">{row.name}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {row.people.toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-gray-400">
                {visits && visits.people > 0 ? 'Unknown device' : 'No visits in this period yet.'}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400">Locations</p>
          <div className="mt-2 divide-y divide-gray-50">
            {visits && visits.places.length > 0 ? (
              visits.places.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                  <p className="truncate text-sm text-gray-700">{row.name}</p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {row.people.toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-gray-400">
                {visits && visits.people > 0 ? 'Unknown location' : 'No visits in this period yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    )}
  </section>
);

export default WebsiteVisitorsPanel;
