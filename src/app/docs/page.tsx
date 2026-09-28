"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, ExternalLink, File, FileText, Folder, FolderPlus, FileStack, X, Link as LinkIcon, Share2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { getDocs, getUploadUrl, addRecord, deleteRecord, getCategories, addCategory, deleteCategory, createShareLink } from "@/app/actions/data";

export default function DocsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [uploadCategory, setUploadCategory] = useState('Chung');
  
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Trạng thái cho Thêm Link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Trạng thái AI Tóm tắt
  const [summaryModal, setSummaryModal] = useState<{isOpen: boolean, title: string, content: string, loading: boolean}>({isOpen: false, title: '', content: '', loading: false});

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
    fetchDocs(); 
    fetchCategories();
  }, []);

  const handleSummary = async (doc: any) => {
    setSummaryModal({ isOpen: true, title: doc.title, content: doc.ai_summary || '', loading: !doc.ai_summary });
    if (!doc.ai_summary) {
      try {
        const { generateDocSummary } = await import('@/app/actions/ai');
        const resAi = await generateDocSummary(doc.id, doc.type, doc.type === 'link' ? doc.url : doc.url); // doc.url is the path for pdf
        if (resAi.success) {
          setSummaryModal(prev => ({ ...prev, content: resAi.data || '', loading: false }));
          fetchDocs(); // reload docs to get saved summary
        } else {
          setSummaryModal(prev => ({ ...prev, content: 'Lỗi AI: ' + resAi.error, loading: false }));
        }
      } catch (e: any) {
        setSummaryModal(prev => ({ ...prev, content: 'Lỗi Client: ' + e.message, loading: false }));
      }
    }
  };

  const handleShare = async (id: string, type: 'photo' | 'doc') => {
    const toastId = toast.loading("Đang tạo liên kết chia sẻ...");
    try {
      const shareId = await createShareLink(type, id);
      const url = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link chia sẻ vào khay nhớ tạm!", { id: toastId });
    } catch (e: any) {
      toast.error("Lỗi: " + e.message, { id: toastId });
    }
  };

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const data = await getDocs();
      setDocs(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (newCatName.trim() === 'Chung' || newCatName.trim() === 'Tất cả') {
      toast.error("Tên chủ đề này đã được hệ thống giữ lại.");
      return;
    }
    
    const loadingToast = toast.loading("Đang tạo chủ đề...");
    try {
      await addCategory(newCatName.trim());
      toast.success("Tạo thành công!", { id: loadingToast });
      setNewCatName('');
      setIsAddingCat(false);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa chủ đề "${name}"? Các tài liệu bên trong sẽ được dời về mục Chung.`)) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteCategory(id, name);
      toast.success("Đã xóa chủ đề!", { id: loadingToast });
      if (activeCategory === name) setActiveCategory('Tất cả');
      if (uploadCategory === name) setUploadCategory('Chung');
      fetchDocs();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
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

      // --- Tích hợp Trợ lý AI Phân loại ---
      let autoCategory = uploadCategory;
      try {
        toast.loading(`Trợ lý AI đang đọc và phân loại tệp...`, { id: loadingToast });
        const { categorizeDoc } = await import('@/app/actions/ai');
        const resAi = await categorizeDoc(file.name);
        if (resAi.success && resAi.data && resAi.data.length < 20) {
          autoCategory = resAi.data;
        }
      } catch (aiError) {
        console.error("AI Error:", aiError);
      }

      const { signedUrl, fullPath } = await getUploadUrl(fileName);

      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' }
      });
      if (!res.ok) throw new Error("Tải lên thất bại");

      await addRecord('documents', { 
        title: file.name, 
        type: fileExt || 'unknown', 
        url: fullPath,
        category: autoCategory
      });

      toast.success(`Tải tài liệu thành công! AI đã xếp vào: ${autoCategory}`, { id: loadingToast });
      fetchDocs();
      fetchCategories();
    } catch (error: any) {
      toast.error("Lỗi tải lên: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    const loadingToast = toast.loading(`Đang lưu đường dẫn vào ${uploadCategory}...`);
    
    try {
      let autoCategory = uploadCategory;
      try {
        toast.loading(`Trợ lý AI đang phân loại liên kết...`, { id: loadingToast });
        const { categorizeDoc } = await import('@/app/actions/ai');
        const resAi = await categorizeDoc(linkTitle || finalUrl);
        if (resAi.success && resAi.data && resAi.data.length < 20) {
          autoCategory = resAi.data;
        }
      } catch (aiError) {
        console.error("AI Error:", aiError);
      }

      await addRecord('documents', { 
        title: linkTitle.trim() || finalUrl, 
        type: 'link', 
        url: finalUrl,
        category: autoCategory
      });

      toast.success(`Đã lưu Link! AI đã xếp vào: ${autoCategory}`, { id: loadingToast });
      setLinkTitle('');
      setLinkUrl('');
      setIsAddingLink(false);
      fetchDocs();
      fetchCategories();
    } catch (error: any) {
      toast.error("Lỗi khi lưu: " + error.message, { id: loadingToast });
    }
  };

  const handleDeleteDoc = async (id: string, path: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này vĩnh viễn?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('documents', id, path);
      toast.success("Đã xóa!", { id: loadingToast });
      fetchDocs();
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  const handleCategoryClick = (name: string) => {
    setActiveCategory(name);
    if (name !== 'Tất cả') {
      setUploadCategory(name);
    } else {
      setUploadCategory('Chung');
    }
  };

  const filteredDocs = activeCategory === 'Tất cả' 
    ? docs 
    : docs.filter(doc => (doc.category || 'Chung') === activeCategory);

  const allCategoryNames = ['Chung', ...categories.map(c => c.name)];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Tài liệu & Bài giảng</h1>
          <p className="text-slate-500 mt-1 font-medium">Lưu trữ và phân loại kiến thức của bạn</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <select 
            value={uploadCategory} 
            onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-slate-50 border-none text-slate-600 font-bold text-sm rounded-xl py-2.5 px-4 outline-none cursor-pointer focus:ring-2 focus:ring-blue-100 min-w-[120px]"
          >
            {allCategoryNames.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <LinkIcon size={18} /> Thêm Link
          </button>

          <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-2">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2"><Upload size={18} /> Đang tải...</span>
            ) : (
              <><Upload size={18} /> Tải File</>
            )}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {isAddingLink && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-3 items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shrink-0 shadow-sm border border-blue-100">
            <LinkIcon size={18} />
          </div>
          <form onSubmit={handleAddLink} className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <input 
              type="text" 
              placeholder="Tiêu đề (Tùy chọn)" 
              value={linkTitle}
              onChange={e => setLinkTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-sm font-medium"
            />
            <input 
              type="text" 
              placeholder="Dán đường dẫn (https://...)" 
              required
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="flex-[2] px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-200 text-sm font-medium"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">Lưu</button>
              <button type="button" onClick={() => setIsAddingLink(false)} className="bg-white hover:bg-slate-100 text-slate-500 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 transition-all">Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Thư mục */}
        <div className="w-full md:w-64 flex flex-col gap-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 shrink-0 md:sticky md:top-6">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Thư viện</h3>
          
          <button
            onClick={() => handleCategoryClick('Tất cả')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeCategory === 'Tất cả' ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <FileStack size={18} className={activeCategory === 'Tất cả' ? "text-blue-500" : "text-slate-400"} />
            Tất cả tài liệu
            <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs">{docs.length}</span>
          </button>

          <button
            onClick={() => handleCategoryClick('Chung')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeCategory === 'Chung' ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <Folder size={18} className={activeCategory === 'Chung' ? "text-blue-500" : "text-slate-400"} />
            Chung
            <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs">{docs.filter(d => (d.category || 'Chung') === 'Chung').length}</span>
          </button>

          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-4">Chủ đề của bạn</h3>
          
          {categories.map(category => (
            <div key={category.id} className="group relative">
              <button
                onClick={() => handleCategoryClick(category.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm w-full text-left ${
                  activeCategory === category.name ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <Folder size={18} className={activeCategory === category.name ? "text-blue-500" : "text-slate-400"} />
                <span className="truncate max-w-[120px]">{category.name}</span>
                <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs group-hover:opacity-0 transition-opacity">
                  {docs.filter(d => d.category === category.name).length}
                </span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id, category.name); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm"
                title="Xóa chủ đề"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {isAddingCat ? (
            <form onSubmit={handleAddCategory} className="mt-2 p-2 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center">
              <input
                autoFocus
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Tên chủ đề..."
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none px-2"
              />
              <button type="button" onClick={() => setIsAddingCat(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              <button type="submit" className="p-1 text-blue-500 hover:text-blue-700 font-bold ml-1">OK</button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingCat(true)}
              className="flex items-center gap-2 px-4 py-3 mt-2 rounded-2xl transition-all font-bold text-sm text-blue-500 hover:bg-blue-50 border border-dashed border-blue-200"
            >
              <FolderPlus size={18} />
              Thêm chủ đề
            </button>
          )}
        </div>

        {/* Danh sách tài liệu */}
        <div className="flex-1 w-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-sm">
                  <th className="p-5 font-bold text-slate-500">Tên tài liệu / Link</th>
                  <th className="p-5 font-bold text-slate-500 w-32">Chủ đề</th>
                  <th className="p-5 font-bold text-slate-500 w-32">Ngày đăng</th>
                  <th className="p-5 font-bold text-slate-500 text-right w-24">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-5">
                      <div className="flex flex-col gap-4 w-full">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
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
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border shrink-0 ${doc.type === 'link' ? 'bg-indigo-50 text-indigo-500 border-indigo-100/50' : 'bg-blue-50 text-blue-500 border-blue-100/50'}`}>
                        {doc.type === 'link' ? <LinkIcon size={20} /> : (doc.type === 'pdf' ? <File size={20} /> : <FileText size={20} />)}
                      </div>
                      <span className="truncate max-w-sm block" title={doc.title}>{doc.title}</span>
                    </td>
                    <td className="p-5 text-slate-500 text-sm font-bold">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs">{doc.category || 'Chung'}</span>
                    </td>
                    <td className="p-5 text-slate-400 text-sm font-medium">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleSummary(doc)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors" title="AI Tóm tắt">
                          <Sparkles size={18} />
                        </button>
                        <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" title="Xem/Truy cập">
                          <ExternalLink size={18} />
                        </a>
                        <button onClick={() => handleShare(doc.id, 'doc')} className="p-2 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors" title="Chia sẻ">
                          <Share2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc.id, doc.url)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Xóa">
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

      {/* Modal Tóm tắt AI */}
      {summaryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xl truncate max-w-[250px]">{summaryModal.title}</h3>
              </div>
              <button onClick={() => setSummaryModal({ ...summaryModal, isOpen: false })} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-6 border border-slate-100 relative">
              {summaryModal.loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <Sparkles className="text-emerald-400 animate-pulse" size={40} />
                  <p className="text-slate-500 font-bold animate-pulse text-sm">Trợ lý AI đang đọc và phân tích...</p>
                </div>
              ) : (
                <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap text-sm">
                  {summaryModal.content}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
