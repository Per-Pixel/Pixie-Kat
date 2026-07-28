import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STORAGE_KEY = 'pixie_admin_tasks';

interface Task {
  id: string;
  title: string;
  status: 'open' | 'done';
  assignee: string;
  createdAt: string;
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const persist = (next: Task[]) => {
    setTasks(next);
    saveTasks(next);
  };

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Enter a task title');
      return;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      status: 'open',
      assignee: assignee.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([task, ...tasks]);
    setTitle('');
    setAssignee('');
    toast.success('Task added');
  };

  const toggleStatus = (id: string) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t)));

  const removeTask = (id: string) => {
    persist(tasks.filter((t) => t.id !== id));
    toast.success('Task removed');
  };

  const openCount = tasks.filter((t) => t.status === 'open').length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500">
              {openCount} open · {tasks.length - openCount} done · stored in browser localStorage
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
        <h2 className="text-sm font-semibold text-gray-900">Add Task</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input flex-1"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <input
            className="input sm:w-48"
            placeholder="Assignee (optional)"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          />
          <button type="button" onClick={addTask} className="btn btn-primary btn-md shrink-0">
            <Plus className="mr-1 h-4 w-4" />Add
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => toggleStatus(task.id)}
                  className="shrink-0 text-gray-400 hover:text-primary-600"
                  title={task.status === 'open' ? 'Mark done' : 'Reopen'}
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.assignee ? `${task.assignee} · ` : ''}
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button type="button" onClick={() => removeTask(task.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
};

export default TasksPage;
