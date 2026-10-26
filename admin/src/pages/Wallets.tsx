import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAdminCurrency } from '../lib/currency';
import { AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { DURATION, EASE_OUT, fadeUp, pop, springSnappy, staggerDelay } from '../lib/motion';

type WalletRole = 'user' | 'reseller';
type RoleFilter = 'all' | WalletRole;
type SortOption = 'balance_desc' | 'balance_asc' | 'name_asc' | 'updated_desc';

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

const BALANCES_PAGE_SIZE = 20;
const TX_PAGE_SIZE = 15;

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

function useCountUp(target: number, duration = 550) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    if (reduceMotion) {
      prevRef.current = target;
      setDisplay(target);
      return;
    }
    const from = prevRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion]);
  return display;
}

function AnimatedMoney({ value, format }: { value: number; format: (v: number) => string }) {
  const current = useCountUp(value);
  return <span className="tabular-nums">{format(current)}</span>;
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
  const { formatMoney } = useAdminCurrency();
  const [wallets, setWallets] = useState<WalletProfile[]>([]);
  const [txProfiles, setTxProfiles] = useState<WalletProfile[]>([]);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Balances filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nonZeroOnly, setNonZeroOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('balance_desc');
  const [walletPage, setWalletPage] = useState(1);

  // Ledger filters
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txPeriod, setTxPeriod] = useState<AdminPeriod>('all');
  const [txPage, setTxPage] = useState(1);

  const reduceMotion = useReducedMotion();
  const rowsIntroduced = useRef(false);

  useEffect(() => {
    if (!loading && wallets.length > 0) rowsIntroduced.current = true;
  }, [loading, wallets.length]);

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
        .limit(500),
    ]);

    if (profilesRes.error) {
      setError(profilesRes.error.message || 'Failed to load wallets');
      setWallets([]);
      setTxProfiles([]);
      setTransactions([]);
    } else {
      const txRows = (txRes.data as WalletTx[]) ?? [];
      const txUserIds = [...new Set(txRows.map((tx) => tx.user_id))];
      const { data: txProfileRows } = txUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, name, email, role, status, wallet_balance, updated_at')
            .in('id', txUserIds)
        : { data: [] };
      setWallets((profilesRes.data as WalletProfile[]) ?? []);
      setTxProfiles((txProfileRows as WalletProfile[]) ?? []);
      setTransactions(txRows);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWallets();

    const profilesChannel = supabase
      .channel('admin-wallet-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchWallets();
      })
      .subscribe();

    const txChannel = supabase
      .channel('admin-wallet-transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, () => {
        fetchWallets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(txChannel);
    };
  }, []);

  const profileById = useMemo(() => {
    const map = new Map(wallets.map((profile) => [profile.id, profile]));
    for (const profile of txProfiles) map.set(profile.id, profile);
    return map;
  }, [wallets, txProfiles]);

  const filteredWallets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wallets
      .filter((wallet) => {
        if (roleFilter !== 'all' && wallet.role !== roleFilter) return false;
        if (statusFilter !== 'all' && wallet.status !== statusFilter) return false;
        if (nonZeroOnly && Number(wallet.wallet_balance ?? 0) <= 0) return false;
        if (q && !wallet.name.toLowerCase().includes(q) && !wallet.email.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'balance_desc') return Number(b.wallet_balance ?? 0) - Number(a.wallet_balance ?? 0);
        if (sortOption === 'balance_asc') return Number(a.wallet_balance ?? 0) - Number(b.wallet_balance ?? 0);
        if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
        return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime();
      });
  }, [wallets, roleFilter, statusFilter, nonZeroOnly, search, sortOption]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (!matchesAdminPeriod(tx.created_at, txPeriod)) return false;
      if (!q) return true;
      const profile = profileById.get(tx.user_id);
      return [profile?.name ?? '', profile?.email ?? '', tx.reference ?? '', tx.type, tx.user_id]
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [transactions, txTypeFilter, txPeriod, txSearch, profileById]);

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

  const walletTotalPages = Math.max(1, Math.ceil(filteredWallets.length / BALANCES_PAGE_SIZE));
  const safeWalletPage = Math.min(walletPage, walletTotalPages);
  const pagedWallets = filteredWallets.slice(
    (safeWalletPage - 1) * BALANCES_PAGE_SIZE,
    safeWalletPage * BALANCES_PAGE_SIZE
  );

  const txTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_PAGE_SIZE));
  const safeTxPage = Math.min(txPage, txTotalPages);
  const pagedTransactions = filteredTransactions.slice(
    (safeTxPage - 1) * TX_PAGE_SIZE,
    safeTxPage * TX_PAGE_SIZE
  );

  const handleExportBalances = () => {
    exportToCsv(
      'wallet-balances',
      ['User ID', 'Name', 'Email', 'Role', 'Status', 'Balance', 'Updated At'],
      filteredWallets.map((w) => [
        w.id,
        w.name,
        w.email,
        w.role,
        w.status,
        Number(w.wallet_balance ?? 0).toFixed(2),
        w.updated_at ?? '',
      ])
    );
  };

  const handleExportLedger = () => {
    exportToCsv(
      `wallet-ledger-${txPeriod}`,
      ['Tx ID', 'Date', 'User', 'Email', 'Type', 'Amount', 'Balance After', 'Reference'],
      filteredTransactions.map((tx) => {
        const prof = profileById.get(tx.user_id);
        return [
          tx.id,
          tx.created_at,
          prof?.name ?? tx.user_id,
          prof?.email ?? '',
          tx.type,
          Number(tx.amount ?? 0).toFixed(2),
          Number(tx.balance_after ?? 0).toFixed(2),
          tx.reference ?? '',
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center">
          <Wallet className="mr-3 h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-600">Live balances and full transaction ledger for users and resellers</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportBalances} disabled={!filteredWallets.length} className="btn btn-outline btn-sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export Balances
          </button>
          <button onClick={handleExportLedger} disabled={!filteredTransactions.length} className="btn btn-outline btn-sm">
            <Download className="mr-1.5 h-4 w-4" />
            Export Ledger
          </button>
          <button onClick={fetchWallets} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total Balance', value: totals.all, sub: `${wallets.length} wallets` },
          { label: 'User Wallets', value: totals.users, sub: `${totals.userCount} users` },
          { label: 'Reseller Wallets', value: totals.resellers, sub: `${totals.resellerCount} resellers` },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + staggerDelay(i, 0.05, 0.12), duration: DURATION.base, ease: EASE_OUT }}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              <AnimatedMoney value={card.value} format={formatMoney} />
            </p>
            <p className="mt-1 text-sm text-gray-500 tabular-nums">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setWalletPage(1); }}
                placeholder="Search balances by name or email..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {(['all', 'user', 'reseller'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => { setRoleFilter(filter); setWalletPage(1); }}
                className={`relative rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  roleFilter === filter
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {roleFilter === filter && (
                  <motion.span
                    layoutId="wallet-role-thumb"
                    transition={springSnappy}
                    className="absolute inset-0 rounded-md bg-white shadow-sm"
                  />
                )}
                <span className="relative">{filter === 'all' ? 'All' : `${filter}s`}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setWalletPage(1); }}
            className="input sm:w-44 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <select
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value as SortOption); setWalletPage(1); }}
            className="input sm:w-52 text-sm"
          >
            <option value="balance_desc">Balance: High → Low</option>
            <option value="balance_asc">Balance: Low → High</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="updated_desc">Recently Updated</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={nonZeroOnly}
              onChange={(e) => { setNonZeroOnly(e.target.checked); setWalletPage(1); }}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Non-zero balances only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1, duration: DURATION.base, ease: EASE_OUT }}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Wallet Balances</h3>
            <span className="text-sm text-gray-500 tabular-nums">{filteredWallets.length} matching</span>
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
            <>
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
                    {pagedWallets.map((wallet, i) => (
                      <motion.tr
                        key={wallet.id}
                        initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: staggerDelay(i, 0.028, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                        className="hover:bg-gray-50"
                      >
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
                          <motion.span
                            key={wallet.role}
                            variants={pop}
                            initial="initial"
                            animate="animate"
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadge[wallet.role]}`}
                          >
                            {wallet.role}
                          </motion.span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <motion.span
                            key={wallet.status}
                            variants={pop}
                            initial="initial"
                            animate="animate"
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[wallet.status] ?? statusBadge.inactive}`}
                          >
                            {wallet.status}
                          </motion.span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900 tabular-nums">
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
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {walletTotalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                  <span className="tabular-nums">
                    Page {safeWalletPage} / {walletTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                      disabled={safeWalletPage === 1}
                      className="p-1.5 rounded border bg-white disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletPage((p) => Math.min(walletTotalPages, p + 1))}
                      disabled={safeWalletPage === walletTotalPages}
                      className="p-1.5 rounded border bg-white disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.16, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col"
        >
          <div className="border-b border-gray-200 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Wallet Activity Ledger</h3>
                <p className="text-xs text-gray-500 tabular-nums">{filteredTransactions.length} transactions</p>
              </div>
              <Users className="h-5 w-5 text-gray-400" />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => { setTxSearch(e.target.value); setTxPage(1); }}
                placeholder="Search user or reference..."
                className="input pl-8 py-1.5 text-xs w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={txTypeFilter}
                onChange={(e) => { setTxTypeFilter(e.target.value); setTxPage(1); }}
                className="input py-1.5 text-xs"
              >
                <option value="all">All Types</option>
                {Object.entries(txLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={txPeriod}
                onChange={(e) => { setTxPeriod(e.target.value as AdminPeriod); setTxPage(1); }}
                className="input py-1.5 text-xs"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No wallet transactions match your filters.</div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 flex-1">
                {pagedTransactions.map((tx, i) => {
                  const profile = profileById.get(tx.user_id);
                  const amount = Number(tx.amount ?? 0);
                  const positive = amount >= 0;

                  return (
                    <motion.button
                      key={tx.id}
                      type="button"
                      initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: staggerDelay(i, 0.03, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                      onClick={() => navigate(`/users/${tx.user_id}`)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                          positive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900" title={tx.user_id}>
                            {profile?.name ?? `Unknown account · ${tx.user_id.slice(0, 8)}`}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {txLabels[tx.type] ?? tx.type}
                            {tx.reference ? ` · ${tx.reference}` : ''}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`whitespace-nowrap text-sm font-semibold tabular-nums ${positive ? 'text-green-600' : 'text-red-600'}`}>
                          {positive ? '+' : '-'}{formatMoney(Math.abs(amount))}
                        </p>
                        <p className="whitespace-nowrap text-xs text-gray-400 tabular-nums">
                          Bal {formatMoney(tx.balance_after)}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {txTotalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                  <span className="tabular-nums">Page {safeTxPage} / {txTotalPages}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={safeTxPage === 1}
                      className="p-1.5 rounded border bg-white disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                      disabled={safeTxPage === txTotalPages}
                      className="p-1.5 rounded border bg-white disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Wallets;
