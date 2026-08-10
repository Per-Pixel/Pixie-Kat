import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'pixie_admin_events';

interface AdminEvent {
  id: string;
  title: string;
  date: string;
  notes: string;
}

function loadEvents(): AdminEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AdminEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const persist = (next: AdminEvent[]) => {
    setEvents(next);
    saveEvents(next);
  };

  const addEvent = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Enter an event title');
      return;
    }
    if (!date) {
      toast.error('Pick a date');
      return;
    }
    const event: AdminEvent = {
      id: crypto.randomUUID(),
      title: trimmed,
      date,
      notes: notes.trim(),
    };
    persist([event, ...events].sort((a, b) => a.date.localeCompare(b.date)));
    setTitle('');
    setDate('');
    setNotes('');
    toast.success('Event added');
  };

  const removeEvent = (id: string) => {
    persist(events.filter((e) => e.id !== id));
    toast.success('Event removed');
  };

  const upcoming = events.filter((e) => e.date >= new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="text-sm text-gray-500">
              {upcoming.length} upcoming · {events.length} total · stored in browser localStorage
            </p>
          </div>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3"
      >
        <h2 className="text-sm font-semibold text-gray-900">Add Event</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label mb-1.5 block">Title</label>
            <input className="input" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label mb-1.5 block">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label mb-1.5 block">Notes</label>
          <textarea className="input min-h-[60px]" rows={2} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button type="button" onClick={addEvent} className="btn btn-primary btn-md">
          <Plus className="mr-1 h-4 w-4" />Add Event
        </button>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No events scheduled.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((event) => {
              const isPast = event.date < new Date().toISOString().slice(0, 10);
              return (
                <li key={event.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50">
                  <div className="shrink-0 w-14 text-center">
                    <p className="text-xs font-medium text-primary-600 uppercase">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {new Date(event.date + 'T12:00:00').getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                      {event.title}
                      {isPast && <span className="ml-2 text-xs font-normal text-gray-400">(past)</span>}
                    </p>
                    {event.notes && <p className="text-xs text-gray-500 mt-1">{event.notes}</p>}
                  </div>
                  <button type="button" onClick={() => removeEvent(event.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </div>
  );
};

export default EventsPage;
