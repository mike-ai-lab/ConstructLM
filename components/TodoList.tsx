import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Calendar, Tag, Clock, X, ChevronDown, ChevronRight, Copy, Circle, CheckCircle2, Edit2, Repeat } from 'lucide-react';
import { Todo, TodoGroup } from '../types';
import TodoHeader from './TodoList/TodoHeader';
import TodoStats from './TodoList/TodoStats';
import TodoBoardView from './TodoList/TodoBoardView';
import TodoGroupsSidebar from './TodoList/TodoGroupsSidebar';
import TodoAddForm from './TodoList/TodoAddForm';

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
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'priority-high' | 'priority-low' | 'duedate'>('created');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '', recurring: false, recurringFrequency: 'daily', recurringInterval: '1' });
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '', recurring: false, recurringFrequency: 'daily', recurringInterval: '1' });
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '', color: '#4485d1' });
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [highlightFilter, setHighlightFilter] = useState<string | null>(null);

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
    // Board view uses boardOrder, list view uses sortBy
    if (viewMode === 'board') {
      const aOrder = a.boardOrder ?? a.timestamp;
      const bOrder = b.boardOrder ?? b.timestamp;
      return aOrder - bOrder; // ASCENDING: lower number = first
    }
    
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
      groupId: todo.groupId || '',
      recurring: todo.recurring?.enabled || false,
      recurringFrequency: todo.recurring?.frequency || 'daily',
      recurringInterval: todo.recurring?.interval?.toString() || '1'
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
    if (editFormData.recurring) {
      updates.recurring = {
        enabled: true,
        frequency: editFormData.recurringFrequency,
        interval: parseInt(editFormData.recurringInterval) || 1,
        nextDue: updates.dueDate || Date.now()
      };
    } else {
      updates.recurring = { enabled: false };
    }
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
    if (formData.recurring) {
      todo.recurring = {
        enabled: true,
        frequency: formData.recurringFrequency,
        interval: parseInt(formData.recurringInterval) || 1,
        nextDue: todo.dueDate || Date.now()
      };
    }
    onAddTodo(todo);
    setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '', recurring: false, recurringFrequency: 'daily', recurringInterval: '1' });
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

  const calculateNextDue = (recurring: NonNullable<Todo['recurring']>) => {
    const now = Date.now();
    const interval = recurring.interval || 1;
    const base = recurring.nextDue || now;
    
    switch (recurring.frequency) {
      case 'daily':
        return base + (interval * 24 * 60 * 60 * 1000);
      case 'weekly':
        return base + (interval * 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const date = new Date(base);
        date.setMonth(date.getMonth() + interval);
        return date.getTime();
      case 'custom':
        return base + (interval * 24 * 60 * 60 * 1000);
      default:
        return base + (24 * 60 * 60 * 1000);
    }
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    if (!todo.completed && todo.recurring?.enabled) {
      const nextDue = calculateNextDue(todo.recurring);
      onUpdateTodo(id, { 
        completed: true,
        archived: true,
        recurring: { ...todo.recurring, lastCompleted: Date.now() }
      });
      onAddTodo({ ...todo, id: undefined, timestamp: undefined, completed: false, dueDate: nextDue, recurring: { ...todo.recurring, nextDue } } as any);
    } else if (!todo.completed) {
      onUpdateTodo(id, { completed: true, archived: true });
    } else {
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

  const handleDeleteWithAnimation = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      onDeleteTodo(id);
      setDeletingId(null);
    }, 400);
  };

  const handleToggleWithAnimation = (id: string) => {
    setCompletingId(id);
    setTimeout(() => {
      handleToggleTodo(id);
      setCompletingId(null);
    }, 300);
  };

  return (
    <div className="flex h-full bg-white dark:bg-[#1a1a1a]">
      <TodoGroupsSidebar
        todos={todos}
        groups={groups}
        selectedGroup={selectedGroup}
        showGroupForm={showGroupForm}
        groupFormData={groupFormData}
        onSelectGroup={setSelectedGroup}
        onToggleGroupForm={() => setShowGroupForm(!showGroupForm)}
        onGroupFormChange={setGroupFormData}
        onAddGroup={handleAddGroup}
        onDeleteGroup={onDeleteGroup}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
        <TodoHeader
          todos={todos}
          showAddForm={showAddForm}
          filter={filter}
          viewMode={viewMode}
          sortBy={sortBy}
          activeTodos={activeTodos}
          onToggleAddForm={() => setShowAddForm(!showAddForm)}
          onFilterChange={setFilter}
          onViewModeChange={setViewMode}
          onSortChange={(sort) => setSortBy(sort as any)}
          onArchiveCompleted={archiveCompleted}
        />

        {!showAddForm && (
          <TodoStats
            todos={todos}
            activeTodos={activeTodos}
            archivedTodos={archivedTodos}
            highPriority={highPriority}
            mediumPriority={mediumPriority}
            lowPriority={lowPriority}
            highlightFilter={highlightFilter}
            onHighlightFilter={setHighlightFilter}
          />
        )}

        {showAddForm && (
          <TodoAddForm
            formData={formData}
            groups={groups}
            onFormChange={setFormData}
            onCancel={() => { setShowAddForm(false); setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '', groupId: '', recurring: false, recurringFrequency: 'daily', recurringInterval: '1' }); }}
            onAdd={handleAdd}
          />
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <CheckSquare size={64} className="text-[#e0e0e0] dark:text-[#3a3a3a] mb-4" />
            <p className="text-sm text-[#666666] dark:text-[#a0a0a0]">No tasks found</p>
          </div>
        ) : viewMode === 'board' ? (
          <>
            <TodoBoardView
              todos={filteredTodos}
              deletingId={deletingId}
              completingId={completingId}
              onToggle={handleToggleWithAnimation}
              onDelete={handleDeleteWithAnimation}
              highlightFilter={highlightFilter}
              onEdit={handleEdit}
              onDuplicate={duplicateTodo}
              onReorder={(reorderedTodos) => {
                console.log('🔧 PARENT REORDER CALLED:', reorderedTodos.map(t => t.title));
                const baseOrder = Date.now();
                
                // Batch update all at once to prevent re-sorting mid-update
                const updates = reorderedTodos.map((todo, idx) => ({
                  id: todo.id,
                  boardOrder: baseOrder + idx
                }));
                
                console.log('📦 BATCH UPDATES:', updates);
                
                // Apply all updates synchronously
                updates.forEach(({ id, boardOrder }) => {
                  onUpdateTodo(id, { boardOrder });
                });
              }}
            />
            {editingTask && (() => {
              const todo = todos.find(t => t.id === editingTask);
              if (!todo) return null;
              return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingTask(null)}>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-white mb-4">Edit Task</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={editFormData.title} onChange={(e) => setEditFormData({...editFormData, title: e.target.value})} placeholder="Task title..." className="col-span-2 px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
                      <select value={editFormData.priority} onChange={(e) => setEditFormData({...editFormData, priority: e.target.value})} className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                      </select>
                      <input type="text" value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} placeholder="Category" className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                      <input type="datetime-local" value={editFormData.dueDate} onChange={(e) => setEditFormData({...editFormData, dueDate: e.target.value})} className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                      <input type="number" value={editFormData.estimatedTime} onChange={(e) => setEditFormData({...editFormData, estimatedTime: e.target.value})} placeholder="Est. mins" className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                      <select value={editFormData.groupId} onChange={(e) => setEditFormData({...editFormData, groupId: e.target.value})} className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                        <option value="">Select Group</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <input type="text" value={editFormData.tags} onChange={(e) => setEditFormData({...editFormData, tags: e.target.value})} placeholder="Tags (comma separated)" className="px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
                      <textarea value={editFormData.notes} onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})} placeholder="Notes..." rows={2} className="col-span-2 px-4 py-3 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none resize-none" />
                      <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
                        <input type="checkbox" id="board-edit-recurring" checked={editFormData.recurring} onChange={(e) => setEditFormData({...editFormData, recurring: e.target.checked})} className="w-4 h-4" />
                        <label htmlFor="board-edit-recurring" className="text-sm text-[#1a1a1a] dark:text-white flex items-center gap-2"><Repeat size={14} /> Recurring Task</label>
                        {editFormData.recurring && (
                          <>
                            <select value={editFormData.recurringFrequency} onChange={(e) => setEditFormData({...editFormData, recurringFrequency: e.target.value})} className="px-3 py-1.5 text-sm bg-white dark:bg-[#333333] rounded border-0 focus:outline-none">
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="custom">Custom</option>
                            </select>
                            <input type="number" min="1" value={editFormData.recurringInterval} onChange={(e) => setEditFormData({...editFormData, recurringInterval: e.target.value})} placeholder="Interval" className="w-20 px-3 py-1.5 text-sm bg-white dark:bg-[#333333] rounded border-0 focus:outline-none" />
                            <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">day(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded-lg transition-colors">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-[#4485d1] text-white rounded-lg hover:bg-[#3674c1] transition-colors">Save</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map(todo => {
              const isExpanded = expandedTasks.has(todo.id);
              const progress = todo.progress || 0;
              const isOverdue = todo.dueDate && todo.dueDate < Date.now() && !todo.completed;
              
              return (
                <div key={todo.id} className={`group bg-[#f5f5f5] dark:bg-[#252525] rounded-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,0,0,0.12)] dark:hover:border-[rgba(255,255,255,0.12)] transition-all ${
                  highlightFilter === 'active' && !todo.completed && !todo.archived ? 'ring-2 ring-[#4485d1]' :
                  highlightFilter === 'archived' && todo.archived ? 'ring-2 ring-[#a8d5e2]' :
                  highlightFilter === 'high' && todo.priority === 'high' ? 'ring-2 ring-red-500' :
                  highlightFilter === 'medium' && todo.priority === 'medium' ? 'ring-2 ring-[#FBF719]' :
                  highlightFilter === 'low' && (!todo.priority || todo.priority === 'low') ? 'ring-2 ring-green-500' : ''
                }`}>
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
                          {todo.recurring?.enabled && (
                            <span className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5">
                              <Repeat size={10} /> {todo.recurring.frequency === 'custom' ? `Every ${todo.recurring.interval}d` : todo.recurring.frequency}
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
                              <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#2a2a2a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
                                <input type="checkbox" id="edit-recurring" checked={editFormData.recurring} onChange={(e) => setEditFormData({...editFormData, recurring: e.target.checked})} className="w-4 h-4" />
                                <label htmlFor="edit-recurring" className="text-sm text-[#1a1a1a] dark:text-white flex items-center gap-2"><Repeat size={14} /> Recurring Task</label>
                                {editFormData.recurring && (
                                  <>
                                    <select value={editFormData.recurringFrequency} onChange={(e) => setEditFormData({...editFormData, recurringFrequency: e.target.value})} className="px-3 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#333333] rounded border-0 focus:outline-none">
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                      <option value="custom">Custom</option>
                                    </select>
                                    <input type="number" min="1" value={editFormData.recurringInterval} onChange={(e) => setEditFormData({...editFormData, recurringInterval: e.target.value})} placeholder="Interval" className="w-20 px-3 py-1.5 text-sm bg-[#f5f5f5] dark:bg-[#333333] rounded border-0 focus:outline-none" />
                                    <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">day(s)</span>
                                  </>
                                )}
                              </div>
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
