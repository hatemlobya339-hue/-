
import React from 'react';
import { InfographicData } from '../types';

export const InfographicView: React.FC<{ data: InfographicData }> = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[3rem] border border-indigo-100 shadow-inner space-y-8 animate-in zoom-in-95 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-indigo-900">{data.mainTitle}</h2>
        <p className="text-indigo-600/70 font-bold max-w-md mx-auto leading-relaxed">{data.summary}</p>
      </div>

      <div className="relative space-y-6">
        {/* Connecting Line */}
        <div className="absolute top-0 bottom-0 right-[27px] w-0.5 bg-indigo-100 hidden md:block"></div>

        {data.steps.map((step, idx) => (
          <div key={idx} className="relative flex items-start gap-6 group">
            <div className="z-10 w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0 transform group-hover:scale-110 transition-transform">
              <i className={`fa-solid ${step.icon} text-xl`}></i>
            </div>
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow">
              <h4 className="font-black text-slate-800 text-lg mb-2">{step.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{step.content}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-4 text-center">
        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">تم التوليد بواسطة يلا ذكاء</span>
      </div>
    </div>
  );
};
