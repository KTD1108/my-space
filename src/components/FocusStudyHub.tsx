"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Flame, 
  CloudRain, 
  Waves, 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  X, 
  Minimize2, 
  Maximize2, 
  CheckCircle2, 
  Sparkles,
  VolumeX,
  Target
} from "lucide-react";
import toast from "react-hot-toast";
import { ambientAudio } from "@/lib/ambientAudio";
import { saveFocusSession } from "@/app/actions/data";

type PomodoroMode = "focus" | "shortBreak" | "longBreak";

const MODE_TIMES: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

export default function FocusStudyHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // POMODORO STATE
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionGoal, setSessionGoal] = useState("");
  const [goalCompleted, setGoalCompleted] = useState(false);

  // AMBIENT SOUNDS STATE
  const [soundStates, setSoundStates] = useState<{
    rain: { active: boolean; volume: number };
    waves: { active: boolean; volume: number };
    fireplace: { active: boolean; volume: number };
    focus: { active: boolean; volume: number };
  }>({
    rain: { active: false, volume: 50 },
    waves: { active: false, volume: 50 },
    fireplace: { active: false, volume: 40 },
    focus: { active: false, volume: 50 },
  });

  const customMinutesRef = useRef(customMinutes);
  const sessionGoalRef = useRef(sessionGoal);

  useEffect(() => {
    customMinutesRef.current = customMinutes;
  }, [customMinutes]);

  useEffect(() => {
    sessionGoalRef.current = sessionGoal;
  }, [sessionGoal]);

  const handleSessionCompleted = async (minutes: number, goalText: string) => {
    const sessionData = {
      id: Date.now().toString(),
      duration_minutes: minutes,
      goal: goalText || '',
      completed_at: new Date().toISOString()
    };

    // 1. Lưu an toàn vào LocalStorage
    try {
      const raw = localStorage.getItem('my_space_focus_sessions');
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(sessionData);
      localStorage.setItem('my_space_focus_sessions', JSON.stringify(existing));
    } catch (err) {
      console.warn("Lỗi lưu localStorage focus session:", err);
    }

    // 2. Phát event toàn cục để Dashboard cập nhật số phút ngay lập tức
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('focus-session-completed', { detail: sessionData }));
    }

    // 3. Gọi Server Action lưu vào DB
    try {
      const result = await saveFocusSession({
        duration_minutes: minutes,
        goal: goalText,
        completed_at: sessionData.completed_at
      });
      if (result.success) {
        console.log("[Focus] Đã lưu phiên học thành công vào CSDL.");
      } else {
        console.log("[Focus] Đã lưu phiên học vào bộ nhớ an toàn (Local Fallback).");
      }
    } catch (serverErr) {
      console.warn("[Focus] Lỗi máy chủ khi lưu phiên học:", serverErr);
    }
  };

  // Lắng nghe sự kiện mở Focus Hub toàn cục
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener("open-focus-hub", handleOpen);
    return () => window.removeEventListener("open-focus-hub", handleOpen);
  }, []);

  // Bộ đếm thời gian Pomodoro (Timer Loop)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isRunning) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Hết giờ
            clearInterval(timer!);
            setIsRunning(false);
            ambientAudio.playChime();

            if (mode === "focus") {
              const completedMins = customMinutesRef.current;
              const completedGoal = sessionGoalRef.current;
              handleSessionCompleted(completedMins, completedGoal);

              toast.success(`🎉 Hoàn thành phiên học ${completedMins} phút! Hãy nghỉ ngơi một chút nhé.`, { duration: 6000 });
              setMode("shortBreak");
              setCustomMinutes(5);
              setTotalDuration(5 * 60);
              return 5 * 60;
            } else {
              toast.success("⏰ Hết giờ nghỉ! Sẵn sàng quay lại phiên tập trung tiếp theo.", { duration: 6000 });
              setMode("focus");
              setCustomMinutes(25);
              setTotalDuration(25 * 60);
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, mode]);

  // Điều khiển âm thanh môi trường
  const toggleSound = (key: 'rain' | 'waves' | 'fireplace' | 'focus') => {
    const current = soundStates[key];
    const newActive = !current.active;

    setSoundStates(prev => ({
      ...prev,
      [key]: { ...prev[key], active: newActive }
    }));

    if (newActive) {
      const vol = current.volume / 100;
      if (key === 'rain') ambientAudio.startRain(vol);
      else if (key === 'waves') ambientAudio.startWaves(vol);
      else if (key === 'fireplace') ambientAudio.startFireplace(vol);
      else if (key === 'focus') ambientAudio.startDeepFocus(vol);
    } else {
      ambientAudio.stopSound(key);
    }
  };

  const handleVolumeChange = (key: 'rain' | 'waves' | 'fireplace' | 'focus', val: number) => {
    setSoundStates(prev => ({
      ...prev,
      [key]: { ...prev[key], volume: val }
    }));
    ambientAudio.setVolume(key, val / 100);
  };

  const stopAllAmbient = () => {
    ambientAudio.stopAll();
    setSoundStates({
      rain: { active: false, volume: 50 },
      waves: { active: false, volume: 50 },
      fireplace: { active: false, volume: 40 },
      focus: { active: false, volume: 50 },
    });
  };

  const applyPreset = (preset: 'rainyNight' | 'coastalSunset') => {
    stopAllAmbient();
    if (preset === 'rainyNight') {
      ambientAudio.startRain(0.6);
      ambientAudio.startFireplace(0.3);
      setSoundStates({
        rain: { active: true, volume: 60 },
        waves: { active: false, volume: 50 },
        fireplace: { active: true, volume: 30 },
        focus: { active: false, volume: 50 },
      });
      toast.success("Đã bật Preset: Mưa đêm ấm áp 🌧️🔥");
    } else if (preset === 'coastalSunset') {
      ambientAudio.startWaves(0.65);
      ambientAudio.startDeepFocus(0.3);
      setSoundStates({
        rain: { active: false, volume: 50 },
        waves: { active: true, volume: 65 },
        fireplace: { active: false, volume: 40 },
        focus: { active: true, volume: 30 },
      });
      toast.success("Đã bật Preset: Sóng biển hoàng hôn 🌊🧘");
    }
  };

  const switchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    const mins = newMode === "focus" ? 25 : newMode === "shortBreak" ? 5 : 15;
    setCustomMinutes(mins);
    setTotalDuration(mins * 60);
    setTimeLeft(mins * 60);
  };

  const handleSetMinutes = (mins: number) => {
    const validMins = Math.max(1, Math.min(360, mins));
    setCustomMinutes(validMins);
    setTotalDuration(validMins * 60);
    setTimeLeft(validMins * 60);
    setIsRunning(false);
  };

  const adjustMinutes = (delta: number) => {
    const newMins = Math.max(1, Math.min(360, customMinutes + delta));
    handleSetMinutes(newMins);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;
  const activeSoundsCount = Object.values(soundStates).filter(s => s.active).length;

  if (!isOpen) return null;

  // 1. THANH TIỆN ÍCH NỔI KHI THU NHỎ (MINIMIZED FLOATING PILL)
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-3 px-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
          <span className="font-mono text-base font-bold tracking-tight">{formatTime(timeLeft)}</span>
          <span className="text-xs text-slate-400 font-medium">({mode === 'focus' ? 'Học tập' : 'Nghỉ ngơi'})</span>
        </div>

        {activeSoundsCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-blue-300 font-medium">
            <Volume2 size={12} />
            <span>{activeSoundsCount} âm nền</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsRunning(!isRunning)} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title={isRunning ? "Tạm dừng" : "Tiếp tục"}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button 
            onClick={() => setIsMinimized(false)} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Mở rộng"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 2. CỬA SỔ PHÒNG HỌC TẬP TRUNG TOÀN NĂNG (FULL FOCUS HUB)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Nền tối tĩnh lặng */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" 
        onClick={() => setIsMinimized(true)}
      />

      {/* Khung chính phòng học tập trung */}
      <div className="relative w-full max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        
        {/* Header phòng học */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                Không gian Học tập Đắm chìm
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  FOCUS STUDIO
                </span>
              </h2>
              <p className="text-xs text-slate-400">Pomodoro đếm ngược kết hợp Bộ trộn âm thanh thư giãn</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="Thu nhỏ thành thanh nổi"
            >
              <Minimize2 size={16} />
            </button>
            <button 
              onClick={() => { stopAllAmbient(); setIsOpen(false); }}
              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-white/10 transition-colors"
              title="Thoát phòng học"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thân phòng học chia làm 2 cột: Cột 1 Pomodoro & Mục tiêu, Cột 2 Bộ trộn âm thanh */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI (7 CỘT): ĐỒNG HỒ POMODORO & MỤC TIÊU */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            
            {/* Chuyển chế độ: Focus / Short Break / Long Break */}
            <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
              <button
                onClick={() => switchMode("focus")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "focus" 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🎯 Tập trung (25p)
              </button>
              <button
                onClick={() => switchMode("shortBreak")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "shortBreak" 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ☕ Nghỉ ngắn (5p)
              </button>
              <button
                onClick={() => switchMode("longBreak")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  mode === "longBreak" 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🌴 Nghỉ dài (15p)
              </button>
            </div>

            {/* Màn hình hiển thị thời gian số to bản */}
            <div className="text-center py-6 px-4 bg-slate-950/60 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center">
              {/* Vạch tiến trình */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              ></div>

              <span className="font-mono text-6xl sm:text-7xl font-extrabold tracking-tighter text-white drop-shadow-md">
                {formatTime(timeLeft)}
              </span>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-2">
                {mode === "focus" ? "Đang trong phiên tập trung sâu" : "Thả lỏng cơ thể & hít thở sâu"}
              </p>

              {/* Bộ điều khiển tùy chỉnh số phút linh hoạt */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 z-10">
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-semibold text-slate-400">Thời lượng:</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="360" 
                    value={customMinutes} 
                    onChange={(e) => handleSetMinutes(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                    className="w-12 text-center bg-slate-800 text-blue-400 font-bold text-xs rounded border border-slate-700 py-0.5 outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] font-bold text-slate-400">phút</span>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => adjustMinutes(-5)} 
                    disabled={customMinutes <= 5}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                    title="Giảm 5 phút"
                  >
                    -5p
                  </button>
                  <button 
                    onClick={() => adjustMinutes(5)} 
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                    title="Tăng 5 phút"
                  >
                    +5p
                  </button>
                  <button 
                    onClick={() => adjustMinutes(15)} 
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                    title="Tăng 15 phút"
                  >
                    +15p
                  </button>
                </div>
              </div>

              {/* Các mốc thời gian phổ biến */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[11px] z-10">
                <span className="text-slate-500 text-[10px]">Mốc nhanh:</span>
                {[15, 25, 45, 60, 90, 120].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleSetMinutes(mins)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      customMinutes === mins && !isRunning
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {mins}p
                  </button>
                ))}
              </div>

              {/* Nút điều khiển Timer */}
              <div className="flex items-center gap-3 mt-6 z-10">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95 ${
                    isRunning 
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20" 
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                  }`}
                >
                  {isRunning ? <><Pause size={18} /> Tạm dừng</> : <><Play size={18} /> Bắt đầu ngay</>}
                </button>
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setTimeLeft(totalDuration);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                  title="Đặt lại thời gian"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            {/* Mục tiêu phiên học (Session Goal) */}
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Target size={14} className="text-blue-400" />
                <span>MỤC TIÊU PHIÊN NÀY</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setGoalCompleted(!goalCompleted)}
                  className={`p-1 rounded-lg transition-colors ${goalCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
                <input
                  type="text"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  placeholder="Ví dụ: Đọc hết chương 2 tài liệu Giải tích..."
                  className={`w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-slate-500 ${
                    goalCompleted ? 'line-through text-slate-500' : 'text-white'
                  }`}
                />
              </div>
            </div>

          </div>

          {/* CỘT PHẢI (5 CỘT): BỘ TRỘN ÂM THANH MÔI TRƯỜNG (AMBIENT MIXER) */}
          <div className="md:col-span-5 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5">
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Headphones size={16} className="text-indigo-400" />
                  Bộ trộn Âm thanh (Mixer)
                </h3>
                {activeSoundsCount > 0 && (
                  <button 
                    onClick={stopAllAmbient}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <VolumeX size={12} /> Tắt hết
                  </button>
                )}
              </div>

              {/* Danh sách 4 âm thanh môi trường */}
              <div className="space-y-4">
                {/* 1. Mưa rào */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => toggleSound('rain')}
                      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                        soundStates.rain.active ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CloudRain size={16} />
                      <span>Mưa rào nhẹ nhàng</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">{soundStates.rain.volume}%</span>
                  </div>
                  {soundStates.rain.active && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={soundStates.rain.volume}
                      onChange={(e) => handleVolumeChange('rain', Number(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  )}
                </div>

                {/* 2. Sóng biển */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => toggleSound('waves')}
                      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                        soundStates.waves.active ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Waves size={16} />
                      <span>Sóng biển dạt dào</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">{soundStates.waves.volume}%</span>
                  </div>
                  {soundStates.waves.active && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={soundStates.waves.volume}
                      onChange={(e) => handleVolumeChange('waves', Number(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  )}
                </div>

                {/* 3. Lửa trại */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => toggleSound('fireplace')}
                      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                        soundStates.fireplace.active ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Flame size={16} />
                      <span>Lửa trại tí tách</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">{soundStates.fireplace.volume}%</span>
                  </div>
                  {soundStates.fireplace.active && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={soundStates.fireplace.volume}
                      onChange={(e) => handleVolumeChange('fireplace', Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  )}
                </div>

                {/* 4. Deep Focus (Tiếng ồn trắng chặn tạp âm) */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => toggleSound('focus')}
                      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                        soundStates.focus.active ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles size={16} />
                      <span>Âm sâu chặn tạp âm</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">{soundStates.focus.volume}%</span>
                  </div>
                  {soundStates.focus.active && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={soundStates.focus.volume}
                      onChange={(e) => handleVolumeChange('focus', Number(e.target.value))}
                      className="w-full accent-violet-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Presets chọn nhanh */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Gợi ý phối âm</p>
              <div className="flex gap-2">
                <button
                  onClick={() => applyPreset('rainyNight')}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                >
                  🌧️ Mưa đêm
                </button>
                <button
                  onClick={() => applyPreset('coastalSunset')}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors border border-slate-700"
                >
                  🌊 Sóng biển
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer ghi chú */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Âm thanh chạy trực tiếp trên trình duyệt, không tốn dung lượng mạng
          </span>
          <button 
            onClick={() => setIsMinimized(true)}
            className="text-blue-400 hover:text-blue-300 font-semibold"
          >
            Thu nhỏ thanh nổi để vừa học vừa duyệt web →
          </button>
        </div>

      </div>
    </div>
  );
}
