import React from 'react';
import { Search, X, Calendar, Tag, AlertCircle } from 'lucide-react';

interface TodoSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  quickFilter: string | null;
  onQuickFilterChange: (filter: string | null) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  availableTags: string[];
}

const TodoSearchFilter: React.FC<TodoSearchFilterProps> = ({
  searchQuery,
  onSearchChange,
  quickFilter,
  onQuickFilterChange,
  selectedTags,
  onTagToggle,
  availableTags
}) => {
  const quickFilters = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'week', label: 'This Week', icon: Calendar },
    { id: 'overdue', label: 'Overdue', icon: AlertCircle },
  ];

  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-10 py-2.5 bg-[#f5f5f5] dark:bg-[#252525] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-lg text-sm focus:outline-none focus:border-[#4485d1]"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {quickFilters.map(filter => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={() => onQuickFilterChange(quickFilter === filter.id ? null : filter.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                quickFilter === filter.id
                  ? 'bg-[#4485d1] text-white'
                  : 'bg-[#f5f5f5] dark:bg-[#252525] text-[#666666] dark:text-[#a0a0a0] hover:bg-[#e8e9ea] dark:hover:bg-[#2a2a2a]'
              }`}
            >
              <Icon size={12} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={12} className="text-[#a0a0a0]" />
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-[#4485d1] text-white'
                  : 'bg-[#f5f5f5] dark:bg-[#252525] text-[#666666] dark:text-[#a0a0a0] hover:bg-[#e8e9ea] dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodoSearchFilter;
