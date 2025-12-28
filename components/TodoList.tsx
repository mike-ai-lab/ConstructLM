import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Plus, Calendar, Tag, Clock, X, ChevronDown, ChevronRight, Copy, Download, Circle, CheckCircle2, MoreHorizontal } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '' });

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const highPriority = activeTodos.filter(t => t.priority === 'high').length;
  const mediumPriority = activeTodos.filter(t => t.priority === 'medium').length;
  const lowPriority = activeTodos.filter(t => !t.priority || t.priority === 'low').length;
  const overdue = activeTodos.filter(t => t.dueDate && t.dueDate < Date.now()).length;

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pMap = { high: 0, medium: 1, low: 2 };
    return (pMap[a.priority || 'low'] || 2) - (pMap[b.priority || 'low'] || 2);
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

  const calculateProgress = (subtasks: any[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    return Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100);
  };

  const duplicateTodo = (todo: Todo) => {
    onAddTodo({ ...todo, id: undefined, timestamp: undefined, title: `${todo.title} (Copy)`, completed: false } as any);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white">Tasks</h1>
            <span className="text-sm text-[#666666] dark:text-[#a0a0a0]">{todos.length} total</span>
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
            <div className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-2 font-medium">Completed</div>
            <div className="text-3xl font-bold text-[#1a1a1a] dark:text-white mb-1">{completedTodos.length}</div>
            <div className="h-1 bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div className="h-full bg-[#a8d5e2]" style={{ width: `${todos.length ? (completedTodos.length / todos.length) * 100 : 0}%` }} />
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
        <div className="flex items-center gap-2 mt-4">
          {['all', 'active', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === f ? 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#2a2a2a]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mt-4 bg-[#f8f9fa] dark:bg-[#2a2a2a] rounded-xl p-4 space-y-3">
            <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Task title..." className="w-full px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[#4485d1]" />
            <div className="grid grid-cols-3 gap-3">
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none">
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Category" className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} placeholder="Tags (comma separated)" className="flex-1 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
              <input type="number" value={formData.estimatedTime} onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})} placeholder="Est. mins" className="w-32 px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none" />
            </div>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Notes..." rows={2} className="w-full px-4 py-3 text-sm bg-white dark:bg-[#1a1a1a] rounded-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] focus:outline-none resize-none" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddForm(false); setFormData({ title: '', priority: 'medium', dueDate: '', tags: '', notes: '', category: '', estimatedTime: '' }); }} className="px-4 py-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">Cancel</button>
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
                <div key={todo.id} className="group bg-white dark:bg-[#2a2a2a] rounded-xl border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] hover:border-[rgba(0,0,0,0.12)] dark:hover:border-[rgba(255,255,255,0.12)] transition-all">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <button onClick={() => onToggleTodo(todo.id)} className="flex-shrink-0 mt-0.5">
                        {todo.completed ? <CheckCircle2 size={22} className="text-[#a8d5e2]" /> : <Circle size={22} className="text-[#cccccc] dark:text-[#666666]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className={`text-base font-medium ${todo.completed ? 'line-through text-[#999999] dark:text-[#666666]' : 'text-[#1a1a1a] dark:text-white'}`}>{todo.title}</h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => duplicateTodo(todo)} className="p-2 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Duplicate">
                              <Copy size={16} />
                            </button>
                            <button onClick={() => onDeleteTodo(todo.id)} className="p-2 hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[#1a1a1a] rounded-lg text-[#666666] dark:text-[#a0a0a0]" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-3">
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
                          {todo.dueDate && (
                            <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium ${isOverdue ? 'bg-[#f0f0f0] dark:bg-[#3a3a3a] text-[#666666] dark:text-[#a0a0a0]' : 'bg-[#f8f8f8] dark:bg-[#333333] text-[#666666] dark:text-[#a0a0a0]'}`}>
                              <Clock size={11} /> {new Date(todo.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {todo.estimatedTime && <span className="text-xs px-3 py-1 rounded-full bg-[#fafafa] dark:bg-[#2a2a2a] text-[#999999] dark:text-[#666666] font-medium">{todo.estimatedTime}m</span>}
                          {todo.tags?.map(tag => (
                            <span key={tag} className="text-xs px-3 py-1 rounded-full bg-[#f8f8f8] dark:bg-[#333333] text-[#666666] dark:text-[#a0a0a0] flex items-center gap-1.5">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                        {todo.notes && <p className="text-sm text-[#666666] dark:text-[#a0a0a0] mb-3">{todo.notes}</p>}
                        {todo.subtasks && todo.subtasks.length > 0 && (
                          <>
                            <button onClick={() => setExpandedTasks(prev => { const next = new Set(prev); isExpanded ? next.delete(todo.id) : next.add(todo.id); return next; })} className="text-sm text-[#4485d1] hover:underline flex items-center gap-1.5 mb-2">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} subtasks completed
                            </button>
                            {isExpanded && (
                              <div className="space-y-2 pl-4 border-l-2 border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                                {todo.subtasks.map(subtask => (
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
                          </>
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
  );
};

export default TodoList;
