import React from 'react';
import { Repeat } from 'lucide-react';
import { TodoGroup } from '../../types';

interface TodoAddFormProps {
  formData: any;
  groups: TodoGroup[];
  onFormChange: (data: any) => void;
  onCancel: () => void;
  onAdd: () => void;
}

const TodoAddForm: React.FC<TodoAddFormProps> = ({ formData, groups, onFormChange, onCancel, onAdd }) => {
  return (
    <div className="mt-4 bg-[#e8e9ea] dark:bg-[#252525] rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={formData.title} onChange={(e) => onFormChange({...formData, title: e.target.value})} placeholder="Task title..." className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
        <select value={formData.priority} onChange={(e) => onFormChange({...formData, priority: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <input type="text" value={formData.category} onChange={(e) => onFormChange({...formData, category: e.target.value})} placeholder="Category" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
        <input type="datetime-local" value={formData.dueDate} onChange={(e) => onFormChange({...formData, dueDate: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
        <input type="number" value={formData.estimatedTime} onChange={(e) => onFormChange({...formData, estimatedTime: e.target.value})} placeholder="Est. mins" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
        <select value={formData.groupId} onChange={(e) => onFormChange({...formData, groupId: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
          <option value="">Select Group</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input type="text" value={formData.tags} onChange={(e) => onFormChange({...formData, tags: e.target.value})} placeholder="Tags (comma separated)" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
        <textarea value={formData.notes} onChange={(e) => onFormChange({...formData, notes: e.target.value})} placeholder="Notes..." rows={2} className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none resize-none" />
        <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
          <input type="checkbox" id="recurring" checked={formData.recurring} onChange={(e) => onFormChange({...formData, recurring: e.target.checked})} className="w-4 h-4" />
          <label htmlFor="recurring" className="text-sm text-[#1a1a1a] dark:text-white flex items-center gap-2"><Repeat size={14} /> Recurring Task</label>
          {formData.recurring && (
            <>
              <select value={formData.recurringFrequency} onChange={(e) => onFormChange({...formData, recurringFrequency: e.target.value})} className="px-3 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded border-0 focus:outline-none">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
              <input type="number" min="1" value={formData.recurringInterval} onChange={(e) => onFormChange({...formData, recurringInterval: e.target.value})} placeholder="Interval" className="w-20 px-3 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded border-0 focus:outline-none" />
              <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">day(s)</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">Cancel</button>
        <button onClick={onAdd} className="px-4 py-2 text-sm bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1] transition-colors">Add Task</button>
      </div>
    </div>
  );
};

export default TodoAddForm;
