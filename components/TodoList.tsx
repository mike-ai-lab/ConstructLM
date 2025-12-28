import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, AlertCircle, Plus, Calendar, Tag, Flag, Clock, Edit2, Check, X, ChevronDown, ChevronRight, BarChart3, Copy, Archive, Download } from 'lucide-react';
import { Todo } from '../types';
import { exportTodosToPDF } from '../services/pdfExport';

interface TodoListProps {
  todos: Todo[];
  onAddTodo: (todo: Omit<Todo, 'id' | 'timestamp'>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onDeleteSubtask: (todoId: string, subtaskId: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, onDeleteSubtask }) => {
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority'>('created');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '' });

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
    if (!formData.title.trim()) return;
    const todo: any = { title: formData.title.trim(), completed: false, priority: formData.priority, subtasks: [], progress: 0 };
    if (formData.dueDate) todo.dueDate = new Date(formData.dueDate).getTime();
    if (formData.tags) todo.tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (formData.notes) todo.notes = formData.notes;
    if (formData.category) todo.category = formData.category;
    if (formData.estimatedTime) todo.estimatedTime = parseInt(formData.estimatedTime);
    onAddTodo(todo);
    setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '' });
    setShowAddForm(false);
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

  const deleteSubtask = (todoId: string, subtaskId: string) => {
    onDeleteSubtask(todoId, subtaskId);
  };

  const calculateProgress = (subtasks: any[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completed = subtasks.filter(s => s.completed).length;
    return Math.round((completed / subtasks.length) * 100);
  };

  const duplicateTodo = (todo: Todo) => {
    const duplicate = { ...todo, id: undefined, timestamp: undefined, title: `${todo.title} (Copy)`, completed: false };
    onAddTodo(duplicate as any);
  };

  const getPriorityColor = (priority?: string) => {
    if (priority === 'high') return 'bg-[#f07a76]';
    if (priority === 'medium') return 'bg-[#25b5cd]';
    if (priority === 'low') return 'bg-[#16b47e]';
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
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Tasks</h2>
          <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">({filteredTodos.length})</span>
          <div className="flex-1" />
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
            <Plus size={12} /> New Task
          </button>
          <button onClick={() => exportTodosToPDF(todos)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1">
            <Download size={12} /> Export PDF
          </button>
          <div className="flex gap-1">
            {['all', 'active', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f as any)} className={`px-2 py-1 text-xs rounded ${filter === f ? 'bg-blue-600 text-white' : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0]'}`}>{f}</button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-2 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded border-none focus:outline-none">
            <option value="created">Created</option>
            <option value="due">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        {showAddForm && (
          <div className="bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md rounded-lg p-3 border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] space-y-2">
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Task title..." className="w-full px-2 py-1 text-sm bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none focus:border-blue-500" />
            <div className="flex gap-2">
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="flex-1 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="flex-1 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]" />
            </div>
            <div className="flex gap-2">
              <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Category" className="flex-1 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none" />
              <input type="number" value={formData.estimatedTime} onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})} placeholder="Est. mins" className="w-24 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none" />
            </div>
            <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="Tags (comma separated)" className="w-full px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none" />
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Notes..." rows={2} className="w-full px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] focus:outline-none resize-none" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddForm(false); setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '' }); }} className="px-3 py-1 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded hover:bg-[rgba(0,0,0,0.06)]">
                Cancel
              </button>
              <button onClick={handleAdd} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                Add Task
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <CheckSquare size={32} className="text-[#666666] dark:text-[#a0a0a0] mb-2 opacity-50" />
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">No tasks</p>
          </div>
        ) : (
          <>
            <div className="mb-3 p-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-lg flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <BarChart3 size={12} className="text-blue-600" />
                <span className="text-[#666666] dark:text-[#a0a0a0]">Completed:</span>
                <span className="font-semibold text-[#1a1a1a] dark:text-white">{todos.filter(t => t.completed).length}/{todos.length}</span>
              </div>
              <div className="flex-1 bg-[rgba(0,0,0,0.1)] dark:bg-[#1a1a1a] rounded-full h-2">
                <div className="bg-[#b8e6f0] dark:bg-[#7dd3e8] h-2 rounded-full transition-all" style={{ width: `${todos.length ? (todos.filter(t => t.completed).length / todos.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="space-y-2">
            {filteredTodos.map(todo => {
              const isExpanded = expandedTasks.has(todo.id);
              const progress = todo.progress || 0;
              return (
              <div key={todo.id} className="bg-white/70 dark:bg-[#2a2a2a]/70 backdrop-blur-md rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] hover:border-blue-500 transition-colors">
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <button onClick={() => onToggleTodo(todo.id)} className="flex-shrink-0 mt-0.5">
                      {todo.completed ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-[#666666] dark:text-[#a0a0a0]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {(todo.subtasks && todo.subtasks.length > 0) && (
                          <button onClick={() => setExpandedTasks(prev => { const next = new Set(prev); isExpanded ? next.delete(todo.id) : next.add(todo.id); return next; })} className="p-0.5 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222] rounded">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        <span className={`text-sm font-medium flex-1 ${todo.completed ? 'line-through text-[#666666] dark:text-[#a0a0a0]' : 'text-[#1a1a1a] dark:text-white'}`}>{todo.title}</span>
                        {todo.priority && <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} title={todo.priority} />}
                      </div>
                      {todo.category && <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 mr-2">{todo.category}</span>}
                      {todo.estimatedTime && <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">{todo.estimatedTime}m</span>}
                      {progress > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-[#666666] dark:text-[#a0a0a0]">{progress}%</span>
                            <div className="flex-1 bg-[rgba(0,0,0,0.1)] dark:bg-[#1a1a1a] rounded-full h-1.5">
                              <div className="bg-[#a8d5e2] dark:bg-[#6ec9e0] h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                      {todo.notes && <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mt-1">{todo.notes}</p>}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {todo.dueDate && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            getTimeRemaining(todo.dueDate) === 'Overdue' 
                              ? 'bg-[#f07a76]/20 dark:bg-[#f07a76]/10 text-[#f07a76]'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            <Clock size={10} /> {getTimeRemaining(todo.dueDate)}
                          </span>
                        )}
                        {todo.tags?.map(tag => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center gap-1">
                            <Tag size={10} /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => duplicateTodo(todo)} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicate">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => onDeleteTodo(todo.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && todo.subtasks && (
                    <div className="mt-3 ml-6 space-y-1">
                      {todo.subtasks.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-2 p-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#1a1a1a] rounded group/sub">
                          <button onClick={() => toggleSubtask(todo.id, subtask.id)} className="flex-shrink-0">
                            {subtask.completed ? <CheckSquare size={14} className="text-green-600" /> : <Square size={14} className="text-[#666666] dark:text-[#a0a0a0]" />}
                          </button>
                          <span className={`text-xs flex-1 ${subtask.completed ? 'line-through text-[#666666] dark:text-[#a0a0a0]' : 'text-[#1a1a1a] dark:text-white'}`}>{subtask.title}</span>
                          <button onClick={() => deleteSubtask(todo.id, subtask.id)} className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 opacity-0 group-hover/sub:opacity-100">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1 mt-2">
                        <input type="text" placeholder="Add subtask..." className="flex-1 px-2 py-1 text-xs bg-white dark:bg-[#1a1a1a] rounded border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]" onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { addSubtask(todo.id, e.currentTarget.value.trim()); e.currentTarget.value = ''; } }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );})}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TodoList;
