import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Check, RotateCcw, Calendar, Layers, Tag } from 'lucide-react';
import { Todo, TodoGroup } from '../types';

const NOTE_THEMES = {
  high: { bg: 'bg-rose-100/90 dark:bg-rose-900/30', accent: 'border-rose-400', pin: 'bg-rose-500' },
  medium: { bg: 'bg-amber-100/90 dark:bg-amber-900/30', accent: 'border-amber-400', pin: 'bg-amber-500' },
  low: { bg: 'bg-emerald-100/90 dark:bg-emerald-900/30', accent: 'border-emerald-400', pin: 'bg-emerald-500' }
};

interface TodoListBoardProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onAddTodo: (todo: Omit<Todo, 'id' | 'timestamp'>) => void;
  onReorderTodos?: (todos: Todo[]) => void;
}

const TodoListBoard: React.FC<TodoListBoardProps> = ({ todos, onToggleTodo, onDeleteTodo, onAddTodo, onReorderTodos }) => {
  const [newTask, setNewTask] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState<HTMLElement | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const activeTodos = todos.filter(t => !t.archived);

  const stats = useMemo(() => {
    const total = activeTodos.length;
    const done = activeTodos.filter(t => t.completed).length;
    return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [activeTodos]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    onAddTodo({
      title: newTask,
      completed: false,
      priority: selectedPriority,
      subtasks: [],
      progress: 0,
      archived: false,
      groupId: 'default'
    });
    setNewTask('');
    setIsAdding(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    const draggedEl = e.currentTarget as HTMLElement;
    draggedEl.classList.add('dragging');
    (e.dataTransfer as DataTransfer).effectAllowed = 'move';

    // Create placeholder
    const placeholderEl = document.createElement('div');
    placeholderEl.className = 'placeholder-task';
    placeholderEl.style.aspectRatio = '1';
    placeholderEl.style.borderRadius = '0.5rem';
    placeholderEl.style.border = '2px dashed rgba(102, 126, 234, 0.5)';
    placeholderEl.style.background = 'repeating-linear-gradient(45deg, rgba(102, 126, 234, 0.2) 0px, rgba(102, 126, 234, 0.2) 10px, rgba(102, 126, 234, 0.1) 10px, rgba(102, 126, 234, 0.1) 20px)';
    placeholderEl.style.animation = 'pulse-placeholder 1.5s ease-in-out infinite';
    placeholderEl.style.pointerEvents = 'none';
    placeholderEl.style.display = 'flex';
    placeholderEl.style.alignItems = 'center';
    placeholderEl.style.justifyContent = 'center';
    placeholderEl.style.fontSize = '1.5em';
    placeholderEl.style.color = 'rgba(102, 126, 234, 0.5)';
    placeholderEl.innerHTML = '↓';
    
    draggedEl.parentNode?.insertBefore(placeholderEl, draggedEl.nextSibling);
    setPlaceholder(placeholderEl);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const draggedEl = e.currentTarget as HTMLElement;
    draggedEl.classList.remove('dragging');
    
    setDraggedTask(null);
    
    if (placeholder) {
      placeholder.remove();
      setPlaceholder(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.dataTransfer as DataTransfer).dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, taskId: string) => {
    if (draggedTask && draggedTask !== taskId && placeholder) {
      const targetEl = e.currentTarget as HTMLElement;
      targetEl.parentNode?.insertBefore(placeholder, targetEl);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedTask && placeholder && placeholder.parentNode) {
      const draggedEl = document.querySelector(`[data-task-id="${draggedTask}"]`) as HTMLElement;
      if (draggedEl) {
        placeholder.parentNode.insertBefore(draggedEl, placeholder);
        
        // Calculate new order based on DOM
        const allChildren = Array.from(placeholder.parentNode.children);
        const reorderedTodos: Todo[] = [];
        
        allChildren.forEach(child => {
          const taskId = (child as HTMLElement).getAttribute('data-task-id');
          if (taskId) {
            const todo = activeTodos.find(t => t.id === taskId);
            if (todo) reorderedTodos.push(todo);
          }
        });
        
        if (reorderedTodos.length === activeTodos.length) {
          onReorderTodos?.(reorderedTodos);
        }
      }
    }
    return false;
  };

  return (
    <div className="h-full w-full bg-[#1a1a1a] p-4 md:p-8">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap');
          .font-script { font-family: 'Architects Daughter', cursive; }
          .board-texture {
            background-color: #2c2c2c;
            background-image: 
              repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px),
              radial-gradient(circle at 50% 50%, rgba(0,0,0,0.3) 0%, transparent 100%);
          }
          .glass-note {
            backdrop-filter: blur(8px);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
          }
          .pin-shadow {
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
          }
          @keyframes pulse-placeholder {
            0%, 100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }
          .dragging {
            opacity: 0.5;
            transform: scale(0.95) !important;
            transition: none;
            cursor: grabbing;
          }
          .glass-note {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
          .glass-note * {
            pointer-events: none;
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto board-texture rounded-[2.5rem] border-[16px] border-[#3d2b1f] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] p-6 md:p-12 h-full overflow-auto relative">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-[100px]"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white/90 tracking-tight flex items-center gap-3">
              Task Board
              <span className="text-sm font-normal bg-white/10 px-3 py-1 rounded-full text-white/40 uppercase tracking-widest">v2.0</span>
            </h1>
            <div className="flex gap-4 mt-2">
              <span className="text-white/40 text-sm flex items-center gap-1"><Calendar size={14}/> {new Date().toLocaleDateString()}</span>
              <span className="text-white/40 text-sm flex items-center gap-1"><Layers size={14}/> {stats.done}/{stats.total} Complete</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right mr-2">
              <div className="text-white/60 text-xs font-bold uppercase">Daily Goal</div>
              <div className="w-32 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${stats.percent}%` }}></div>
              </div>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white w-14 h-14 rounded-2xl shadow-xl shadow-indigo-900/20 flex items-center justify-center transition-all hover:rotate-90 active:scale-90"
            >
              <Plus size={32} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10" ref={gridRef} 
          onDragOver={handleDragOver}
          onDrop={handleDrop}>
          {activeTodos.map((task) => {
            const rotation = ((parseInt(task.id) % 5) - 2).toFixed(1);
            const theme = NOTE_THEMES[task.priority || 'medium'];
            return (
              <div 
                key={task.id}
                data-task-id={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, task.id)}
                onDragOver={handleDragOver}
                style={{ transform: `rotate(${rotation}deg)` }}
                className={`glass-note relative p-7 min-h-[220px] flex flex-col justify-between rounded-sm border-l-4 ${theme.bg} ${theme.accent} transition-transform hover:!rotate-0 hover:z-20 hover:scale-105 duration-300 cursor-grab active:cursor-grabbing ${draggedTask === task.id ? 'dragging' : ''}`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full ${theme.pin} pin-shadow z-10 border border-white/20`}></div>
                  <div className="w-0.5 h-3 bg-slate-400 -mt-1 opacity-50"></div>
                </div>

                <div className="pt-2">
                  <p className={`text-2xl font-script leading-tight text-slate-900 dark:text-slate-100 ${task.completed ? 'opacity-30 line-through' : ''}`}>
                    {task.title}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-6 border-t border-black/5 pt-4">
                  <div className="flex items-center gap-1.5 text-black/30 dark:text-white/30">
                    <Tag size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{task.priority || 'medium'}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onToggleTodo(task.id)}
                      className={`p-2 rounded-lg transition-all ${task.completed ? 'bg-indigo-600 text-white' : 'hover:bg-white/50 text-slate-600 dark:text-slate-300'}`}
                    >
                      {task.completed ? <RotateCcw size={16} /> : <Check size={16} />}
                    </button>
                    <button 
                      onClick={() => onDeleteTodo(task.id)}
                      className="p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all text-slate-600 dark:text-slate-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isAdding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-[#f8f9fa] dark:bg-[#2a2a2a] p-10 rounded-[2rem] shadow-2xl max-w-lg w-full transform border border-white/20">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">New Task</h2>
              <p className="text-slate-400 mb-8">What's next?</p>
              
              <form onSubmit={addTask} className="space-y-8">
                <textarea
                  autoFocus
                  placeholder="Type your task here..."
                  className="w-full bg-slate-100 dark:bg-[#1a1a1a] p-6 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-2xl font-script h-40 resize-none placeholder-slate-300 dark:text-white"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                />
                
                <div className="flex flex-wrap gap-2">
                  {(['high', 'medium', 'low'] as const).map(priority => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setSelectedPriority(priority)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        selectedPriority === priority 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-white dark:bg-[#1a1a1a] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                    Add Task
                  </button>
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-4 rounded-2xl text-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoListBoard;
