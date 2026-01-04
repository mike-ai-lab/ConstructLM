import React from 'react';
import { Todo } from '../../types';

interface TodoStatsProps {
  todos: Todo[];
  activeTodos: Todo[];
  archivedTodos: Todo[];
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  highlightFilter: string | null;
  onHighlightFilter: (filter: string | null) => void;
}

const TodoStats: React.FC<TodoStatsProps> = ({
  todos,
  activeTodos,
  archivedTodos,
  highPriority,
  mediumPriority,
  lowPriority,
  highlightFilter,
  onHighlightFilter
}) => {
  return (
    <div className="grid grid-cols-5 gap-4">
      <button onClick={() => onHighlightFilter(highlightFilter === 'active' ? null : 'active')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 text-left transition-all hover:scale-105 ${highlightFilter === 'active' ? 'ring-2 ring-[#4485d1]' : ''}`}>
        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Active</div>
        <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{activeTodos.length}</div>
        <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div className="h-full bg-[#4485d1]" style={{ width: `${todos.length ? (activeTodos.length / todos.length) * 100 : 0}%` }} />
        </div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'archived' ? null : 'archived')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 text-left transition-all hover:scale-105 ${highlightFilter === 'archived' ? 'ring-2 ring-[#a8d5e2]' : ''}`}>
        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Archived</div>
        <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{archivedTodos.length}</div>
        <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div className="h-full bg-[#a8d5e2]" style={{ width: `${todos.length ? (archivedTodos.length / todos.length) * 100 : 0}%` }} />
        </div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'high' ? null : 'high')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 text-left transition-all hover:scale-105 ${highlightFilter === 'high' ? 'ring-2 ring-red-500' : ''}`}>
        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">High Priority</div>
        <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{highPriority}</div>
        <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div className="h-full bg-[#666666]" style={{ width: `${activeTodos.length ? (highPriority / activeTodos.length) * 100 : 0}%` }} />
        </div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'medium' ? null : 'medium')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 text-left transition-all hover:scale-105 ${highlightFilter === 'medium' ? 'ring-2 ring-[#FBF719]' : ''}`}>
        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Medium Priority</div>
        <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{mediumPriority}</div>
        <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div className="h-full bg-[#999999]" style={{ width: `${activeTodos.length ? (mediumPriority / activeTodos.length) * 100 : 0}%` }} />
        </div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'low' ? null : 'low')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 text-left transition-all hover:scale-105 ${highlightFilter === 'low' ? 'ring-2 ring-green-500' : ''}`}>
        <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Low Priority</div>
        <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{lowPriority}</div>
        <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div className="h-full bg-[#cccccc]" style={{ width: `${activeTodos.length ? (lowPriority / activeTodos.length) * 100 : 0}%` }} />
        </div>
      </button>
    </div>
  );
};

export default TodoStats;
