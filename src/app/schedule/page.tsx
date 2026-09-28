"use client";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Trash2, Plus, X, ListTodo, AlertCircle, ChevronLeft, ChevronRight, LayoutList, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { getSchedules, addSchedule, updateScheduleStatus, deleteSchedule } from "@/app/actions/data";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Trạng thái Form thêm lịch & Xem chi tiết ngày
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("blue");

  const colors = [
    { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', solid: 'bg-blue-500 text-white' },
    { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', solid: 'bg-purple-500 text-white' },
    { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', solid: 'bg-pink-500 text-white' },
    { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', solid: 'bg-orange-500 text-white' },
    { id: 'green', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', solid: 'bg-emerald-500 text-white' },
  ];

  useEffect(() => { 
    fetchSchedules(); 
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const loadingToast = toast.loading("Đang lên lịch...");
    try {
      await addSchedule({
        title,
        description,
        date,
        start_time: startTime,
        end_time: endTime,
        color
      });

      toast.success("Đã thêm lịch học!", { id: loadingToast });
      setTitle("");
      setDescription("");
      setIsAdding(false);
      fetchSchedules();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setSchedules(schedules.map(s => s.id === id ? { ...s, is_completed: !currentStatus } : s));
      await updateScheduleStatus(id, !currentStatus);
      if (!currentStatus) toast.success("Hoàn thành xuất sắc! 🎉");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
      fetchSchedules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch này không?")) return;
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteSchedule(id);
      toast.success("Đã xóa!", { id: loadingToast });
      fetchSchedules();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    }
  };

  const groupedSchedules = schedules.reduce((acc: any, curr: any) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Lịch Tháng Logic
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const todayDateStr = new Date().toISOString().split('T')[0];

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1; // T2 là đầu tuần

    const cells = [];
    
    // Header Ngày trong tuần
    const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    daysOfWeek.forEach(d => {
      cells.push(<div key={d} className="text-center text-xs font-extrabold text-slate-400 py-2 uppercase tracking-widest">{d}</div>);
    });

    // Ô trống đầu tháng
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/50 rounded-2xl border border-transparent"></div>);
    }

    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySchedules = groupedSchedules[dateStr] || [];
      const isToday = dateStr === todayDateStr;

      cells.push(
        <div 
          key={day} 
          onClick={() => setViewingDay(dateStr)} // SỬA ĐỔI: BẤM VÀO SẼ MỞ BẢNG CHI TIẾT NGÀY
          className={`min-h-[120px] bg-white border rounded-2xl p-2 transition-all cursor-pointer group hover:shadow-md ${isToday ? 'border-blue-400 ring-2 ring-blue-100 ring-offset-1' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1.5 ${isToday ? 'bg-blue-500 text-white shadow-sm shadow-blue-200' : 'text-slate-600 group-hover:text-blue-500'}`}>
            {day}
          </div>
          
          <div className="space-y-1.5 overflow-hidden">
            {daySchedules.map((s: any) => {
              const col = colors.find(c => c.id === s.color) || colors[0];
              return (
                <div 
                  key={s.id} 
                  onClick={(e) => { e.stopPropagation(); setViewingDay(dateStr); }}
                  className={`text-xs p-1.5 px-2 rounded-lg truncate font-bold transition-all ${s.is_completed ? 'opacity-40 line-through bg-slate-100 text-slate-500' : col.solid} hover:brightness-110 shadow-sm`}
                  title={`${s.start_time.substring(0,5)} - ${s.title}`}
                >
                  {s.start_time.substring(0,5)} {s.title}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 capitalize">
            Tháng {currentMonth.getMonth() + 1} - {currentMonth.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl transition-colors">Hôm nay</button>
            <button onClick={nextMonth} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full relative pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kế hoạch học tập</h1>
          <p className="text-slate-500 mt-1 font-medium">Lên lịch theo phong cách Google Calendar</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex bg-slate-50 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CalendarDays size={16} /> Lịch tháng
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'timeline' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutList size={16} /> Trục thời gian
            </button>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 ml-2"
          >
            <Plus size={18} /> Thêm sự kiện
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-[600px] bg-white rounded-3xl animate-pulse border border-slate-100 flex items-center justify-center">
          <div className="text-blue-400 font-bold flex items-center gap-2"><Clock className="animate-spin" /> Đang tải lịch học...</div>
        </div>
      ) : (
        viewMode === 'calendar' ? renderCalendar() : (
          /* Danh sách Lịch học hiển thị dưới dạng Timeline */
          <div className="w-full bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[500px]">
            {sortedDates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-300 mb-6">
                  <ListTodo size={48} />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-700 mb-2">Chưa có kế hoạch nào</h3>
                <p className="text-slate-500 font-medium max-w-sm">Hãy tự tạo cho mình một lịch trình học tập để theo dõi tiến độ dễ dàng hơn.</p>
                <button onClick={() => setIsAdding(true)} className="mt-6 text-blue-600 font-bold hover:underline">Bắt đầu lên lịch ngay</button>
              </div>
            ) : (
              <div className="space-y-10">
                {sortedDates.map(date => {
                  const dObj = new Date(date);
                  const todayStr = new Date().toISOString().split('T')[0];
                  let dateLabel = dObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
                  if (date === todayStr) dateLabel = "Hôm nay";

                  return (
                    <div key={date} className="relative">
                      <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                        <div className="h-8 w-1.5 bg-blue-500 rounded-full"></div>
                        <h2 className="text-lg font-extrabold text-slate-800 capitalize">{dateLabel}</h2>
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                          {date.split('-').reverse().join('/')}
                        </span>
                      </div>

                      <div className="pl-4 space-y-4 relative before:absolute before:inset-y-0 before:left-[21px] before:w-0.5 before:bg-slate-100">
                        {groupedSchedules[date].map((schedule: any) => {
                          const col = colors.find(c => c.id === schedule.color) || colors[0];
                          const isPast = new Date(`${schedule.date}T${schedule.end_time}`) < new Date();
                          
                          return (
                            <div key={schedule.id} className="relative pl-8 group">
                              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white ${schedule.is_completed ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                              
                              <div className={`flex items-start md:items-center justify-between p-4 rounded-2xl border transition-all ${
                                schedule.is_completed ? 'bg-slate-50 border-slate-100 opacity-60' : `bg-white ${col.border} hover:shadow-md`
                              }`}>
                                <div className="flex items-start gap-4">
                                  <button onClick={() => handleToggleStatus(schedule.id, schedule.is_completed)} className={`mt-1 md:mt-0 transition-colors ${schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}>
                                    {schedule.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                  </button>
                                  <div>
                                    <h4 className={`font-extrabold text-base mb-1 ${schedule.is_completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>{schedule.title}</h4>
                                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${schedule.is_completed ? 'bg-slate-200' : col.bg} ${schedule.is_completed ? '' : col.text}`}>
                                        <Clock size={14} /> {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)}
                                      </span>
                                      {!schedule.is_completed && isPast && <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-lg"><AlertCircle size={14} /> Quá hạn</span>}
                                    </div>
                                    {schedule.description && <p className={`mt-2 text-sm font-medium ${schedule.is_completed ? 'text-slate-400' : 'text-slate-600'}`}>{schedule.description}</p>}
                                  </div>
                                </div>
                                <button onClick={() => handleDelete(schedule.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 absolute right-4 top-1/2 -translate-y-1/2" title="Xóa"><Trash2 size={18} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {/* MODAL XEM CHI TIẾT NGÀY (DAY VIEW) */}
      {viewingDay && !isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingDay(null)}>
          <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl capitalize">
                  {new Date(viewingDay).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Lịch trình chi tiết</p>
              </div>
              <button onClick={() => setViewingDay(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {(groupedSchedules[viewingDay] || []).length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><CalendarIcon size={24} /></div>
                  <p className="text-slate-500 font-bold">Bạn hoàn toàn rảnh rỗi vào ngày này!</p>
                </div>
              ) : (
                (groupedSchedules[viewingDay] || []).map((schedule: any) => {
                  const col = colors.find(c => c.id === schedule.color) || colors[0];
                  return (
                    <div key={schedule.id} className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${schedule.is_completed ? 'bg-slate-50 border-slate-100 opacity-60' : `bg-white ${col.border}`}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => handleToggleStatus(schedule.id, schedule.is_completed)} className={`mt-0.5 transition-colors ${schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}>
                          {schedule.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                        </button>
                        <div>
                          <h4 className={`font-extrabold text-sm mb-1 ${schedule.is_completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>{schedule.title}</h4>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${col.bg} ${col.text}`}>
                            <Clock size={12} /> {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(schedule.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              onClick={() => { setDate(viewingDay); setViewingDay(null); setIsAdding(true); }}
              className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Thêm sự kiện mới
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM LỊCH HỌC BẬT LÊN Ở GIỮA */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xl">Thêm Sự Kiện</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên công việc / Sự kiện</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)} autoFocus
                  placeholder="VD: Ôn tập Giải tích..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày thực hiện</label>
                <input 
                  type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bắt đầu</label>
                  <input 
                    type="time" required value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kết thúc</label>
                  <input 
                    type="time" required value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chi tiết (Tùy chọn)</label>
                <textarea 
                  rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Màu sắc đánh dấu</label>
                <div className="flex gap-3">
                  {colors.map(c => (
                    <button 
                      key={c.id} type="button" onClick={() => setColor(c.id)}
                      className={`w-10 h-10 rounded-full ${c.solid} ring-4 transition-all ${color === c.id ? 'ring-slate-200 scale-110 shadow-md' : 'ring-transparent scale-100 hover:scale-105'}`}
                    ></button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-600/30">
                Lưu sự kiện
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
