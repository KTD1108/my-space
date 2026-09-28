import { getSharedItemInfo } from '@/app/actions/data';
import { Download, FileText, Image as ImageIcon, Music } from 'lucide-react';
import Link from 'next/link';

export default async function SharePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  
  let shareData = null;
  let errorMsg = null;

  try {
    shareData = await getSharedItemInfo(id);
  } catch (e: any) {
    errorMsg = e.message;
  }

  if (errorMsg || !shareData) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-400 rounded-3xl mx-auto flex items-center justify-center mb-6">
            <FileText size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Liên kết hỏng</h2>
          <p className="text-slate-500 font-medium mb-8">{errorMsg || "Không tìm thấy nội dung chia sẻ."}</p>
          <Link href="/" className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform inline-block">
            Về Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const { type, item, ownerName, ownerAvatar } = shareData;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 md:p-8 font-sans">
      {/* Header cho khách */}
      <header className="flex justify-between items-center bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 px-6 max-w-5xl mx-auto w-full mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
            <img src={ownerAvatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${ownerName}`} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Được chia sẻ bởi</p>
            <p className="text-white font-extrabold text-sm">{ownerName}</p>
          </div>
        </div>
        
        <Link href="/" className="text-white/80 hover:text-white font-bold text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors">
          Đăng nhập My Space
        </Link>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 flex items-center justify-center max-w-5xl mx-auto w-full">
        {type === 'photo' && (
          <div className="bg-black/50 p-4 rounded-[2.5rem] backdrop-blur-2xl border border-white/10 shadow-2xl relative group overflow-hidden flex flex-col items-center">
            <img src={item.publicUrl} alt={item.name} className="max-w-full max-h-[70vh] rounded-[2rem] object-contain" />
            <div className="mt-6 text-center w-full">
              <h2 className="text-white font-extrabold text-xl mb-1">{item.name}</h2>
              <p className="text-white/50 text-sm font-medium mb-6">Tải lên lúc {new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
              
              <a 
                href={item.publicUrl} 
                download
                target="_blank"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 max-w-xs mx-auto"
              >
                <Download size={18} /> Tải ảnh gốc xuống
              </a>
            </div>
          </div>
        )}

        {type === 'doc' && (
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-slate-100 text-center">
            <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[2rem] mx-auto flex items-center justify-center mb-6">
              <FileText size={40} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2 truncate px-4">{item.name}</h2>
            <p className="text-slate-500 font-medium mb-8">Kích thước: {item.size ? Math.round(item.size / 1024) + ' KB' : 'Link Web'}</p>
            
            <a 
              href={item.publicUrl} 
              download={!item.isLink}
              target="_blank"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/30 flex items-center justify-center gap-3 w-full"
            >
              {item.type === 'link' ? "Truy cập Liên kết" : <><Download size={20} /> Tải tài liệu xuống</>}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
