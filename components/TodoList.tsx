import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Plus, Calendar, Tag, Clock, X, ChevronDown, ChevronRight, Copy, Download, Circle, CheckCircle2, MoreHorizontal, Archive, Folder, Edit2, ArrowUpDown } from 'lucide-react';
import { Todo, TodoGroup } from '../types';
import { exportTodosToPDF } from '../services/pdfExport';

interface TodoListProps {
  todos: Todo[];
  groups: TodoGroup[];
  onAddTodo: (todo: Omit<Todo, 'id' | 'timestamp'>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onDeleteSubtask: (todoId: string, subtaskId: string) => void;
  onAddGroup: (group: Omit<TodoGroup, 'id' | 'timestamp'>) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (id: string, updates: Partial<TodoGroup>) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, groups, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, onDeleteSubtask, onAddGroup, onDeleteGroup, onUpdateGroup }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'priority-high' | 'priority-low' | 'duedate'>('created');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '' });
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '' });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '', color: '#4485d1' });
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  const getCountdown = (dueDate: number) => {
    const now = Date.now();
    const diff = dueDate - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) {
      const absDays = Math.abs(days);
      return { text: `${absDays}d overdue`, isOverdue: true };
    }
    if (days > 0) return { text: `${days}d ${hours}h`, isOverdue: false };
    if (hours > 0) return { text: `${hours}h ${minutes}m`, isOverdue: false };
    return { text: `${minutes}m`, isOverdue: false };
  };

  const activeTodos = todos.filter(t => !t.completed && !t.archived);
  const archivedTodos = todos.filter(t => t.archived);
  const highPriority = activeTodos.filter(t => t.priority === 'high').length;
  const mediumPriority = activeTodos.filter(t => t.priority === 'medium').length;
  const lowPriority = activeTodos.filter(t => !t.priority || t.priority === 'low').length;
  const overdue = activeTodos.filter(t => t.dueDate && t.dueDate < Date.now()).length;

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed && !t.archived;
    if (filter === 'archived') return t.archived;
    if (selectedGroup) return t.groupId === selectedGroup && !t.archived;
    return !t.archived;
  }).sort((a, b) => {
    if (sortBy === 'created') return b.timestamp - a.timestamp;
    if (sortBy === 'modified') {
      const aModified = (a as any).lastModified || a.timestamp;
      const bModified = (b as any).lastModified || b.timestamp;
      return bModified - aModified;
    }
    if (sortBy === 'priority-high') {
      const pMap = { high: 0, medium: 1, low: 2 };
      return (pMap[a.priority || 'low'] || 2) - (pMap[b.priority || 'low'] || 2);
    }
    if (sortBy === 'priority-low') {
      const pMap = { high: 2, medium: 1, low: 0 };
      return (pMap[a.priority || 'low'] || 0) - (pMap[b.priority || 'low'] || 0);
    }
    if (sortBy === 'duedate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    }
    return 0;
  });

  const handleEdit = (todo: Todo) => {
    setEditingTask(todo.id);
    setEditFormData({
      title: todo.title,
      priority: todo.priority || 'medium',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 16) : '',
      tags: todo.tags?.join(', ') || '',
      notes: todo.notes || '',
      category: todo.category || '',
      estimatedTime: todo.estimatedTime?.toString() || '',
      groupId: todo.groupId || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editFormData.title.trim() || !editingTask) return;
    const updates: any = { title: editFormData.title.trim(), priority: editFormData.priority };
    if (editFormData.dueDate) updates.dueDate = new Date(editFormData.dueDate).getTime();
    if (editFormData.tags) updates.tags = editFormData.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editFormData.notes) updates.notes = editFormData.notes;
    if (editFormData.category) updates.category = editFormData.category;
    if (editFormData.estimatedTime) updates.estimatedTime = parseInt(editFormData.estimatedTime);
    if (editFormData.groupId) updates.groupId = editFormData.groupId;
    onUpdateTodo(editingTask, updates);
    setEditingTask(null);
  };

  const handleAdd = () => {
    if (!formData.title.trim()) return;
    const todo: any = { title: formData.title.trim(), completed: false, priority: formData.priority, subtasks: [], progress: 0, archived: false, groupId: formData.groupId || selectedGroup || groups[0]?.id || 'default' };
    if (formData.dueDate) todo.dueDate = new Date(formData.dueDate).getTime();
    if (formData.tags) todo.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (formData.notes) todo.notes = formData.notes;
    if (formData.category) todo.category = formData.category;
    if (formData.estimatedTime) todo.estimatedTime = parseInt(formData.estimatedTime);
    onAddTodo(todo);
    setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '' });
    setShowAddForm(false);
  };

  const handleAddGroup = () => {
    if (!groupFormData.name.trim()) return;
    onAddGroup({ name: groupFormData.name.trim(), color: groupFormData.color });
    setGroupFormData({ name: '', color: '#4485d1' });
    setShowGroupForm(false);
  };

  const archiveCompleted = () => {
    todos.filter(t => t.completed && !t.archived).forEach(t => onUpdateTodo(t.id, { archived: true }));
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo && !todo.completed) {
      onUpdateTodo(id, { completed: true, archived: true });
    } else if (todo) {
      onUpdateTodo(id, { completed: false, archived: false });
    }
  };

  const addSubtask = (todoId: string, title: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const subtasks = [...(todo.subtasks || []), { id: Date.now().toString(), title, completed: false }];
    onUpdateTodo(todoId, { subtasks, progress: calculateProgress(subtasks) });
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || !todo.subtasks) return;
    const subtasks = todo.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    onUpdateTodo(todoId, { subtasks, progress: calculateProgress(subtasks) });
  };

  const calculateProgress = (subtasks: any[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    return Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100);
  };

  const duplicateTodo = (todo: Todo) => {
    onAddTodo({ ...todo, id: undefined, timestamp: undefined, title: `${todo.title} (Copy)`, completed: false } as any);
  };

  return (
    <div className="flex h-full bg-white dark:bg-[#1a1a1a]">
      {/* Groups Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] flex flex-col">
        <div className="p-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">Groups</h2>
          <button onClick={() => setShowGroupForm(!showGroupForm)} className="w-full px-3 py-2 text-sm bg-[#4485d1] hover:bg-[#3674c1] text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <Plus size={14} />
            New Group
          </button>
          {showGroupForm && (
            <div className="mt-3 space-y-2">
              <input type="text" value={groupFormData.name} onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})} placeholder="Group name..." className="w-full px-3 py-2 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
              <input type="color" value={groupFormData.color} onChange={(e) => setGroupFormData({...groupFormData, color: e.target.value})} className="w-full h-8 rounded-lg cursor-pointer" />
              <div className="flex gap-2">
                <button onClick={() => setShowGroupForm(false)} className="flex-1 px-3 py-1.5 text-xs text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg">Cancel</button>
                <button onClick={handleAddGroup} className="flex-1 px-3 py-1.5 text-xs bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1]">Add</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button onClick={() => setSelectedGroup(null)} className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between mb-1 ${!selectedGroup ? 'bg-[#4485d1] text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
            <span className="flex items-center gap-2"><Folder size={16} /> All Tasks</span>
            <span className="text-xs">{todos.filter(t => !t.archived).length}</span>
          </button>
          {groups.map(group => (
            <div key={group.id} className="relative group/item">
              <button onClick={() => setSelectedGroup(group.id)} className={`w-full px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between mb-1 ${selectedGroup === group.id ? 'bg-[#4485d1] text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white">Tasks</h1>
            <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">{todos.filter(t => !t.archived).length} total</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportTodosToPDF(todos)} className="px-3 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors flex items-center gap-2">
              <Download size={16} />
              Export
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 text-sm bg-[#4485d1] hover:bg-[#3674c1] text-white rounded-lg transition-colors flex items-center gap-2">
              <Plus size={16} />
              New Task
            </button>
          </div>
        </div>

        {/* Stats Visualization */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4">
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Active</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{activeTodos.length}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#4485d1]" style={{ width: `${todos.length ? (activeTodos.length / todos.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4">
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Archived</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{archivedTodos.length}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#a8d5e2]" style={{ width: `${todos.length ? (archivedTodos.length / todos.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4">
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">High Priority</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{highPriority}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#666666]" style={{ width: `${activeTodos.length ? (highPriority / activeTodos.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4">
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Medium Priority</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{mediumPriority}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#999999]" style={{ width: `${activeTodos.length ? (mediumPriority / activeTodos.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4">
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Low Priority</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{lowPriority}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#cccccc]" style={{ width: `${activeTodos.length ? (lowPriority / activeTodos.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        {!showAddForm && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {['all', 'active', 'archived'].map(f => (
                <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === f ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <div className="ml-2 flex items-center gap-2">
                <ArrowUpDown size={14} className="text-[#666666] dark:text-[#a0a0a0]" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 text-sm bg-white dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                  <option value="created">Last Created</option>
                  <option value="modified">Last Modified</option>
                  <option value="priority-high">Priority: High to Low</option>
                  <option value="priority-low">Priority: Low to High</option>
                  <option value="duedate">Due Date</option>
                </select>
              </div>
            </div>
            {filter !== 'archived' && activeTodos.some(t => t.completed) && (
              <button onClick={archiveCompleted} className="px-3 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors flex items-center gap-2">
                <Archive size={14} />
                Archive Completed
              </button>
            )}
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mt-4 bg-[#e8e9ea] dark:bg-[#252525] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Task title..." className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Category" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <input type="number" value={formData.estimatedTime} onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})} placeholder="Est. mins" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <select value={formData.groupId} onChange={(e) => setFormData({...formData, groupId: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                <option value="">Select Group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="Tags (comma separated)" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Notes..." rows={2} className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddForm(false); setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '' }); }} className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 text-sm bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1] transition-colors">Add Task</button>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <CheckSquare size={64} className="text-[#e0e0e0] dark:text-[#3a3a3a] mb-4" />
            <p className="text-sm text-[#666666] dark:text-[#a0a0a0]">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map(todo => {
              const isExpanded = expandedTasks.has(todo.id);
              const progress = todo.progress || 0;
              const isOverdue = todo.dueDate && todo.dueDate < Date.now() && !todo.completed;
              
              return (
                <div key={todo.id} className="group bg-[#f5f5f5] dark:bg-[#252525] rounded-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,0,0,0.12)] dark:hover:border-[rgba(255,255,255,0.12)] transition-all">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <button onClick={() => handleToggleTodo(todo.id)} className="flex-shrink-0 mt-0.5">
                        {todo.completed ? <CheckCircle2 size={22} className="text-[#a8d5e2]" /> : <Circle size={22} className="text-[#cccccc] dark:text-[#666666]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className={`text-base font-medium ${todo.completed ? 'line-through text-[#999999] dark:text-[#666666]' : 'text-[#1a1a1a] dark:text-white'}`}>{todo.title}</h3>
                          <div className="flex items-center gap-3">
                            {todo.dueDate && (() => {
                              const countdown = getCountdown(todo.dueDate);
                              return (
                                <div className={`flex flex-col items-end gap-1 px-3 py-2 rounded-lg ${countdown.isOverdue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${countdown.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    <Calendar size={12} />
                                    <span>{new Date(todo.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                  <div className={`flex items-center gap-1.5 text-xs font-bold ${countdown.isOverdue ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                    <Clock size={12} />
                                    <span>{countdown.text}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            {todo.estimatedTime && (
                              <div className="flex items-center gap-1.5 text-xs text-[#666666] dark:text-[#a0a0a0] px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                <Clock size={12} />
                                <span>Est: {todo.estimatedTime >= 60 ? `${Math.floor(todo.estimatedTime / 60)}h ${todo.estimatedTime % 60}m` : `${todo.estimatedTime}m`}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!todo.archived && (
                                <>
                                  <button onClick={() => handleEdit(todo)} className="p-2 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Edit">
                                    <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => duplicateTodo(todo)} className="p-2 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Duplicate">
                                    <Copy size={16} />
                                  </button>
                                </>
                              )}
                              <button onClick={() => onDeleteTodo(todo.id)} className="p-2 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {todo.priority && (
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              todo.priority === 'high' ? 'bg-[#f0f0f0] dark:bg-[#3a3a3a] text-[#1a1a1a] dark:text-white' :
                              todo.priority === 'medium' ? 'bg-[#f8f8f8] dark:bg-[#333333] text-[#666666] dark:text-[#a0a0a0]' :
                              'bg-[#fafafa] dark:bg-[#2a2a2a] text-[#999999] dark:text-[#666666]'
                            }`}>
                              {todo.priority}
                            </span>
                          )}
                          {todo.category && <span className="text-xs px-3 py-1 rounded-full bg-[#e9f7fa] dark:bg-[#1a4d5c] text-[#1a1a1a] dark:text-white font-medium">{todo.category}</span>}
                          {todo.tags?.map(tag => (
                            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-[#f8f8f8] dark:bg-[#333333] text-[#666666] dark:text-[#a0a0a0] flex items-center gap-1.5">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                        {todo.notes && <p className="text-sm text-[#666666] dark:text-[#a0a0a0] mb-3">{todo.notes}</p>}
                        {editingTask === todo.id && (
                          <div className="mb-3 bg-[#e8e9ea] dark:bg-[#1a1a1a] rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} placeholder="Task title..." className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
                              <select value={editFormData.priority} onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                              </select>
                              <input type="text" value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} placeholder="Category" className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                              <input type="datetime-local" value={editFormData.dueDate} onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                              <input type="number" value={editFormData.estimatedTime} onChange={(e) => setEditFormData({...editFormData, estimatedTime: e.target.value})} placeholder="Est. mins" className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                              <select value={editFormData.groupId} onChange={(e) => setEditFormData({...editFormData, groupId: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                                <option value="">Select Group</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                              <input type="text" value={editFormData.tags} onChange={(e) => setEditFormData({...editFormData, tags: e.target.value})} placeholder="Tags (comma separated)" className="px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                              <textarea value={editFormData.notes} onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})} placeholder="Notes..." rows={2} className="col-span-2 px-4 py-3 text-sm bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none resize-none" />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-white dark:hover:bg-[#2a2a2a] rounded-lg transition-colors">Cancel</button>
                              <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1] transition-colors">Save</button>
                            </div>
                          </div>
                        )}
                        {!todo.archived && (
                          <div className="mb-3">
                            <button onClick={() => setExpandedTasks(prev => { const next = new Set(prev); isExpanded ? next.delete(todo.id) : next.add(todo.id); return next; })} className="text-sm text-[#4485d1] hover:underline flex items-center gap-1.5">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {todo.subtasks && todo.subtasks.length > 0 ? `${todo.subtasks.filter(s => s.completed).length}/${todo.subtasks.length} subtasks` : 'Add subtasks'}
                            </button>
                          </div>
                        )}
                        {isExpanded && !todo.archived && (
                          <div className="space-y-2 pl-4 border-l-2 border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                            {todo.subtasks?.map(subtask => (
                                  <div key={subtask.id} className="flex items-center gap-3 group/sub">
                                    <button onClick={() => toggleSubtask(todo.id, subtask.id)} className="flex-shrink-0">
                                      {subtask.completed ? <CheckSquare size={16} className="text-[#a8d5e2]" /> : <Square size={16} className="text-[#cccccc] dark:text-[#666666]" />}
                                    </button>
                                    <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-[#999999] dark:text-[#666666]' : 'text-[#1a1a1a] dark:text-white'}`}>{subtask.title}</span>
                                    <button onClick={() => onDeleteSubtask(todo.id, subtask.id)} className="p-1 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded text-[#666666] dark:text-[#a0a0a0] opacity-0 group-hover/sub:opacity-100">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                                <input type="text" placeholder="Add subtask..." className="w-full px-3 py-2 text-sm bg-[rgba(0,0,0,0.02)] dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] focus:outline-none focus:border-[#4485d1]" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { addSubtask(todo.id, e.currentTarget.value.trim()); e.currentTarget.value = ''; } }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default TodoList;
