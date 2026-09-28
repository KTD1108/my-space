"use client";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Trash2, Plus, X, ListTodo, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getSchedules, addSchedule, updateScheduleStatus, deleteSchedule } from "@/app/actions/data";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Trạng thái Form thêm lịch
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("blue");

  const colors = [
    { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
    { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    { id: 'green', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
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
      // Cập nhật giao diện ngay lập tức (Optimistic UI)
      setSchedules(schedules.map(s => s.id === id ? { ...s, is_completed: !currentStatus } : s));
      
      // Gọi API cập nhật
      await updateScheduleStatus(id, !currentStatus);
      if (!currentStatus) toast.success("Hoàn thành xuất sắc! 🎉");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
      fetchSchedules(); // Phục hồi dữ liệu nếu lỗi
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

  // Nhóm lịch học theo ngày
  const groupedSchedules = schedules.reduce((acc: any, curr: any) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedSchedules).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const getFormatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) return "Hôm nay";
    if (d.toDateString() === tomorrow.toDateString()) return "Ngày mai";
    
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kế hoạch học tập</h1>
          <p className="text-slate-500 mt-1 font-medium">Quản lý thời gian, bứt phá giới hạn</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? "Đóng" : "Lên lịch mới"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Khung tạo lịch học (Chỉ hiện khi bấm nút) */}
        {isAdding && (
          <div className="w-full lg:w-80 shrink-0 bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-in fade-in slide-in-from-top-4 lg:sticky lg:top-6 z-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <CalendarIcon size={20} />
              </div>
              <h3 className="font-extrabold text-slate-700 text-lg">Lịch mới</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tên công việc / Môn học</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Ôn tập Giải tích..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày thực hiện</label>
                <input 
                  type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bắt đầu</label>
                  <input 
                    type="time" required value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kết thúc</label>
                  <input 
                    type="time" required value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chi tiết (Tùy chọn)</label>
                <textarea 
                  rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Màu sắc phân loại</label>
                <div className="flex gap-2">
                  {colors.map(c => (
                    <button 
                      key={c.id} type="button" onClick={() => setColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} ${c.border} border-2 transition-transform ${color === c.id ? 'scale-125 shadow-sm' : 'scale-100'}`}
                    ></button>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md">
                Lưu lịch học
              </button>
            </form>
          </div>
        )}

        {/* Danh sách Lịch học hiển thị dưới dạng Timeline */}
        <div className="flex-1 w-full bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-16 h-6 bg-slate-100 rounded-md"></div>
                  <div className="flex-1 h-24 bg-slate-50 rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : sortedDates.length === 0 ? (
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
              {sortedDates.map(date => (
                <div key={date} className="relative">
                  {/* Tiêu đề Ngày */}
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                    <div className="h-8 w-1.5 bg-blue-500 rounded-full"></div>
                    <h2 className="text-lg font-extrabold text-slate-800">{getFormatDate(date)}</h2>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                      {date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  {/* Danh sách nhiệm vụ trong ngày */}
                  <div className="pl-4 space-y-4 relative before:absolute before:inset-y-0 before:left-[21px] before:w-0.5 before:bg-slate-100">
                    {groupedSchedules[date].map((schedule: any) => {
                      const col = colors.find(c => c.id === schedule.color) || colors[0];
                      const isPast = new Date(`${schedule.date}T${schedule.end_time}`) < new Date();
                      
                      return (
                        <div key={schedule.id} className="relative pl-8 group">
                          {/* Dấu chấm Timeline */}
                          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white ${schedule.is_completed ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          
                          {/* Thẻ Lịch */}
                          <div className={`flex items-start md:items-center justify-between p-4 rounded-2xl border transition-all ${
                            schedule.is_completed 
                              ? 'bg-slate-50 border-slate-100 opacity-60' 
                              : `bg-white ${col.border} hover:shadow-md`
                          }`}>
                            <div className="flex items-start gap-4">
                              <button 
                                onClick={() => handleToggleStatus(schedule.id, schedule.is_completed)}
                                className={`mt-1 md:mt-0 transition-colors ${schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                              >
                                {schedule.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                              </button>
                              
                              <div>
                                <h4 className={`font-extrabold text-base mb-1 ${schedule.is_completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                  {schedule.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${schedule.is_completed ? 'bg-slate-200' : col.bg} ${schedule.is_completed ? '' : col.text}`}>
                                    <Clock size={14} />
                                    {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)}
                                  </span>
                                  
                                  {!schedule.is_completed && isPast && (
                                    <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-lg"><AlertCircle size={14} /> Quá hạn</span>
                                  )}
                                </div>
                                {schedule.description && (
                                  <p className={`mt-2 text-sm font-medium ${schedule.is_completed ? 'text-slate-400' : 'text-slate-600'}`}>{schedule.description}</p>
                                )}
                              </div>
                            </div>

                            <button 
                              onClick={() => handleDelete(schedule.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 absolute right-4 top-1/2 -translate-y-1/2"
                              title="Xóa"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
