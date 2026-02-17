
import React from 'react';
import { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
  const priorityColors = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-rose-100 text-rose-700'
  };

  const priorityLabels = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية'
  };

  // تنسيق التاريخ للعرض
  const displayDate = task.date === new Date().toISOString().split('T')[0] ? 'اليوم' : task.date;

  return (
    <div className={`group relative bg-white p-6 rounded-[2rem] border-2 transition-all hover:shadow-xl ${task.completed ? 'bg-slate-50 border-slate-100 opacity-80' : 'border-slate-50 hover:border-indigo-100'}`}>
      <div className="flex items-start gap-5">
        {/* زر الإنجاز - واضح جداً */}
        <button 
          onClick={() => onToggle(task.id)}
          className={`mt-1 h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 shadow-sm ${
            task.completed ? 'bg-emerald-500 border-emerald-500 text-white rotate-[360deg]' : 'border-slate-200 text-transparent hover:border-indigo-400 hover:bg-indigo-50'
          }`}
          title={task.completed ? "إلغاء الإنجاز" : "تم الإنجاز!"}
        >
          <i className="fa-solid fa-check text-lg"></i>
        </button>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h3 className={`font-black text-slate-800 text-xl leading-tight transition-all ${task.completed ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
               <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
                <i className="fa-solid fa-clock text-[10px]"></i>
                {task.time}
              </span>
            </div>
          </div>
          
          <p className={`text-base mb-4 leading-relaxed font-medium ${task.completed ? 'text-slate-300' : 'text-slate-500'}`}>
            {task.description || "لا يوجد وصف لهذه المهمة."}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full shadow-sm ${priorityColors[task.priority]}`}>
              أولوية {priorityLabels[task.priority]}
            </span>
            <span className="text-[11px] text-slate-500 font-black bg-slate-100 px-3 py-1 rounded-full">
              {task.category}
            </span>
            <span className="text-[11px] text-indigo-400 font-black bg-indigo-50/50 px-3 py-1 rounded-full mr-auto">
              <i className="fa-solid fa-calendar-day ml-1"></i>
              {displayDate}
            </span>
          </div>
        </div>

        <button 
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-rose-500 transition-all hover:scale-110"
        >
          <i className="fa-solid fa-trash-can text-xl"></i>
        </button>
      </div>
      
      {task.completed && (
        <div className="absolute top-4 left-4 pointer-events-none">
          <span className="text-[12px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl uppercase tracking-tighter border border-emerald-100 shadow-sm animate-bounce">تم الإنجاز ✅</span>
        </div>
      )}
    </div>
  );
};
