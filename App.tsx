
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, ViewMode, InfographicData } from './types';
import { TaskItem } from './components/TaskItem';
import { TaskForm } from './components/TaskForm';
import { InfographicView } from './components/InfographicView';
import { getSmartPlanningAdvice, summarizeAndTts, generateInfographic } from './services/geminiService';

// مساعدات الصوت لـ TTS
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('yalla_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [displayedAdvice, setDisplayedAdvice] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isToolLoading, setIsToolLoading] = useState(false);
  const [infographic, setInfographic] = useState<InfographicData | null>(null);
  const [audioSummaryText, setAudioSummaryText] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  const notificationInterval = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const typingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('yalla_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // منطق تثبيت التطبيق PWA - التأكد من إمساك الحدث فور حدوثه
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // إظهار التنبيه فوراً عند التحميل
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // فحص إذا كان التطبيق مفتوحاً بالفعل كـ PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }

    // إخفاء رسالة الترحيب بعد 5 ثواني إذا لم يتفاعل المستخدم
    const timer = setTimeout(() => setIsFirstLoad(false), 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("عذراً، التثبيت غير متاح حالياً في متصفحك. حاول استخدامه من متصفح Chrome.");
      return;
    }
    
    // تشغيل نافذة التثبيت الفعلية للمتصفح (التي تظهر الاسم واللوجو)
    deferredPrompt.prompt(); 
    
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('تم قبول التثبيت بنجاح');
      setShowInstallPrompt(false);
    } else {
      console.log('تم رفض التثبيت');
    }
    setDeferredPrompt(null);
  };

  const dismissInstallPrompt = () => {
    localStorage.setItem('install_dismissed_v3', 'true');
    setShowInstallPrompt(false);
  };

  // طلب إذن التنبيهات ونظام التذكير
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    notificationInterval.current = window.setInterval(() => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
      const currentDate = now.toISOString().split('T')[0];

      tasks.forEach(task => {
        if (!task.completed && !task.notified && task.date === currentDate && task.time === currentTime) {
          if (Notification.permission === 'granted') {
            new Notification(`⏰ حان وقت المهمة: ${task.title}`, {
              body: task.description || "يلا نبدأ الإنجاز الآن!",
              icon: "https://cdn-icons-png.flaticon.com/512/2098/2098402.png"
            });
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, notified: true } : t));
          }
        }
      });
    }, 10000);

    return () => { if (notificationInterval.current) clearInterval(notificationInterval.current); };
  }, [tasks]);

  // تأثير الكتابة للنصيحة
  useEffect(() => {
    if (aiAdvice) {
      setDisplayedAdvice("");
      let i = 0;
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = window.setInterval(() => {
        setDisplayedAdvice(aiAdvice.slice(0, i + 1));
        i++;
        if (i >= aiAdvice.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        }
      }, 25);
    }
  }, [aiAdvice]);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const filteredTasks = useMemo(() => {
    if (viewMode === 'all') {
      return [...tasks].sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
    }
    if (viewMode === 'tools') return [];
    const targetDate = viewMode === 'today' ? todayStr : tomorrowStr;
    return tasks.filter(t => t.date === targetDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, viewMode, todayStr, tomorrowStr]);

  const addTask = (taskData: Omit<Task, 'id' | 'completed' | 'date'>) => {
    const newTask: Task = { 
      ...taskData, 
      id: crypto.randomUUID(), 
      completed: false, 
      date: viewMode === 'today' ? todayStr : (viewMode === 'tomorrow' ? tomorrowStr : todayStr), 
      notified: false 
    };
    setTasks(prev => [...prev, newTask]);
    if (Notification.permission === 'default') Notification.requestPermission();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'infographic') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsToolLoading(true);
    setInfographic(null);
    setAudioSummaryText("");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        if (type === 'audio') {
          const result = await summarizeAndTts(base64, file.type);
          setAudioSummaryText(result.summary);
          if (result.audioData) playAudio(result.audioData);
        } else {
          const data = await generateInfographic(base64, file.type);
          setInfographic(data);
        }
      } catch (err) {
        alert("حدث خطأ أثناء معالجة الملف.");
      } finally {
        setIsToolLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const playAudio = async (base64: string) => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  const stats = useMemo(() => {
    const relevantTasks = viewMode === 'all' ? tasks : filteredTasks;
    const total = relevantTasks.length;
    const completed = relevantTasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [tasks, filteredTasks, viewMode]);

  return (
    <div className="min-h-screen pb-32 md:pb-12 bg-[#F8FAFC] antialiased">
      {/* تنبيه تثبيت التطبيق - أكثر بروزاً */}
      {showInstallPrompt && (
        <div className="fixed top-0 inset-x-0 z-[100] p-4 install-banner">
          <div className="max-w-xl mx-auto bg-white border-2 border-indigo-500 p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.2)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                <img src="https://cdn-icons-png.flaticon.com/512/2098/2098402.png" className="w-10 h-10 brightness-0 invert" alt="Yalla Task Logo" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-lg leading-tight">تثبيت تطبيق "يلا تاسك"</h4>
                <p className="text-sm text-slate-500 mt-0.5 font-bold">ثبت التطبيق لتلقي التنبيهات والوصول السريع</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInstallClick} 
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap"
              >
                تثبيت الآن
              </button>
              <button onClick={dismissInstallPrompt} className="text-slate-300 hover:text-rose-500 p-2 transition-colors">
                <i className="fa-solid fa-circle-xmark text-2xl"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* رسالة ترحيب أولية */}
      {isFirstLoad && !showInstallPrompt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl font-black flex items-center gap-3 animate-bounce">
          <i className="fa-solid fa-sparkles"></i>
          أهلاً بك في يلا تاسك! جاهز للإنجاز؟
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 transform rotate-3">
              <i className="fa-solid fa-bolt-lightning text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">يلا تاسك</h1>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">رفيقك الذكي للإنجاز اليومي</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'tomorrow', label: 'الغد' },
              { id: 'all', label: 'السجل الكامل' },
              { id: 'tools', label: 'الأدوات' }
            ].map((mode) => (
              <button key={mode.id} onClick={() => setViewMode(mode.id as any)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === mode.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {mode.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 space-y-8 pb-10">
        {viewMode === 'tools' ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900">أدوات يلا الذكية 🧠</h2>
                <p className="text-slate-500 font-bold">حول مستنداتك إلى صوت مسموع أو إنفوجرافيك مذهل بذكاء يلا</p>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                <label className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-indigo-100 hover:border-indigo-400 transition-all cursor-pointer text-center shadow-sm">
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, 'audio')} disabled={isToolLoading} />
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-microphone-lines text-2xl"></i>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg">تحويل PDF لصوت</h4>
                  <p className="text-slate-400 text-sm font-bold mt-1">ارفع الملف لنقوم بتلخيصه وقراءته لك</p>
                </label>

                <label className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-emerald-100 hover:border-emerald-400 transition-all cursor-pointer text-center shadow-sm">
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleFileUpload(e, 'infographic')} disabled={isToolLoading} />
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-shapes text-2xl"></i>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg">إنفوجرافيك ذكي</h4>
                  <p className="text-slate-400 text-sm font-bold mt-1">حول أي نص أو ملف لشرح مرئي احترافي</p>
                </label>
             </div>

             {isToolLoading && (
               <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-black text-indigo-600 animate-pulse">جاري معالجة طلبك بذكاء...</p>
               </div>
             )}

             {audioSummaryText && (
               <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-sm animate-in fade-in duration-700">
                  <h3 className="font-black text-slate-800 mb-4 flex items-center gap-3">
                    <i className="fa-solid fa-file-audio text-indigo-600 text-xl"></i>
                    ملخص الملف:
                  </h3>
                  <p className="text-slate-600 leading-relaxed font-bold bg-slate-50 p-6 rounded-3xl italic border border-slate-100">"{audioSummaryText}"</p>
               </div>
             )}

             {infographic && <InfographicView data={infographic} />}
          </section>
        ) : (
          <>
            <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 mb-1">
                    {viewMode === 'today' ? 'مهام اليوم' : viewMode === 'tomorrow' ? 'مهام الغد' : 'جميع المهام المجدولة'}
                  </h2>
                  <p className="text-slate-400 font-bold text-sm">أنجزت {stats.completed} من إجمالي {stats.total} مهمة</p>
                </div>
                <div className="relative flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                        <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={220} strokeDashoffset={220 - (220 * stats.percent) / 100} strokeLinecap="round" className="text-indigo-600 transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute text-lg font-black text-indigo-600">{stats.percent}%</span>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-7 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-200 group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-sparkles text-indigo-300"></i>
                    <h3 className="font-black text-xl">نصيحة يلا الذكية</h3>
                  </div>
                  <button onClick={async () => { setIsAiLoading(true); setAiAdvice(await getSmartPlanningAdvice(filteredTasks)); setIsAiLoading(false); }} disabled={isAiLoading} className="text-xs bg-white text-indigo-700 px-5 py-2.5 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                    {isAiLoading ? "جاري التفكير..." : "حلل يومي"}
                  </button>
                </div>
                <div className="min-h-[4rem]">
                  <p className="text-indigo-50 leading-relaxed font-bold text-lg">
                    {displayedAdvice || (aiAdvice ? "" : "اضغط على 'حلل يومي' للحصول على نصيحة مخصصة لمهامك الحالية.")}
                    {isAiLoading && <span className="inline-block w-2 h-5 bg-white animate-pulse mr-2"></span>}
                  </p>
                </div>
              </div>
            </section>

            {viewMode !== 'all' && (
              <section>
                <TaskForm 
                  onAdd={addTask} 
                  targetDateLabel={viewMode === 'today' ? "اليوم" : "الغد"} 
                />
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between px-3">
                <h4 className="font-black text-slate-400 text-sm uppercase tracking-widest">
                  {viewMode === 'all' ? 'سجل المهام الكامل' : 'قائمة المهام'}
                </h4>
              </div>
              
              {filteredTasks.length > 0 ? (
                <div className="grid gap-4">
                  {filteredTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={(id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))} 
                      onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))} 
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 mb-6">
                    <i className="fa-solid fa-clipboard-list text-4xl"></i>
                  </div>
                  <h4 className="text-slate-800 font-black text-2xl mb-2">لا توجد مهام حالياً</h4>
                  <p className="text-slate-400 font-bold">ابدأ بإضافة مهامك لليوم أو الغد لتنظيم وقتك!</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* شريط التنقل السفلي للهواتف */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40 md:hidden pointer-events-none">
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-4 flex items-center justify-between border border-white/50 pointer-events-auto">
          {[
            { id: 'today', icon: 'fa-calendar-day', label: 'اليوم' },
            { id: 'tomorrow', icon: 'fa-calendar-plus', label: 'الغد' },
            { id: 'all', icon: 'fa-layer-group', label: 'الكل' },
            { id: 'tools', icon: 'fa-wand-magic-sparkles', label: 'الأدوات' }
          ].map((item) => (
            <button key={item.id} onClick={() => setViewMode(item.id as any)} className={`flex-1 flex flex-col items-center gap-1 transition-all ${viewMode === item.id ? 'text-indigo-600 scale-110' : 'text-slate-400 opacity-60'}`}>
              <i className={`fa-solid ${item.icon} text-xl`}></i>
              <span className="text-[10px] font-black">{item.label}</span>
              {viewMode === item.id && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1"></div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
