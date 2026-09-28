"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, ExternalLink, File, FileText, Folder, BookOpen, Calculator, Code, Globe, FileStack } from "lucide-react";
import toast from "react-hot-toast";
import { getDocs, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";

const CATEGORIES = [
  { id: 'Tất cả', name: 'Tất cả tài liệu', icon: <FileStack size={18} /> },
  { id: 'Toán học', name: 'Toán học', icon: <Calculator size={18} /> },
  { id: 'Lập trình', name: 'Lập trình', icon: <Code size={18} /> },
  { id: 'Ngoại ngữ', name: 'Ngoại ngữ', icon: <Globe size={18} /> },
  { id: 'Chuyên ngành', name: 'Chuyên ngành', icon: <BookOpen size={18} /> },
  { id: 'Chung', name: 'Chung', icon: <Folder size={18} /> },
];

export default function DocsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [uploadCategory, setUploadCategory] = useState('Chung');

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      const data = await getDocs();
      setDocs(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const loadingToast = toast.loading(`Đang tải lên thư mục ${uploadCategory}...`);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `docs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { signedUrl, fullPath } = await getUploadUrl(fileName);

      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      });
      if (!res.ok) throw new Error("Tải lên thất bại do mạng hoặc bị chặn");

      // Ghi thông tin có kèm theo Category
      await addRecord('documents', { 
        title: file.name, 
        type: fileExt || 'unknown', 
        url: fullPath,
        category: uploadCategory
      });

      toast.success("Tải tài liệu thành công!", { id: loadingToast });
      fetchDocs();
    } catch (error: any) {
      toast.error("Lỗi tải lên: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này vĩnh viễn?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('documents', id, path);
      toast.success("Đã xóa tài liệu!", { id: loadingToast });
      fetchDocs();
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  // Lọc tài liệu theo môn học
  const filteredDocs = activeCategory === 'Tất cả' 
    ? docs 
    : docs.filter(doc => doc.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tài liệu & Bài giảng</h1>
          <p className="text-slate-500 mt-1 font-medium">Lưu trữ và phân loại kiến thức của bạn</p>
        </div>
        
        {/* Khu vực Upload */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <select 
            value={uploadCategory} 
            onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-slate-50 border-none text-slate-600 font-medium text-sm rounded-xl py-2.5 px-4 outline-none cursor-pointer focus:ring-2 focus:ring-blue-100"
          >
            {CATEGORIES.filter(c => c.id !== 'Tất cả').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-2">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2"><Upload size={18} /> Đang tải...</span>
            ) : (
              <><Upload size={18} /> Tải tài liệu lên</>
            )}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Thư mục */}
        <div className="w-full md:w-64 flex flex-col gap-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 shrink-0 sticky top-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Môn học / Chủ đề</h3>
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeCategory === category.id 
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent"
              }`}
            >
              <span className={`${activeCategory === category.id ? "text-blue-500" : "text-slate-400"}`}>
                {category.icon}
              </span>
              {category.name}
              
              {/* Hiển thị số lượng (nếu muốn) */}
              {category.id !== 'Tất cả' && (
                <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs">
                  {docs.filter(d => (d.category || 'Chung') === category.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Danh sách tài liệu */}
        <div className="flex-1 w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-sm">
                  <th className="p-5 font-bold text-slate-500">Tên tài liệu</th>
                  <th className="p-5 font-bold text-slate-500 w-32">Chủ đề</th>
                  <th className="p-5 font-bold text-slate-500 w-32">Ngày đăng</th>
                  <th className="p-5 font-bold text-slate-500 text-right w-24">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <Folder size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">Chưa có tài liệu nào trong thư mục này.</p>
                    </td>
                  </tr>
                ) : filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5 flex items-center gap-4 text-slate-700 font-bold">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100/50 shrink-0">
                        {doc.type === 'pdf' ? <File size={20} /> : <FileText size={20} />}
                      </div>
                      <span className="truncate max-w-sm block" title={doc.title}>{doc.title}</span>
                    </td>
                    <td className="p-5 text-slate-500 text-sm font-bold">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs">{doc.category || 'Chung'}</span>
                    </td>
                    <td className="p-5 text-slate-400 text-sm font-medium">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="Xem/Tải">
                          <ExternalLink size={18} />
                        </a>
                        <button onClick={() => handleDelete(doc.id, doc.url)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Xóa">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
