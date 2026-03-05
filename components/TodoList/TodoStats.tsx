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
    <div className="flex items-center gap-2">
      <button onClick={() => onHighlightFilter(highlightFilter === 'active' ? null : 'active')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-lg px-3 py-2 text-left transition-all hover:scale-105 ${highlightFilter === 'active' ? 'ring-2 ring-[#4485d1]' : ''}`}>
        <div className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium uppercase tracking-wider">Active</div>
        <div className="text-lg font-bold text-[#1a1a1a] dark:text-white">{activeTodos.length}</div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'archived' ? null : 'archived')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-lg px-3 py-2 text-left transition-all hover:scale-105 ${highlightFilter === 'archived' ? 'ring-2 ring-[#a8d5e2]' : ''}`}>
        <div className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium uppercase tracking-wider">Archived</div>
        <div className="text-lg font-bold text-[#1a1a1a] dark:text-white">{archivedTodos.length}</div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'high' ? null : 'high')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-lg px-3 py-2 text-left transition-all hover:scale-105 ${highlightFilter === 'high' ? 'ring-2 ring-red-500' : ''}`}>
        <div className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium uppercase tracking-wider">High</div>
        <div className="text-lg font-bold text-[#1a1a1a] dark:text-white">{highPriority}</div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'medium' ? null : 'medium')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-lg px-3 py-2 text-left transition-all hover:scale-105 ${highlightFilter === 'medium' ? 'ring-2 ring-[#FBF719]' : ''}`}>
        <div className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium uppercase tracking-wider">Medium</div>
        <div className="text-lg font-bold text-[#1a1a1a] dark:text-white">{mediumPriority}</div>
      </button>
      <button onClick={() => onHighlightFilter(highlightFilter === 'low' ? null : 'low')} className={`bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-lg px-3 py-2 text-left transition-all hover:scale-105 ${highlightFilter === 'low' ? 'ring-2 ring-green-500' : ''}`}>
        <div className="text-[10px] text-[#666666] dark:text-[#a0a0a0] font-medium uppercase tracking-wider">Low</div>
        <div className="text-lg font-bold text-[#1a1a1a] dark:text-white">{lowPriority}</div>
      </button>
    </div>
  );
};

export default TodoStats;
