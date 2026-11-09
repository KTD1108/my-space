"use client";
import { useState, useEffect } from "react";
import { 
  Upload, 
  Trash2, 
  ExternalLink, 
  File, 
  FileText, 
  Folder, 
  FolderPlus, 
  FileStack, 
  X, 
  Link as LinkIcon, 
  Share2, 
  Sparkles,
  StickyNote,
  PenSquare,
  Eye,
  Copy,
  Check,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  getDocs, 
  getUploadUrl, 
  addRecord, 
  deleteRecord, 
  getCategories, 
  addCategory, 
  deleteCategory, 
  createShareLink, 
  updateDocCategory,
  saveQuickNote,
  getNoteContent
} from "@/app/actions/data";
import { categorizeDoc, askGeneralAI } from "@/app/actions/ai";
import DocAIStudioModal from "@/components/DocAIStudioModal";

interface DocItem {
  id: string;
  title: string;
  type: string;
  url: string;
  publicUrl?: string;
  category?: string;
  created_at: string;
  ai_summary?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  created_at?: string;
}

const DOCS_CACHE_KEY = 'myspace_docs_cache_v2';
const CATEGORIES_CACHE_KEY = 'myspace_categories_cache_v2';

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(DOCS_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [uploadCategory, setUploadCategory] = useState('Chung');
  
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Trạng thái cho Thêm Link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Trạng thái cho Ghi chú nhanh (Quick Notes)
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('Chung');
  const [noteType, setNoteType] = useState<'note' | 'txt'>('note');
  const [savingNote, setSavingNote] = useState(false);
  const [isAiGeneratingOutline, setIsAiGeneratingOutline] = useState(false);

  // Trạng thái Xem chi tiết Ghi chú (Note Viewer Modal)
  const [viewingNote, setViewingNote] = useState<DocItem | null>(null);
  const [viewingContent, setViewingContent] = useState('');
  const [loadingNoteContent, setLoadingNoteContent] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Trạng thái AI Studio Đột phá (Tóm tắt, Hỏi đáp, Trắc nghiệm, Flashcard)
  const [selectedDocForAI, setSelectedDocForAI] = useState<DocItem | null>(null);
  const [isAIStudioOpen, setIsAIStudioOpen] = useState(false);

  const handleOpenAIStudio = (doc: DocItem) => {
    setSelectedDocForAI(doc);
    setIsAIStudioOpen(true);
  };

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem(DOCS_CACHE_KEY);
    }
    return true;
  });

  useEffect(() => { 
    fetchDocs(); 
    fetchCategories();

    // Mở nhanh modal viết ghi chú nếu truy cập qua link ?action=new-note
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "new-note") {
        setIsAddingNote(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

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
    try {
      const data = await getDocs();
      setDocs(data || []);
      try {
        localStorage.setItem(DOCS_CACHE_KEY, JSON.stringify(data || []));
      } catch {}
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
      try {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(data || []));
      } catch {}
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

  const handleChangeCategory = async (docId: string, newCategory: string) => {
    const loadingToast = toast.loading("Đang chuyển thư mục...");
    try {
      await updateDocCategory(docId, newCategory);
      toast.success("Đã chuyển thành công!", { id: loadingToast });
      fetchDocs();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    }
  };

  const handleOpenNoteViewer = async (doc: DocItem) => {
    setViewingNote(doc);
    setLoadingNoteContent(true);
    setCopiedNote(false);
    try {
      const content = await getNoteContent(doc.url);
      setViewingContent(content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải nội dung ghi chú.";
      toast.error(msg);
      setViewingContent("Không thể tải nội dung ghi chú. Vui lòng thử lại sau.");
    } finally {
      setLoadingNoteContent(false);
    }
  };

  const handleCopyNoteContent = async () => {
    if (!viewingContent) return;
    try {
      await navigator.clipboard.writeText(viewingContent);
      setCopiedNote(true);
      toast.success("Đã sao chép nội dung ghi chú!");
      setTimeout(() => setCopiedNote(false), 2000);
    } catch {
      toast.error("Lỗi khi sao chép nội dung.");
    }
  };

  const handleGenerateNoteOutline = async () => {
    const topic = noteTitle.trim() || "Chủ đề học tập trọng tâm";
    setIsAiGeneratingOutline(true);
    const toastId = toast.loading("Trợ lý AI đang phác thảo dàn ý ghi chú...");
    try {
      const prompt = `Hãy đóng vai trò một sinh viên xuất sắc hoặc chuyên gia nghiên cứu. Tạo một dàn ý ghi chú học tập ngắn gọn, có cấu trúc rõ ràng cho chủ đề: "${topic}".
Bao gồm:
1. Định nghĩa / Mục tiêu cốt lõi
2. Các điểm then chốt (Key Takeaways)
3. Ví dụ hoặc công thức quan trọng
4. Câu hỏi tự kiểm tra (Self-test questions)
Dùng tiếng Việt súc tích, các gạch đầu dòng rõ ràng.`;

      const res = await askGeneralAI(prompt);
      if (res.success && res.data) {
        const aiData = res.data;
        setNoteContent(prev => prev ? `${prev}\n\n--- DÀN Ý AI GỢI Ý ---\n${aiData}` : aiData);
        toast.success("Đã thêm dàn ý từ AI vào ghi chú!", { id: toastId });
      } else {
        toast.error(res.error || "Không thể tạo dàn ý từ AI.", { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra sự cố khi gọi AI.";
      toast.error(msg, { id: toastId });
    } finally {
      setIsAiGeneratingOutline(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = noteContent.trim();
    if (!cleanContent) {
      toast.error("Vui lòng nhập nội dung ghi chú.");
      return;
    }

    setSavingNote(true);
    const toastId = toast.loading("Đang lưu ghi chú vào kho tài liệu...");
    try {
      let finalCategory = noteCategory || "Chung";
      if (finalCategory === "Chung" && noteTitle.trim()) {
        try {
          const aiCatRes = await categorizeDoc(noteTitle.trim());
          if (aiCatRes.success && aiCatRes.data && aiCatRes.data.length < 25) {
            finalCategory = aiCatRes.data;
          }
        } catch (catErr) {
          console.warn("AI categorization skipped:", catErr);
        }
      }

      await saveQuickNote({
        title: noteTitle.trim() || `Ghi chú ngày ${new Date().toLocaleDateString('vi-VN')}`,
        content: cleanContent,
        category: finalCategory,
        type: noteType
      });

      toast.success("Đã tạo và lưu ghi chú thành công!", { id: toastId });
      setNoteTitle("");
      setNoteContent("");
      setIsAddingNote(false);
      fetchDocs();
      fetchCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể lưu ghi chú.";
      toast.error(msg, { id: toastId });
    } finally {
      setSavingNote(false);
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
            onClick={() => {
              setNoteCategory(uploadCategory !== 'Tất cả' ? uploadCategory : 'Chung');
              setIsAddingNote(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95 text-sm"
            title="Tạo ghi chú văn bản trực tiếp trên web"
          >
            <PenSquare size={17} /> Viết ghi chú mới
          </button>

          <button 
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer text-sm"
          >
            <LinkIcon size={17} /> Thêm Link
          </button>

          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-2 text-sm">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2"><Upload size={17} /> Đang tải...</span>
            ) : (
              <><Upload size={17} /> Tải File</>
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

      {/* Modal Soạn Ghi Chú Nhanh */}
      {isAddingNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <PenSquare size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Viết ghi chú học tập nhanh
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lưu trữ trực tiếp và tương tác bằng Trợ lý AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingNote(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNote} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tiêu đề ghi chú
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="VD: Công thức Giải tích 2 & Định lý Stokes..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/40 text-sm font-semibold"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chủ đề / Danh mục
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none text-xs font-bold cursor-pointer"
                  >
                    {allCategoryNames.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Định dạng tài liệu
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteType('note')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        noteType === 'note'
                          ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      📝 Ghi chú (.note)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteType('txt')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        noteType === 'txt'
                          ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      📄 Văn bản (.txt)
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nội dung ghi chú
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNoteOutline}
                    disabled={isAiGeneratingOutline}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={12} className={isAiGeneratingOutline ? "animate-spin" : ""} />
                    {isAiGeneratingOutline ? "AI đang tạo dàn ý..." : "AI gợi ý dàn ý mẫu"}
                  </button>
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Ghi lại kiến thức, bài học, công thức hoặc danh sách công việc cần nhớ..."
                  rows={8}
                  required
                  className="w-full flex-1 min-h-[160px] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/40 text-sm leading-relaxed font-normal"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-1">
                  <span>{noteContent.length} ký tự • {noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0} từ</span>
                  <span>Lưu an toàn vào kho tài liệu cá nhân</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNote(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!noteContent.trim() || savingNote}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu ghi chú"
                  )}
                </button>
              </div>
            </form>
          </div>
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
                  <tr key={doc.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="p-5 flex items-center gap-4 text-slate-700 dark:text-slate-200 font-bold">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border shrink-0 ${
                        doc.type === 'link' 
                          ? 'bg-indigo-50 text-indigo-500 border-indigo-100/50 dark:bg-indigo-950/60 dark:text-indigo-400' 
                          : doc.type === 'note'
                          ? 'bg-amber-50 text-amber-600 border-amber-200/50 dark:bg-amber-950/60 dark:text-amber-400'
                          : doc.type === 'pdf'
                          ? 'bg-blue-50 text-blue-500 border-blue-100/50 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}>
                        {doc.type === 'link' ? (
                          <LinkIcon size={20} />
                        ) : doc.type === 'note' ? (
                          <StickyNote size={20} />
                        ) : doc.type === 'pdf' ? (
                          <File size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span 
                          onClick={() => {
                            if (doc.type === 'note' || doc.type === 'txt') {
                              handleOpenNoteViewer(doc);
                            }
                          }}
                          className={`truncate max-w-sm block ${(doc.type === 'note' || doc.type === 'txt') ? 'cursor-pointer hover:text-amber-600 dark:hover:text-amber-400' : ''}`}
                          title={doc.title}
                        >
                          {doc.title}
                        </span>
                        {doc.type === 'note' && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider block">
                            Ghi chú nhanh
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-slate-500 text-sm font-bold">
                      <select 
                        value={doc.category || 'Chung'}
                        onChange={(e) => handleChangeCategory(doc.id, e.target.value)}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer transition-colors border-none text-slate-600 w-full max-w-[120px]"
                      >
                        {allCategoryNames.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-5 text-slate-400 text-sm font-medium">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-1">
                        {(doc.type === 'note' || doc.type === 'txt') && (
                          <button 
                            onClick={() => handleOpenNoteViewer(doc)} 
                            className="p-2 text-amber-600 hover:bg-amber-100 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 rounded-xl transition-colors cursor-pointer" 
                            title="Xem & Đọc ghi chú trực tiếp"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button onClick={() => handleOpenAIStudio(doc)} className="p-2 text-blue-600 hover:bg-blue-100 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl transition-colors cursor-pointer" title="Trợ lý Học tập AI (Tóm tắt, Hỏi đáp, Trắc nghiệm)">
                          <Sparkles size={18} />
                        </button>
                        <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-600 hover:bg-slate-100 bg-slate-50 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition-colors" title="Xem/Truy cập">
                          <ExternalLink size={18} />
                        </a>
                        <button onClick={() => handleShare(doc.id, 'doc')} className="p-2 text-purple-600 hover:bg-purple-100 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400 rounded-xl transition-colors" title="Chia sẻ">
                          <Share2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc.id, doc.url)} className="p-2 text-red-500 hover:bg-red-100 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-xl transition-colors" title="Xóa">
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

      {/* Modal Xem Nhanh Nội Dung Ghi Chú */}
      {viewingNote && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/50 flex items-center justify-center shrink-0">
                  <StickyNote size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {viewingNote.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                      {viewingNote.category || 'Chung'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(viewingNote.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingNote(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingNoteContent ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-amber-500" />
                  <p className="text-xs font-medium">Đang tải nội dung ghi chú...</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-sans select-text">
                  {viewingContent || "Ghi chú trống."}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <button
                onClick={handleCopyNoteContent}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedNote ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedNote ? "Đã copy" : "Sao chép"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const doc = viewingNote;
                    setViewingNote(null);
                    handleOpenAIStudio(doc);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Trợ lý AI Studio</span>
                </button>
                <button
                  onClick={() => setViewingNote(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Trợ lý AI Studio Toàn Năng */}
      <DocAIStudioModal
        isOpen={isAIStudioOpen}
        onClose={() => setIsAIStudioOpen(false)}
        doc={selectedDocForAI}
        onSummaryUpdated={fetchDocs}
      />
    </div>
  );
}
