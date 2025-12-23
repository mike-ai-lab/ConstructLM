import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, AlertCircle } from 'lucide-react';
import { Todo } from '../types';

interface TodoListProps {
  todos: Todo[];
  onAddTodo: (todo: Omit<Todo, 'id' | 'timestamp'>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo }) => {
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority'>('created');

  const filteredTodos = todos
    .filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      }
      if (sortBy === 'priority') {
        const pMap = { high: 0, medium: 1, low: 2 };
        return (pMap[a.priority || 'low'] || 2) - (pMap[b.priority || 'low'] || 2);
      }
      return b.timestamp - a.timestamp;
    });

  const handleAdd = () => {
    if (!newTask.trim()) return;
    onAddTodo({ title: newTask.trim(), completed: false });
    setNewTask('');
  };

  const getPriorityColor = (priority?: string) => {
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-yellow-500';
    if (priority === 'low') return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getTimeRemaining = (dueDate?: number) => {
    if (!dueDate) return null;
    const diff = dueDate - Date.now();
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(diff / (1000 * 60))}m`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a]">
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Tasks</h2>
          <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">({filteredTodos.length})</span>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add task..."
            className="flex-1 px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-1">
            {['all', 'active', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-2 py-1 text-xs rounded ${filter === f ? 'bg-blue-600 text-white' : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0]'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border-none focus:outline-none"
          >
            <option value="created">Created</option>
            <option value="due">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <CheckSquare size={32} className="text-[#666666] dark:text-[#a0a0a0] mb-2 opacity-50" />
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">No tasks</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-2 px-2 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 transition-colors group"
              >
                <button onClick={() => onToggleTodo(todo.id)} className="flex-shrink-0">
                  {todo.completed ? (
                    <CheckSquare size={16} className="text-green-600" />
                  ) : (
                    <Square size={16} className="text-[#666666] dark:text-[#a0a0a0]" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-[#666666] dark:text-[#a0a0a0]' : 'text-[#1a1a1a] dark:text-white'}`}>
                  {todo.title}
                </span>
                {todo.priority && (
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} title={todo.priority} />
                )}
                {todo.dueDate && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    getTimeRemaining(todo.dueDate) === 'Overdue' 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {getTimeRemaining(todo.dueDate)}
                  </span>
                )}
                <button
                  onClick={() => onDeleteTodo(todo.id)}
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

export default TodoList;
