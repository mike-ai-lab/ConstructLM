import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Clock } from 'lucide-react';
import { Reminder } from '../types';

interface RemindersProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<Reminder>) => void;
  onShowToast: (message: string, reminderId: string) => void;
}

const Reminders: React.FC<RemindersProps> = ({ reminders, onAddReminder, onDeleteReminder, onUpdateReminder, onShowToast }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'triggered'>('all');
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      reminders.forEach(r => {
        if (r.status === 'pending' && r.reminderTime <= now) {
          onUpdateReminder(r.id, { status: 'triggered' });
          onShowToast(r.title, r.id);
          playNotificationSound();
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [reminders, onUpdateReminder, onShowToast]);

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0vBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2CBhku+zooVARC0yl4fG5ZRwFNo3V7859LwUofsz');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newTime) return;
    const reminderTime = new Date(newTime).getTime();
    if (reminderTime <= Date.now()) return;
    onAddReminder({ title: newTitle.trim(), reminderTime });
    setNewTitle('');
    setNewTime('');
  };

  const handleSnooze = (id: string, minutes: number) => {
    const newTime = Date.now() + minutes * 60 * 1000;
    onUpdateReminder(id, { reminderTime: newTime, status: 'pending' });
    setSnoozeOpen(null);
  };

  const filteredReminders = reminders
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => a.reminderTime - b.reminderTime);

  const getTimeDisplay = (reminderTime: number, status: string) => {
    if (status === 'dismissed') return 'Dismissed';
    const diff = reminderTime - Date.now();
    if (diff < 0 && status === 'triggered') return 'Now!';
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    const mins = Math.floor(diff / (1000 * 60));
    return `in ${mins}m`;
  };

  const getStatusColor = (reminderTime: number, status: string) => {
    if (status === 'triggered') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (status === 'dismissed') return 'border-gray-300 dark:border-gray-700 opacity-50';
    const diff = reminderTime - Date.now();
    if (diff < 3600000) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a]">
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Reminders</h2>
          <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">({filteredReminders.length})</span>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Reminder title..."
            className="flex-1 px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
          />
          <input
            type="datetime-local"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAdd}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add
          </button>
          <div className="flex gap-1">
            {['all', 'pending', 'triggered'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-2 py-1 text-xs rounded ${filter === f ? 'bg-blue-600 text-white' : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0]'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bell size={32} className="text-[#666666] dark:text-[#a0a0a0] mb-2 opacity-50" />
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">No reminders</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredReminders.map(reminder => (
              <div
                key={reminder.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors group ${getStatusColor(reminder.reminderTime, reminder.status)} ${reminder.status === 'triggered' ? 'animate-pulse' : ''}`}
              >
                <Bell size={14} className={reminder.status === 'triggered' ? 'text-red-600' : 'text-blue-600'} />
                <span className="flex-1 text-sm text-[#1a1a1a] dark:text-white truncate">
                  {reminder.title}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  reminder.status === 'triggered'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold'
                    : getTimeDisplay(reminder.reminderTime, reminder.status) === 'Overdue'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {getTimeDisplay(reminder.reminderTime, reminder.status)}
                </span>
                {reminder.status === 'triggered' && (
                  <div className="relative">
                    <button
                      onClick={() => setSnoozeOpen(snoozeOpen === reminder.id ? null : reminder.id)}
                      className="px-2 py-0.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Snooze ▾
                    </button>
                    {snoozeOpen === reminder.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#222222] rounded shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] z-10">
                        {[5, 15, 60].map(mins => (
                          <button
                            key={mins}
                            onClick={() => handleSnooze(reminder.id, mins)}
                            className="block w-full px-3 py-1 text-xs text-left hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] whitespace-nowrap"
                          >
                            {mins < 60 ? `${mins} min` : '1 hour'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {reminder.status === 'triggered' && (
                  <button
                    onClick={() => onUpdateReminder(reminder.id, { status: 'dismissed' })}
                    className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Done
                  </button>
                )}
                <button
                  onClick={() => onDeleteReminder(reminder.id)}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;
