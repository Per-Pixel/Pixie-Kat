import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Minus, RefreshCw, ArrowUpRight, ArrowDownLeft, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface TxRow {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference?: string | null;
  created_at: string;
}

const txTypeConfig: Record<string, { label: string; color: string }> = {
  credit:           { label: 'Credit',           color: 'text-green-600' },
  debit:            { label: 'Debit',             color: 'text-red-500' },
  purchase:         { label: 'Purchase',          color: 'text-red-500' },
  refund:           { label: 'Refund',            color: 'text-blue-500' },
  referral_bonus:   { label: 'Referral Bonus',    color: 'text-purple-500' },
  reward_redemption:{ label: 'Reward Redemption', color: 'text-orange-500' },
};

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function WalletTab({ data, refetch }: Props) {
  const { profile } = data;
  const { user: adminUser } = useAuth();

  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [txLoading, setTxLoading]       = useState(true);

  const [showAdjust, setShowAdjust]     = useState(false);
  const [adjustType, setAdjustType]     = useState<'credit' | 'debit' | 'refund'>('credit');
  const [amount, setAmount]             = useState('');
  const [reference, setReference]       = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const fetchTx = async () => {
    setTxLoading(true);
    const { data: rows } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, balance_after, reference, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions((rows as TxRow[]) ?? []);
    setTxLoading(false);
  };

  useEffect(() => { fetchTx(); }, [profile.id]);

  const submitAdjust = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error('Enter a valid positive amount'); return; }
    if (!reference.trim())            { toast.error('Reference is required'); return; }

    setSubmitting(true);
    try {
      const adjustedAmount = adjustType === 'debit' ? -Math.abs(parsed) : Math.abs(parsed);
      const { error } = await supabase.rpc('adjust_wallet_balance', {
        p_user_id: profile.id,
        p_amount: adjustedAmount,
        p_type: adjustType,
        p_reference: reference.trim(),
        p_actor_id: adminUser?.id ?? null,
      });

      if (error) throw error;

      toast.success('Wallet adjusted successfully');
      setAmount('');
      setReference('');
      setShowAdjust(false);
      await fetchTx();
      refetch();
    } catch (err: any) {
      const msg = err.message || 'Wallet adjustment failed';
      if (msg.includes('Insufficient wallet balance')) {
        toast.error(`Insufficient balance. ${msg}`);
      } else if (msg.includes('Could not find the function') || msg.includes('adjust_wallet_balance')) {
        toast.error('Wallet adjustment is not set up yet. Run supabase/migrations/002_functions_triggers.sql in Supabase.');
      } else if (msg.includes('Permission denied')) {
        toast.error('Only active admin or support accounts can adjust wallets.');
      } else {
        toast.error(msg);
      }
    }
    setSubmitting(false);
  };

  const totalCredited = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebited  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 sm:col-span-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Wallet className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500">Current Balance</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            PKS {Number(profile.wallet_balance).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Total Credited</p>
          </div>
          <p className="text-xl font-bold text-green-600 mt-2">
            PKS {totalCredited.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <p className="text-xs text-gray-500">Total Debited</p>
          </div>
          <p className="text-xl font-bold text-red-500 mt-2">
            PKS {totalDebited.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Adjust panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Manual Adjustment</h3>
          <button
            onClick={() => setShowAdjust(s => !s)}
            className="btn btn-outline btn-sm"
          >
            {showAdjust ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showAdjust ? 'Cancel' : 'Adjust'}
          </button>
        </div>

        <AnimatePresence>
          {showAdjust && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="flex gap-2">
                  {(['credit', 'debit', 'refund'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setAdjustType(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                        adjustType === t
                          ? t === 'credit'
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : t === 'debit'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {t === 'credit'
                        ? <Plus className="w-3.5 h-3.5 inline mr-1" />
                        : t === 'debit'
                        ? <Minus className="w-3.5 h-3.5 inline mr-1" />
                        : <RefreshCw className="w-3.5 h-3.5 inline mr-1" />}
                      {t}
                    </button>
                  ))}
                </div>

                {adjustType === 'debit' && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <p className="text-xs text-orange-700">
                      Debit will fail if the balance would go negative.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1.5">
                      Amount (PKS) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="input"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1.5">
                      Reference / Note <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="input"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. Promo credit, order refund..."
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={submitAdjust}
                    disabled={submitting}
                    className="btn btn-primary btn-md"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Apply {adjustType.charAt(0).toUpperCase() + adjustType.slice(1)}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Transaction History</h3>
          {txLoading
            ? <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            : <span className="text-xs text-gray-400">{transactions.length} entries</span>
          }
        </div>

        {txLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => {
                  const cfg = txTypeConfig[tx.type] ?? { label: tx.type, color: 'text-gray-500' };
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <span className={`font-medium text-xs ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className={`px-6 py-3 font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}PKS {Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        PKS {Number(tx.balance_after).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-gray-500 max-w-xs truncate">
                        {tx.reference ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-400 whitespace-nowrap">
                        {formatTs(tx.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
