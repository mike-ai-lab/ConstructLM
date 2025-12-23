import React, { useState, useEffect } from 'react';
import {
  Bell,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Tag,
  Repeat,
  Clock,
  X,
} from 'lucide-react';
import { Reminder } from '../types';

interface RemindersProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'timestamp' | 'status'>) => void;
  onDeleteReminder: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<Reminder>) => void;
  onShowToast: (message: string, reminderId: string) => void;
}

interface FormData {
  title: string;
  notes: string;
  tags: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
}

type FilterType = 'all' | 'pending' | 'triggered';
type CalendarViewType = 'time' | 'day' | 'month' | 'year';

const Reminders: React.FC<RemindersProps> = ({
  reminders,
  onAddReminder,
  onDeleteReminder,
  onUpdateReminder,
  onShowToast,
}) => {
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    notes: '',
    tags: '',
    repeat: 'none',
  });

  // Date/Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarViewType>('time');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // UI state
  const [filter, setFilter] = useState<FilterType>('all');
  const [snoozeOpen, setSnoozeOpen] = useState<string | null>(null);

  // Check for triggered reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      reminders.forEach((reminder) => {
        if (
          reminder.status === 'pending' &&
          reminder.reminderTime <= now
        ) {
          onUpdateReminder(reminder.id, { status: 'triggered' });
          onShowToast(reminder.title, reminder.id);
          playNotificationSound();
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [reminders, onUpdateReminder, onShowToast]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0vBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2CBhku+zooVARC0yl4fG5ZRwFNo3V7859LwUofsz'
      );
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // Form handlers
  const handleAddReminder = () => {
    if (!formData.title.trim() || !selectedDate) return;

    const reminderTime = selectedDate.getTime();
    if (reminderTime <= Date.now()) {
      alert('Please select a future date and time');
      return;
    }

    const reminder: any = {
      title: formData.title.trim(),
      reminderTime,
    };

    if (formData.notes.trim()) {
      reminder.notes = formData.notes.trim();
    }

    if (formData.tags.trim()) {
      reminder.tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    if (formData.repeat !== 'none') {
      reminder.repeat = formData.repeat;
    }

    onAddReminder(reminder);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      notes: '',
      tags: '',
      repeat: 'none',
    });
    setSelectedDate(new Date());
    setShowAddForm(false);
    setShowCalendar(false);
    setCalendarView('time');
  };

  const handleSnooze = (id: string, minutes: number) => {
    const newTime = Date.now() + minutes * 60 * 1000;
    onUpdateReminder(id, { reminderTime: newTime, status: 'pending' });
    setSnoozeOpen(null);
  };

  // Filtering and sorting
  const filteredReminders = reminders
    .filter((r) => filter === 'all' || r.status === filter)
    .sort((a, b) => a.reminderTime - b.reminderTime);

  // Display helpers
  const getTimeDisplay = (reminderTime: number, status: string): string => {
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

  const getStatusColor = (reminderTime: number, status: string): string => {
    if (status === 'triggered') {
      return 'border-[#f07a76] bg-[#f07a76]/10 dark:bg-[#f07a76]/10';
    }
    if (status === 'dismissed') {
      return 'border-gray-300 dark:border-gray-700 opacity-50';
    }

    const diff = reminderTime - Date.now();
    if (diff < 3600000) {
      return 'border-[#25b5cd] bg-[#9ce8d6]/20 dark:bg-[#5bd8bb]/10';
    }

    return 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]';
  };

  const getStatusBadgeColor = (
    reminderTime: number,
    status: string
  ): string => {
    if (status === 'triggered') {
      return 'bg-[#f07a76]/20 dark:bg-[#f07a76]/10 text-[#f07a76] font-semibold';
    }

    const timeDisplay = getTimeDisplay(reminderTime, status);
    if (timeDisplay === 'Overdue') {
      return 'bg-[#f07a76]/20 dark:bg-[#f07a76]/10 text-[#f07a76]';
    }

    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-3">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">
            Reminders
          </h2>
          <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">
            ({filteredReminders.length})
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
          >
            <Plus size={12} /> New
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1">
          {(['all', 'pending', 'triggered'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.06)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mt-3 bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md rounded-lg p-3 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] space-y-2">
            {/* Title input */}
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Reminder title..."
              className="w-full px-2 py-1 text-sm bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
            />

            {/* Date/Time and Repeat row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 flex items-center gap-1 transition-colors"
                >
                  <Calendar size={12} />
                  {selectedDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>

                {/* Calendar dropdown */}
                {showCalendar && (
                  <CalendarDropdown
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    calendarView={calendarView}
                    setCalendarView={setCalendarView}
                    viewYear={viewYear}
                    setViewYear={setViewYear}
                    viewMonth={viewMonth}
                    setViewMonth={setViewMonth}
                    getDaysInMonth={getDaysInMonth}
                    getFirstDayOfMonth={getFirstDayOfMonth}
                  />
                )}
              </div>

              <select
                value={formData.repeat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    repeat: e.target.value as any,
                  })
                }
                className="flex-1 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
              >
                <option value="none">No Repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Tags input */}
            <input
              type="text"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="Tags (comma separated)"
              className="w-full px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
            />

            {/* Notes textarea */}
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notes..."
              rows={2}
              className="w-full px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500 resize-none"
            />

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={resetForm}
                className="px-3 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded hover:bg-[rgba(0,0,0,0.06)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReminder}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add Reminder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reminders list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bell
              size={32}
              className="text-[#666666] dark:text-[#a0a0a0] mb-2 opacity-50"
            />
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">
              No reminders
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                getStatusColor={getStatusColor}
                getTimeDisplay={getTimeDisplay}
                getStatusBadgeColor={getStatusBadgeColor}
                snoozeOpen={snoozeOpen}
                setSnoozeOpen={setSnoozeOpen}
                onSnooze={handleSnooze}
                onDelete={onDeleteReminder}
                onUpdateReminder={onUpdateReminder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Calendar dropdown component
interface CalendarDropdownProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  calendarView: CalendarViewType;
  setCalendarView: (view: CalendarViewType) => void;
  viewYear: number;
  setViewYear: (year: number) => void;
  viewMonth: number;
  setViewMonth: (month: number) => void;
  getDaysInMonth: (year: number, month: number) => number;
  getFirstDayOfMonth: (year: number, month: number) => number;
}

const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  selectedDate,
  setSelectedDate,
  calendarView,
  setCalendarView,
  viewYear,
  setViewYear,
  viewMonth,
  setViewMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
}) => {
  return (
    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] z-50 p-3 w-64">
      {calendarView === 'time' && (
        <TimeView selectedDate={selectedDate} setSelectedDate={setSelectedDate} setCalendarView={setCalendarView} />
      )}

      {calendarView === 'day' && (
        <DayView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setCalendarView={setCalendarView}
          viewYear={viewYear}
          viewMonth={viewMonth}
          setViewMonth={setViewMonth}
          getDaysInMonth={getDaysInMonth}
          getFirstDayOfMonth={getFirstDayOfMonth}
        />
      )}

      {calendarView === 'month' && (
        <MonthView
          viewYear={viewYear}
          setViewYear={setViewYear}
          viewMonth={viewMonth}
          setViewMonth={setViewMonth}
          setCalendarView={setCalendarView}
        />
      )}

      {calendarView === 'year' && (
        <YearView
          viewYear={viewYear}
          setViewYear={setViewYear}
          setCalendarView={setCalendarView}
        />
      )}
    </div>
  );
};

// Time view component
interface TimeViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setCalendarView: (view: CalendarViewType) => void;
}

const TimeView: React.FC<TimeViewProps> = ({
  selectedDate,
  setSelectedDate,
  setCalendarView,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCalendarView('day')}
          className="text-xs text-blue-600 hover:underline"
        >
          Change Date
        </button>
        <span className="text-xs font-semibold">
          {selectedDate.toLocaleDateString()}
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-[#666666] dark:text-[#a0a0a0]">
            Hour
          </label>
          <input
            type="number"
            min="0"
            max="23"
            value={selectedDate.getHours()}
            onChange={(e) => {
              const newDate = new Date(selectedDate);
              newDate.setHours(parseInt(e.target.value));
              setSelectedDate(newDate);
            }}
            className="w-full px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1">
          <label className="text-xs text-[#666666] dark:text-[#a0a0a0]">
            Minute
          </label>
          <input
            type="number"
            min="0"
            max="59"
            value={selectedDate.getMinutes()}
            onChange={(e) => {
              const newDate = new Date(selectedDate);
              newDate.setMinutes(parseInt(e.target.value));
              setSelectedDate(newDate);
            }}
            className="w-full px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

// Day view component
interface DayViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setCalendarView: (view: CalendarViewType) => void;
  viewYear: number;
  viewMonth: number;
  setViewMonth: (month: number) => void;
  getDaysInMonth: (year: number, month: number) => number;
  getFirstDayOfMonth: (year: number, month: number) => number;
}

const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  setSelectedDate,
  setCalendarView,
  viewYear,
  viewMonth,
  setViewMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCalendarView('time')}
          className="text-xs text-blue-600 hover:underline"
        >
          ← Time
        </button>
        <button
          onClick={() => setCalendarView('month')}
          className="text-xs font-semibold hover:text-blue-600"
        >
          {new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </button>
        <div className="flex gap-1">
          <button
            onClick={() =>
              setViewMonth(viewMonth === 0 ? 11 : viewMonth - 1)
            }
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() =>
              setViewMonth(viewMonth === 11 ? 0 : viewMonth + 1)
            }
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div
            key={d}
            className="text-center text-[#666666] dark:text-[#a0a0a0] font-semibold py-1"
          >
            {d}
          </div>
        ))}

        {Array.from({
          length: getFirstDayOfMonth(viewYear, viewMonth),
        }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({
          length: getDaysInMonth(viewYear, viewMonth),
        }).map((_, i) => {
          const day = i + 1;
          const isSelected =
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === viewMonth &&
            selectedDate.getFullYear() === viewYear;

          return (
            <button
              key={day}
              onClick={() => {
                const newDate = new Date(
                  viewYear,
                  viewMonth,
                  day,
                  selectedDate.getHours(),
                  selectedDate.getMinutes()
                );
                setSelectedDate(newDate);
                setCalendarView('time');
              }}
              className={`p-1 rounded text-center transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Month view component
interface MonthViewProps {
  viewYear: number;
  setViewYear: (year: number) => void;
  viewMonth: number;
  setViewMonth: (month: number) => void;
  setCalendarView: (view: CalendarViewType) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  viewYear,
  setViewYear,
  viewMonth,
  setViewMonth,
  setCalendarView,
}) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCalendarView('day')}
          className="text-xs text-blue-600 hover:underline"
        >
          ← Days
        </button>
        <button
          onClick={() => setCalendarView('year')}
          className="text-xs font-semibold hover:text-blue-600"
        >
          {viewYear}
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => setViewYear(viewYear - 1)}
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setViewYear(viewYear + 1)}
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {months.map((m, i) => (
          <button
            key={m}
            onClick={() => {
              setViewMonth(i);
              setCalendarView('day');
            }}
            className={`p-2 rounded transition-colors ${
              viewMonth === i
                ? 'bg-blue-600 text-white'
                : 'hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
};

// Year view component
interface YearViewProps {
  viewYear: number;
  setViewYear: (year: number) => void;
  setCalendarView: (view: CalendarViewType) => void;
}

const YearView: React.FC<YearViewProps> = ({
  viewYear,
  setViewYear,
  setCalendarView,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCalendarView('month')}
          className="text-xs text-blue-600 hover:underline"
        >
          ← Months
        </button>
        <span className="text-xs font-semibold">
          {viewYear - 4} - {viewYear + 7}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewYear(viewYear - 12)}
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setViewYear(viewYear + 12)}
            className="p-1 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {Array.from({ length: 12 }).map((_, i) => {
          const year = viewYear - 4 + i;
          return (
            <button
              key={year}
              onClick={() => {
                setViewYear(year);
                setCalendarView('month');
              }}
              className={`p-2 rounded transition-colors ${
                viewYear === year
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Reminder item component
interface ReminderItemProps {
  reminder: Reminder;
  getStatusColor: (reminderTime: number, status: string) => string;
  getTimeDisplay: (reminderTime: number, status: string) => string;
  getStatusBadgeColor: (reminderTime: number, status: string) => string;
  snoozeOpen: string | null;
  setSnoozeOpen: (id: string | null) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDelete: (id: string) => void;
  onUpdateReminder: (id: string, updates: Partial<Reminder>) => void;
}

const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  getStatusColor,
  getTimeDisplay,
  getStatusBadgeColor,
  snoozeOpen,
  setSnoozeOpen,
  onSnooze,
  onDelete,
  onUpdateReminder,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col gap-2 px-3 py-2 rounded border transition-all group bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md ${getStatusColor(
        reminder.reminderTime,
        reminder.status
      )} ${reminder.status === 'triggered' ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-start gap-2">
        <Bell
          size={16}
          className={`mt-0.5 flex-shrink-0 ${
            reminder.status === 'triggered'
              ? 'text-[#f07a76]'
              : 'text-blue-600'
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-[#1a1a1a] dark:text-white">
              {reminder.title}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadgeColor(
                reminder.reminderTime,
                reminder.status
              )}`}
            >
              {getTimeDisplay(reminder.reminderTime, reminder.status)}
            </span>
          </div>

          {(reminder as any).notes && (
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-1">
              {(reminder as any).notes}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {(reminder as any).repeat && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                <Repeat size={10} /> {(reminder as any).repeat}
              </span>
            )}
            {(reminder as any).tags?.map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center gap-1"
              >
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {reminder.status === 'triggered' && (
            <>
              <div className="relative">
                <button
                  onClick={() =>
                    setSnoozeOpen(
                      snoozeOpen === reminder.id ? null : reminder.id
                    )
                  }
                  className="px-2 py-0.5 text-xs bg-[#25b5cd] text-white rounded hover:bg-[#1a9aaa] font-semibold transition-colors"
                >
                  Snooze
                </button>

                {snoozeOpen === reminder.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#222222] rounded shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] z-10 min-w-max">
                    {[5, 15, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => onSnooze(reminder.id, mins)}
                        className="block w-full px-3 py-1 text-xs text-left hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#2a2a2a] whitespace-nowrap transition-colors first:rounded-t last:rounded-b"
                      >
                        {mins < 60 ? `${mins} min` : '1 hour'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() =>
                  onUpdateReminder(reminder.id, { status: 'dismissed' })
                }
                className="px-2 py-0.5 text-xs bg-[#16b47e] text-white rounded hover:bg-[#0f9a6a] transition-colors"
              >
                Done
              </button>
            </>
          )}

          <button
            onClick={() => onDelete(reminder.id)}
            className={`p-1 rounded text-[#f07a76] transition-all ${
              isHovered || reminder.status === 'triggered'
                ? 'opacity-100'
                : 'opacity-0'
            } hover:bg-[#f07a76]/10 dark:hover:bg-[#f07a76]/10`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reminders;
