import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Gamepad2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listGames, deleteGame, Game, GameStatus } from '../../services/catalogService';

interface GamesListProps {
  statusFilter?: GameStatus;
  title?: string;
}

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGames({ status: statusFilter, search: search || undefined });
      setGames(data);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (game: Game) => {
    if (!window.confirm(`Delete "${game.name}"? This removes its fields and packages.`)) return;
    try {
      await deleteGame(game.id);
      toast.success('Game deleted');
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete game');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">Manage games and their dynamic top-up pages</p>
        </div>
        <button
          onClick={() => navigate('/products/games/new')}
          className="mt-4 sm:mt-0 btn btn-primary btn-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Game
        </button>
      </motion.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading games…</div>
        ) : games.length === 0 ? (
          <div className="p-12 text-center">
            <Gamepad2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No games found.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {games.map((game) => (
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
