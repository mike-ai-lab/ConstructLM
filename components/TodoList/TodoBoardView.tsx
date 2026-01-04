import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RotateCcw, Trash2, Calendar, Tag, Repeat } from 'lucide-react';
import { Todo } from '../../types';

interface TodoBoardViewProps {
  todos: Todo[];
  deletingId: string | null;
  completingId: string | null;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  highlightFilter: string | null;
  onEdit: (todo: Todo) => void;
  onDuplicate: (todo: Todo) => void;
  onReorder: (todos: Todo[]) => void;
}

const TodoBoardView: React.FC<TodoBoardViewProps> = ({
  todos,
  deletingId,
  completingId,
  onToggle,
  onDelete,
  highlightFilter,
  onEdit,
  onDuplicate,
  onReorder
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState<HTMLElement | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    const draggedEl = e.currentTarget as HTMLElement;
    draggedEl.classList.add('dragging');
    (e.dataTransfer as DataTransfer).effectAllowed = 'move';

    const rect = draggedEl.getBoundingClientRect();
    const placeholderEl = document.createElement('div');
    placeholderEl.className = 'placeholder-task';
    placeholderEl.style.height = `${rect.height}px`;
    placeholderEl.style.width = `${rect.width}px`;
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
        
        const allChildren = Array.from(placeholder.parentNode.children);
        const reorderedTodos: Todo[] = [];
        
        allChildren.forEach(child => {
          const taskId = (child as HTMLElement).getAttribute('data-task-id');
          if (taskId) {
            const todo = todos.find(t => t.id === taskId);
            if (todo) reorderedTodos.push(todo);
          }
        });
        
        if (reorderedTodos.length === todos.length) {
          onReorder(reorderedTodos);
        }
      }
    }
    return false;
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse-placeholder {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .dragging {
            opacity: 0.5;
            cursor: grabbing !important;
          }
          .board-task {
            user-select: none;
            -webkit-user-select: none;
            cursor: grab;
            align-self: start;
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .board-task:active {
            cursor: grabbing;
          }
          .board-task * {
            pointer-events: none;
          }
        `}
      </style>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridAutoRows: '1fr' }} onDragOver={handleDragOver} onDrop={handleDrop}>
        {todos.map((todo) => {
          const isOverdue = todo.dueDate && todo.dueDate < Date.now() && !todo.completed;
          const isDeleting = deletingId === todo.id;
          
          return (
            <motion.div
              key={todo.id}
              data-task-id={todo.id}
              draggable
              onDragStart={(e) => handleDragStart(e as any, todo.id)}
              onDragEnd={(e) => handleDragEnd(e as any)}
              onDragEnter={(e) => handleDragEnter(e as any, todo.id)}
              onDragOver={(e) => handleDragOver(e as any)}
              initial={{ opacity: 0 }}
              animate={{ opacity: isDeleting ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className={`board-task relative p-5 min-h-[200px] flex flex-col justify-between rounded-lg border-t-4 shadow-lg bg-[#f5f5f5] dark:bg-[#252525] ${
                todo.priority === 'high' ? 'border-red-500' :
                todo.priority === 'medium' ? 'border-[#FBF719]' :
                'border-green-500'
              } ${
                highlightFilter === 'active' && !todo.completed && !todo.archived ? 'ring-2 ring-[#4485d1]' :
                highlightFilter === 'high' && todo.priority === 'high' ? 'ring-2 ring-red-500' : ''
              } ${draggedTask === todo.id ? 'dragging' : ''}`}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full shadow-md ${
                  todo.priority === 'high' ? 'bg-red-500' :
                  todo.priority === 'medium' ? 'bg-[#FBF719]' : 'bg-green-500'
                }`}></div>
                <div className="w-0.5 h-2 bg-[#666666] dark:bg-[#999999] -mt-1 opacity-40"></div>
              </div>

              <div className="pt-2">
                <h4 className={`text-lg font-medium leading-tight text-[#1a1a1a] dark:text-white mb-2 ${todo.completed ? 'opacity-40 line-through' : ''}`}>
                  {todo.title}
                </h4>
                {todo.notes && <p className="text-xs text-[#666666] dark:text-[#a0a0a0] line-clamp-2 mb-2">{todo.notes}</p>}
                
                <div className="flex items-center gap-1 flex-wrap">
                  {todo.recurring?.enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Repeat size={10} />
                    </span>
                  )}
                  {todo.dueDate && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                      <Calendar size={10} />
                      {new Date(todo.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#999999] dark:text-[#666666]">
                  <Tag size={10} />
                  {todo.priority || 'medium'}
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => onToggle(todo.id)}
                    className={`p-1.5 rounded-lg transition-colors ${todo.completed ? 'bg-[#4485d1] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={{ pointerEvents: 'auto' }}
                  >
                    {todo.completed ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button 
                    onClick={() => onDelete(todo.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-red-500 hover:text-white transition-colors"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default TodoBoardView;