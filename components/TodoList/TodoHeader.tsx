import React from 'react';
import { Plus, Download, List, LayoutGrid, ArrowUpDown, Archive } from 'lucide-react';
import { exportTodosToPDF } from '../../services/pdfExport';
import { Todo } from '../../types';

interface TodoHeaderProps {
  todos: Todo[];
  viewMode: 'list' | 'board';
  filter: 'all' | 'active' | 'archived';
  sortBy: string;
  showAddForm: boolean;
  activeTodos: Todo[];
  onViewModeChange: (mode: 'list' | 'board') => void;
  onFilterChange: (filter: 'all' | 'active' | 'archived') => void;
  onSortChange: (sort: string) => void;
  onToggleAddForm: () => void;
  onArchiveCompleted: () => void;
}

const TodoHeader: React.FC<TodoHeaderProps> = ({
  todos,
  viewMode,
  filter,
  sortBy,
  showAddForm,
  activeTodos,
  onViewModeChange,
  onFilterChange,
  onSortChange,
  onToggleAddForm,
  onArchiveCompleted
}) => {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white">Tasks</h1>
          <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">{todos.filter(t => !t.archived).length} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onViewModeChange('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
            <List size={18} />
          </button>
          <button onClick={() => onViewModeChange('board')} className={`p-2 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
            <LayoutGrid size={18} />
          </button>
          <div className="w-px h-6 bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.08)] mx-2" />
          {(['all', 'active', 'archived'] as const).map(f => (
            <button key={f} onClick={() => onFilterChange(f)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === f ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {viewMode === 'list' && (
            <>
              <div className="ml-2 flex items-center gap-2">
                <ArrowUpDown size={14} className="text-[#666666] dark:text-[#a0a0a0]" />
                <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="px-3 py-2 text-sm bg-white dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                  <option value="created">Last Created</option>
                  <option value="modified">Last Modified</option>
                  <option value="priority-high">Priority: High to Low</option>
                  <option value="priority-low">Priority: Low to High</option>
                  <option value="duedate">Due Date</option>
                </select>
              </div>
            </>
          )}
          <div className="w-px h-6 bg-[rgba(0,0,0,0.08)] dark:bg-[rgba(255,255,255,0.08)] mx-2" />
          {filter !== 'archived' && activeTodos.some(t => t.completed) && (
            <button onClick={onArchiveCompleted} className="px-3 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors flex items-center gap-2">
              <Archive size={14} />
              Archive Completed
            </button>
          )}
          <button onClick={() => exportTodosToPDF(todos)} className="px-3 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button onClick={onToggleAddForm} className="px-4 py-2 text-sm bg-[#4485d1] hover:bg-[#3674c1] text-white rounded-lg transition-colors flex items-center gap-2">
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>
    </>
  );
};

export default TodoHeader;
