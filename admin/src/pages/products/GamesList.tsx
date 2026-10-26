import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Gamepad2, Download, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { listGames, deleteGame, Game, GameStatus } from '../../services/catalogService';
import { exportToCsv } from '../../utils/dateRange';

interface GamesListProps {
  statusFilter?: GameStatus;
  title?: string;
}

type SortField = 'name' | 'provider' | 'status';

const statusBadge = (status: GameStatus) => {
  const map: Record<GameStatus, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    draft: 'bg-yellow-100 text-yellow-800',
  };
  return map[status];
};

const GamesList: React.FC<GamesListProps> = ({ statusFilter, title = 'All Games' }) => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [localStatus, setLocalStatus] = useState<GameStatus | 'all'>(statusFilter ?? 'all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGames({ status: statusFilter });
      setGames(data);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games
      .filter((g) => {
        if (localStatus !== 'all' && g.status !== localStatus) return false;
        if (providerFilter !== 'all' && g.provider !== providerFilter) return false;
        if (q && !`${g.name} ${g.slug} ${g.currency_label} ${g.subtitle ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const av = String(a[sortField] ?? '').toLowerCase();
        const bv = String(b[sortField] ?? '').toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [games, search, localStatus, providerFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = async (game: Game) => {
    if (!window.confirm(`Delete "${game.name}"? This removes its fields and packages.`)) return;
    try {
      const result = await deleteGame(game.id);
      if (result === 'archived') {
        setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, status: 'inactive' } : g)));
        toast(`"${game.name}" has orders — kept as Inactive`);
      } else {
        toast.success('Game deleted');
        setGames((prev) => prev.filter((g) => g.id !== game.id));
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete game');
    }
  };

  const handleExport = () => {
    exportToCsv(
      'games',
      ['ID', 'Name', 'Slug', 'Currency Label', 'Provider', 'Status', 'Featured', 'Created'],
      filteredGames.map((g) => [
        g.id,
        g.name,
        g.slug,
        g.currency_label,
        g.provider,
        g.status,
        g.is_featured ? 'Yes' : 'No',
        g.created_at ?? '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">Manage games and their dynamic top-up pages ({filteredGames.length} shown)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw className={clsx('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button onClick={handleExport} disabled={!filteredGames.length} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/products/games/new')}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Game
          </button>
        </div>
      </motion.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search games by name, slug, or currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'draft', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setLocalStatus(s)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                localStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {s}
            </button>
          ))}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="input sm:w-44 text-sm py-1.5"
          >
            <option value="all">All Providers</option>
            <option value="smile_one">Smile One</option>
            <option value="smilecoin">Smile Coin</option>
            <option value="yokcash">Yokcash</option>
            <option value="manual">Manual</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading games…</div>
        ) : filteredGames.length === 0 ? (
          <div className="p-12 text-center">
            <Gamepad2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No games match your filters.</p>
            <button
              onClick={() => navigate('/products/games/new')}
              className="btn btn-outline btn-sm mt-4"
            >
              Create your first game
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Game
                      {sortField === 'name' && (
                        <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th
                    onClick={() => handleSort('provider')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Provider
                      {sortField === 'provider' && (
                        <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortField === 'status' && (
                        <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGames.map((game) => (
                  <tr key={game.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {game.image_url ? (
                            <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
                          ) : (
                            <Gamepad2 className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{game.name}</div>
                          {game.subtitle && <div className="text-xs text-gray-500">{game.subtitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{game.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{game.currency_label}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{game.provider.replace('_', ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(game.status)}`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/products/games/${game.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesList;
