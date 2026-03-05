import React from 'react';
import { TrendingUp, Clock, CheckCircle2, Target, Calendar, Zap } from 'lucide-react';
import { Todo } from '../../types';

interface TodoAnalyticsProps {
  todos: Todo[];
}

const TodoAnalytics: React.FC<TodoAnalyticsProps> = ({ todos }) => {
  const now = Date.now();
  const last7Days = now - 7 * 24 * 60 * 60 * 1000;
  const last30Days = now - 30 * 24 * 60 * 60 * 1000;

  const completedTodos = todos.filter(t => t.completed);
  const completedLast7Days = completedTodos.filter(t => t.completedAt && t.completedAt >= last7Days);
  const completedLast30Days = completedTodos.filter(t => t.completedAt && t.completedAt >= last30Days);

  const totalEstimated = todos.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalActual = todos.reduce((sum, t) => sum + (t.actualTime || 0), 0);
  const accuracy = totalEstimated > 0 ? ((totalActual / totalEstimated) * 100).toFixed(0) : 0;

  const completionRate = todos.length > 0 ? ((completedTodos.length / todos.length) * 100).toFixed(0) : 0;
  const avgCompletionTime = completedTodos.length > 0 
    ? Math.round(completedTodos.reduce((sum, t) => sum + ((t.completedAt || 0) - t.timestamp), 0) / completedTodos.length / (1000 * 60 * 60))
    : 0;

  const onTimeCompleted = completedTodos.filter(t => !t.dueDate || (t.completedAt && t.completedAt <= t.dueDate)).length;
  const onTimeRate = completedTodos.length > 0 ? ((onTimeCompleted / completedTodos.length) * 100).toFixed(0) : 0;

  const stats = [
    { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
    { label: 'Weekly Velocity', value: completedLast7Days.length, icon: Zap, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Monthly Total', value: completedLast30Days.length, icon: Calendar, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'On-Time Rate', value: `${onTimeRate}%`, icon: Target, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Avg Completion', value: `${avgCompletionTime}h`, icon: Clock, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Time Accuracy', value: `${accuracy}%`, icon: TrendingUp, color: 'text-pink-600 dark:text-pink-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="bg-[#f5f5f5] dark:bg-[#252525] rounded-lg p-3 border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={stat.color} />
              <span className="text-[10px] font-semibold text-[#999999] dark:text-[#666666] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-xl font-bold text-[#1a1a1a] dark:text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export default TodoAnalytics;
