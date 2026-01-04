import React from 'react';
import { Plus, Folder, X } from 'lucide-react';
import { Todo, TodoGroup } from '../../types';

interface TodoGroupsSidebarProps {
  todos: Todo[];
  groups: TodoGroup[];
  selectedGroup: string | null;
  showGroupForm: boolean;
  groupFormData: { name: string; color: string };
  onSelectGroup: (id: string | null) => void;
  onToggleGroupForm: () => void;
  onGroupFormChange: (data: { name: string; color: string }) => void;
  onAddGroup: () => void;
  onDeleteGroup: (id: string) => void;
}

const TodoGroupsSidebar: React.FC<TodoGroupsSidebarProps> = ({
  todos,
  groups,
  selectedGroup,
  showGroupForm,
  groupFormData,
  onSelectGroup,
  onToggleGroupForm,
  onGroupFormChange,
  onAddGroup,
  onDeleteGroup
}) => {
  return (
    <div className="w-64 flex-shrink-0 border-r border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] flex flex-col">
      <div className="p-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
        <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Groups</h2>
        <button onClick={onToggleGroupForm} className="w-full px-3 py-2 text-sm bg-[#4485d1] hover:bg-[#3674c1] text-white rounded-lg transition-colors flex items-center justify-center gap-2">
          <Plus size={14} />
          New Group
        </button>
        {showGroupForm && (
          <div className="mt-3 space-y-2">
            <input type="text" value={groupFormData.name} onChange={(e) => onGroupFormChange({...groupFormData, name: e.target.value})} placeholder="Group name..." className="w-full px-3 py-2 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
            <input type="color" value={groupFormData.color} onChange={(e) => onGroupFormChange({...groupFormData, color: e.target.value})} className="w-full h-8 rounded-lg cursor-pointer" />
            <div className="flex gap-2">
              <button onClick={onToggleGroupForm} className="flex-1 px-3 py-1.5 text-xs text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg">Cancel</button>
              <button onClick={onAddGroup} className="flex-1 px-3 py-1.5 text-xs bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1]">Add</button>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <button onClick={() => onSelectGroup(null)} className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between mb-1 ${!selectedGroup ? 'bg-[#4485d1] text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
          <span className="flex items-center gap-2"><Folder size={16} /> All Tasks</span>
          <span className="text-xs">{todos.filter(t => !t.archived).length}</span>
        </button>
        {groups.map(group => (
          <div key={group.id} className="relative group/item">
            <button onClick={() => onSelectGroup(group.id)} className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between mb-1 ${selectedGroup === group.id ? 'bg-[#4485d1] text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </span>
              <span className="text-xs">{todos.filter(t => t.groupId === group.id && !t.archived).length}</span>
            </button>
            <button onClick={() => onDeleteGroup(group.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/item:opacity-100 hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)] rounded" title="Delete group">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoGroupsSidebar;
