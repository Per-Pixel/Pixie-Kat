import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type WalletRole = 'user' | 'reseller';
type RoleFilter = 'all' | WalletRole;

interface WalletProfile {
  id: string;
  name: string;
  email: string;
  role: WalletRole;
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  wallet_balance: number | string | null;
  updated_at?: string | null;
}

interface WalletTx {
  id: string;
  user_id: string;
  type: string;
  amount: number | string;
  balance_after: number | string;
  reference?: string | null;
  created_at: string;
}

function formatMoney(value: number | string | null | undefined) {
  return `PKS ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PK';
}

const roleBadge: Record<WalletRole, string> = {
  user: 'bg-gray-100 text-gray-700',
  reseller: 'bg-teal-100 text-teal-700',
};

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-orange-100 text-orange-700',
  banned: 'bg-red-100 text-red-700',
};

const txLabels: Record<string, string> = {
  credit: 'Credit',
  debit: 'Debit',
  purchase: 'Purchase',
  refund: 'Refund',
  referral_bonus: 'Referral Bonus',
  reward_redemption: 'Reward Redemption',
};

const Wallets: React.FC = () => {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState<WalletProfile[]>([]);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const fetchWallets = async () => {
    setLoading(true);
    setError('');

    const [profilesRes, txRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, role, status, wallet_balance, updated_at')
        .in('role', ['user', 'reseller'])
        .order('wallet_balance', { ascending: false }),
      supabase
        .from('wallet_transactions')
        .select('id, user_id, type, amount, balance_after, reference, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (profilesRes.error) {
      setError(profilesRes.error.message || 'Failed to load wallets');
      setWallets([]);
      setTransactions([]);
    } else {
      setWallets((profilesRes.data as WalletProfile[]) ?? []);
      setTransactions((txRes.data as WalletTx[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWallets();

    const profilesChannel = supabase
      .channel('admin-wallet-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchWallets();
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel('admin-wallet-transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions' },
        () => {
          fetchWallets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(txChannel);
    };
  }, []);

  const profileById = useMemo(() => {
    return new Map(wallets.map((profile) => [profile.id, profile]));
  }, [wallets]);

  const filteredWallets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wallets.filter((wallet) => {
      const matchesRole = roleFilter === 'all' || wallet.role === roleFilter;
      const matchesSearch =
        !q ||
        wallet.name.toLowerCase().includes(q) ||
        wallet.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [wallets, roleFilter, search]);

  const totals = useMemo(() => {
    const users = wallets.filter((wallet) => wallet.role === 'user');
    const resellers = wallets.filter((wallet) => wallet.role === 'reseller');
    const sum = (rows: WalletProfile[]) =>
      rows.reduce((total, wallet) => total + Number(wallet.wallet_balance ?? 0), 0);

    return {
      all: sum(wallets),
      users: sum(users),
      resellers: sum(resellers),
      userCount: users.length,
      resellerCount: resellers.length,
    };
  }, [wallets]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center">
          <Wallet className="mr-3 h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-600">Live balances for users and resellers</p>
          </div>
        </div>
        <button onClick={fetchWallets} disabled={loading} className="btn btn-outline btn-md">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Balance</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.all)}</p>
          <p className="mt-1 text-sm text-gray-500">{wallets.length} wallets</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">User Wallets</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.users)}</p>
          <p className="mt-1 text-sm text-gray-500">{totals.userCount} users</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reseller Wallets</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatMoney(totals.resellers)}</p>
          <p className="mt-1 text-sm text-gray-500">{totals.resellerCount} resellers</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {(['all', 'user', 'reseller'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRoleFilter(filter)}
                className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  roleFilter === filter
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {filter === 'all' ? 'All' : `${filter}s`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Wallet Balances</h3>
            <span className="text-sm text-gray-500">{filteredWallets.length} shown</span>
          </div>

          {error ? (
            <div className="p-8 text-center text-sm text-red-600">{error}</div>
          ) : loading ? (
            <div className="p-10 text-center text-gray-500">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading wallets...
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">No wallets match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Balance</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredWallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                            {initials(wallet.name)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{wallet.name}</div>
                            <div className="text-sm text-gray-500">{wallet.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[wallet.role]}`}>
                          {wallet.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[wallet.status] ?? statusBadge.inactive}`}>
                          {wallet.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {formatMoney(wallet.wallet_balance)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/users/${wallet.id}`)}
                          className="inline-flex items-center rounded-md px-2 py-1 text-primary-600 hover:bg-primary-50"
                          title="Open user wallet"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Wallet Activity</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No wallet transactions yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const profile = profileById.get(tx.user_id);
                const amount = Number(tx.amount ?? 0);
                const positive = amount >= 0;

                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => profile && navigate(`/users/${profile.id}`)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        positive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {positive ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {profile?.name ?? 'Unknown account'}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {txLabels[tx.type] ?? tx.type}
                          {tx.reference ? ` · ${tx.reference}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`whitespace-nowrap text-sm font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                        {positive ? '+' : '-'}{formatMoney(Math.abs(amount))}
                      </p>
                      <p className="whitespace-nowrap text-xs text-gray-400">
                        Bal {formatMoney(tx.balance_after)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Wallets;
