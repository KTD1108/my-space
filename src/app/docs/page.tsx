"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, ExternalLink, File, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { getDocs, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";

export default function DocsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

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
    const loadingToast = toast.loading("Đang tải tài liệu lên an toàn...");
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `docs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // 1. Lấy URL được ký điện tử từ Máy chủ
      const { signedUrl, fullPath } = await getUploadUrl(fileName);

      // 2. Tải trực tiếp lên theo đường dẫn đã được Máy chủ bảo lãnh
      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      });
      if (!res.ok) throw new Error("Tải lên thất bại do mạng hoặc bị chặn");

      // 3. Ghi thông tin vào CSDL qua Máy chủ
      await addRecord('documents', { title: file.name, type: fileExt || 'unknown', url: fullPath });

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

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Tài liệu & Bài giảng</h1>
          <p className="text-slate-500 mt-1">Đã bật khiên bảo vệ cấp độ Máy chủ</p>
        </div>
        <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-2">
          {uploading ? (
            <span className="animate-pulse">Đang tải...</span>
          ) : (
            <><Upload size={18} /> Tải tài liệu lên</>
          )}
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-sm">
                <th className="p-5 font-semibold text-slate-600">Tên tài liệu</th>
                <th className="p-5 font-semibold text-slate-600 w-24">Loại</th>
                <th className="p-5 font-semibold text-slate-600 w-32">Ngày đăng</th>
                <th className="p-5 font-semibold text-slate-600 text-right w-32">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docs.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Chưa có tài liệu nào.</td></tr>
              ) : docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-5 flex items-center gap-3 text-slate-800 font-medium">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                      {doc.type === 'pdf' ? <File size={20} /> : <FileText size={20} />}
                    </div>
                    <span className="truncate max-w-sm" title={doc.title}>{doc.title}</span>
                  </td>
                  <td className="p-5 text-slate-500 text-sm font-medium uppercase">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs">{doc.type}</span>
                  </td>
                  <td className="p-5 text-slate-500 text-sm">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem (Có hạn 24h)">
                        <ExternalLink size={18} />
                      </a>
                      <button onClick={() => handleDelete(doc.id, doc.url)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
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
  );
}
