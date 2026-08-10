import { useState, useEffect } from 'react';
import { StickyNote, Plus, Flag, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface Note {
  id: string;
  content: string;
  priority: 'normal' | 'important' | 'flag';
  created_at: string;
  admin_id: string;
  admin?: { name: string; email: string };
}

const priorityConfig = {
  normal:    { label: 'Normal',    color: 'bg-gray-100 text-gray-600',    icon: StickyNote },
  important: { label: 'Important', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  flag:      { label: 'Flag',      color: 'bg-red-100 text-red-700',       icon: Flag },
};

function formatTs(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotesTab({ data }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'flag'>('normal');
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from('admin_user_notes')
      .select('id, content, priority, created_at, admin_id')
      .eq('user_id', data.profile.id)
      .order('created_at', { ascending: false });
    setNotes((rows as Note[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [data.profile.id]);

  const addNote = async () => {
    if (!content.trim() || content.trim().length < 10) {
      toast.error('Note must be at least 10 characters');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('admin_user_notes').insert({
      user_id: data.profile.id,
      admin_id: user?.id,
      content: content.trim(),
      priority,
    });
    if (error) {
      toast.error('Failed to save note');
    } else {
      toast.success('Note added');
      setContent('');
      setPriority('normal');
      await fetchNotes();
    }
    setSaving(false);
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from('admin_user_notes').delete().eq('id', noteId);
    if (error) toast.error('Failed to delete note');
    else { toast.success('Note deleted'); await fetchNotes(); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Note
        </h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Add an internal note about this user (min. 10 chars)..."
          className="input w-full resize-none"
          maxLength={1000}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {(['normal', 'important', 'flag'] as const).map((p) => {
              const cfg = priorityConfig[p];
              const Icon = cfg.icon;
              return (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    priority === p
                      ? `${cfg.color} border-current`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <button onClick={addNote} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Save Note
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Notes ({notes.length})</h3>
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
        {notes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No notes yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notes.map((note) => {
              const cfg = priorityConfig[note.priority] ?? priorityConfig.normal;
              const Icon = cfg.icon;
              return (
                <div key={note.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatTs(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
