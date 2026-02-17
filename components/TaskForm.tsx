
import React, { useState } from 'react';
import { Task } from '../types';

interface TaskFormProps {
  onAdd: (task: Omit<Task, 'id' | 'completed' | 'date'>) => void;
  targetDateLabel: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onAdd, targetDateLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: '09:00',
    priority: 'medium' as const,
    category: 'عام'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onAdd(formData);
    setFormData({ title: '', description: '', time: '09:00', priority: 'medium', category: 'عام' });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all font-bold text-lg"
      >
        <i className="fa-solid fa-plus-circle text-xl"></i>
        أضف مهمة لـ {targetDateLabel}
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-800">مهمة جديدة لـ {targetDateLabel}</h3>
        <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">اسم المهمة</label>
          <input 
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-bold"
            placeholder="مثال: مراجعة كورس البرمجة"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الوصف (اختياري)</label>
          <textarea 
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all h-24 font-medium"
            placeholder="ما الذي تريد إنجازه بالضبط؟"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الوقت</label>
            <input 
              type="time"
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">الأولوية</label>
            <select 
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold appearance-none"
            >
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
            </select>
          </div>
        </div>
        <button 
          type="submit"
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all mt-4 text-lg"
        >
          يلا، أضف المهمة!
        </button>
      </form>
    </div>
  );
};
