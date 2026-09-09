import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, ChevronRight, CircleDollarSign, DollarSign,
  Percent, RefreshCw, RotateCcw, Scale, UserCog,
} from 'lucide-react';
import clsx from 'clsx';
import { useAdminReport } from '../../hooks/useAdminReport';
import type { ReportOrder, ReportProduct } from '../../services/reportingService';

const money = (value: number, currency = 'PKS') => `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-700',
  on_hold: 'bg-orange-100 text-orange-800',
};

interface PlRow {
  id: string;
  date: string;
  customer: string;
  productName: string;
  status: string;
  currency: string;
  value: number;
  refund: number;
  cost: number | null;
  pl: number | null;
  internal: boolean;
}

function unitCost(order: ReportOrder, productsById: Map<string, ReportProduct>, productsByName: Map<string, ReportProduct>): number | null {
  if (order.unit_cost_price != null && Number(order.unit_cost_price) > 0) return Number(order.unit_cost_price);
  const product = (order.product_id ? productsById.get(order.product_id) : undefined)
    ?? productsByName.get(order.product_name);
  if (product?.cost_price != null && Number(product.cost_price) > 0) return Number(product.cost_price);
  return null;
}

const ProfitLoss: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]['value']>('all');
  const [includeInternal, setIncludeInternal] = useState(true);

  const { rows, summary, internalCount } = useMemo(() => {
    const emptySummary = {
      grossRevenue: 0, refundLosses: 0, cogs: 0, grossProfit: 0, netProfit: 0,
      margin: 0, unknownCostOrders: 0, completedOrders: 0, refundedOrders: 0, currency: 'PKS',
    };
    if (!data) return { rows: [] as PlRow[], summary: emptySummary, internalCount: 0 };

    const adminIds = new Set(data.profiles.filter((p) => p.role === 'admin').map((p) => p.id));
    const productsById = new Map(data.products.map((p) => [p.id, p]));
    const productsByName = new Map(data.products.map((p) => [p.name, p]));

    const built: PlRow[] = [];
    let grossRevenue = 0, refundLosses = 0, cogs = 0, unknownCostOrders = 0;
    let completedOrders = 0, refundedOrders = 0, internalTotal = 0;
    let currency = 'PKS';

    data.orders.forEach((order) => {
      const isInternal = adminIds.has(order.user_id);
      if (isInternal) internalTotal += 1;
      if (!includeInternal && isInternal) return;

      const total = Number(order.total_amount || 0);
      const qty = Number(order.quantity || 1);
      const perUnit = unitCost(order, productsById, productsByName);
      const cost = perUnit != null ? perUnit * qty : null;
      const isCompleted = order.status === 'completed';
      const isRefunded = order.status === 'refunded';
      if (isCompleted && order.currency) currency = order.currency;

      let refund = 0, pl: number | null = null;
      if (isCompleted) {
        completedOrders += 1;
        grossRevenue += total;
        if (cost != null) {
          cogs += cost;
          pl = total - cost;
        } else {
          unknownCostOrders += 1;
        }
      } else if (isRefunded) {
        refundedOrders += 1;
        refund = total;
        refundLosses += total;
        pl = -total;
      }

      built.push({
        id: order.id,
        date: order.created_at,
        customer: order.profiles?.name || order.profiles?.email || 'Unknown',
        productName: order.product_name,
        status: order.status,
        currency: order.currency || currency,
        value: total,
        refund,
        cost,
        pl,
        internal: isInternal,
      });
    });

    const grossProfit = grossRevenue - cogs;
    const netProfit = grossProfit - refundLosses;
    const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      rows: built,
      summary: { grossRevenue, refundLosses, cogs, grossProfit, netProfit, margin, unknownCostOrders, completedOrders, refundedOrders, currency },
      internalCount: internalTotal,
    };
  }, [data, includeInternal]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-gray-400">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
        Loading profit & loss...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        {error}
        <button onClick={() => void refresh()} className="btn btn-outline btn-sm ml-4">Retry</button>
      </div>
    );
  }

  const { currency } = summary;
  const cards = [
    { title: 'Gross Revenue', value: money(summary.grossRevenue, currency), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Refund Losses', value: `-${money(summary.refundLosses, currency)}`, icon: RotateCcw, tone: 'bg-red-50 text-red-600' },
    { title: 'Cost of Goods', value: money(summary.cogs, currency), icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
    { title: 'Gross Profit', value: money(summary.grossProfit, currency), icon: ArrowUpRight, tone: 'bg-emerald-50 text-emerald-600' },
    { title: 'Net Profit', value: money(summary.netProfit, currency), icon: summary.netProfit >= 0 ? ArrowUpRight : ArrowDownRight, tone: summary.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600' },
    { title: 'Profit Margin', value: `${summary.margin.toFixed(1)}%`, icon: Percent, tone: 'bg-indigo-50 text-indigo-600' },
  ];

  const visible = statusTab === 'all' ? rows : rows.filter((row) => row.status === statusTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Scale className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Profit &amp; Loss</h1>
            <p className="text-sm text-gray-500 mt-1">Per-order profitability from completed sales and refund losses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIncludeInternal((v) => !v)}
            className={clsx('btn btn-sm flex items-center gap-2', includeInternal ? 'btn-primary' : 'btn-outline')}
            title="Orders placed by admin accounts, hidden from the sales analytics"
          >
            <UserCog className="h-4 w-4" />
            {includeInternal ? `Internal shown (${internalCount})` : 'Internal hidden'}
          </button>
          <button onClick={() => void refresh()} className="btn btn-outline btn-sm">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, tone }) => (
          <div key={title} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{title}</p>
              <p className="truncate text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {summary.unknownCostOrders > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            Cost of goods and profit exclude {summary.unknownCostOrders.toLocaleString()} completed {summary.unknownCostOrders === 1 ? 'order' : 'orders'} with no cost snapshot on the order or product.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Order Profit &amp; Loss</h2>
            <p className="mt-0.5 text-xs text-gray-400">Click a row to open the full order details.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusTab(value)}
                className={clsx('rounded-lg px-3 py-1.5 text-sm', statusTab === value ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">No orders found for this status.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Customer', 'Product', 'Status', 'Value', 'Refund', 'Cost', 'P/L', ''].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/revenue/orders?order=${row.id}`)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-[12rem]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{row.customer}</span>
                        {row.internal && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800" title="Placed by an admin account">
                            Staff
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{row.productName}</td>
                    <td className="px-5 py-3">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', statusStyles[row.status] ?? 'bg-gray-100 text-gray-700')}>
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{money(row.value, row.currency)}</td>
                    <td className="px-5 py-3 text-sm text-red-600 whitespace-nowrap">{row.refund > 0 ? `-${money(row.refund, row.currency)}` : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{row.cost != null ? money(row.cost, row.currency) : '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold whitespace-nowrap">
                      {row.pl == null ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className={row.pl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {row.pl >= 0 ? '+' : '-'}{money(Math.abs(row.pl), row.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-300">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
          Completed orders: {summary.completedOrders.toLocaleString()} · Refunded orders: {summary.refundedOrders.toLocaleString()} · Only completed and refunded orders affect the P&amp;L statement; other statuses are listed for reference and marked with —. Refunds are counted at full order value.
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;
