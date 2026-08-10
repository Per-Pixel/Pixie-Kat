import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, DollarSign, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { useAdminReport } from '../../hooks/useAdminReport';

const money = (value: number, currency = 'PKS') => `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const RevenueProducts: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();

  const rows = useMemo(() => {
    if (!data) return [];
    return data.products.map((product) => {
      const orders = data.orders.filter((order) =>
        order.status === 'completed' &&
        (order.product_id === product.id || (!order.product_id && order.product_name === product.name)),
      );
      return {
        ...product,
        units: orders.reduce((sum, order) => sum + Number(order.quantity || 1), 0),
        revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        orders: orders.length,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading product revenue...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Product Revenue</h1><p className="text-sm text-gray-500 mt-1">Live completed-order performance by catalog product</p></div>
        <button onClick={() => navigate('/products')} className="btn btn-primary btn-sm"><Package className="w-4 h-4 mr-2" />Manage Products</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Catalog Products', value: rows.length, icon: Package }, { label: 'Completed Revenue', value: money(totalRevenue), icon: DollarSign }, { label: 'Units Sold', value: totalUnits, icon: ShoppingCart }].map(({ label, value, icon: Icon }) => <div key={label} className="bg-white border rounded-xl p-5"><Icon className="w-5 h-5 text-primary-600 mb-3" /><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
      </div>
      <div className="bg-white border rounded-xl overflow-hidden">
        {rows.length === 0 ? <p className="p-12 text-center text-sm text-gray-400">No products found in Supabase.</p> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>{['Product', 'Game', 'Price', 'Orders', 'Units', 'Revenue', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-5 py-4 text-sm font-medium">{row.name}</td><td className="px-5 py-4 text-sm text-gray-500">{row.game?.name || 'Unknown'}</td><td className="px-5 py-4 text-sm">{money(Number(row.price), row.currency)}</td><td className="px-5 py-4 text-sm">{row.orders}</td><td className="px-5 py-4 text-sm">{row.units}</td><td className="px-5 py-4 text-sm font-semibold">{money(row.revenue, row.currency)}</td><td className="px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs capitalize ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</span></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
};

export default RevenueProducts;
