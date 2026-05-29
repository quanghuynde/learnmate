import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  Loader2,
  Trash2,
  File as FileIcon,
  Presentation,
  AlertCircle,
  X,
  Link,
  Youtube,
  ClipboardPaste,
  MessageSquare,
} from 'lucide-react';
import { api, DocumentItem } from '../lib/api';

interface DocumentsProps {
  token: string;
}


function getFileStyle(type: string) {
  if (type === 'pdf') return { color: 'text-red-500', bg: 'bg-red-50', Icon: FileText };
  if (type === 'docx') return { color: 'text-blue-500', bg: 'bg-blue-50', Icon: FileIcon };
  if (type === 'pptx') return { color: 'text-orange-500', bg: 'bg-orange-50', Icon: Presentation };
  return { color: 'text-slate-500', bg: 'bg-slate-50', Icon: FileText };
}

function formatFileSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Documents({ token }: DocumentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [successFile, setSuccessFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showWebModal, setShowWebModal] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryDoc, setSummaryDoc] = useState<DocumentItem | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [displayLimit, setDisplayLimit] = useState(10);

  const handleUploadFromText = async (content: string, type: 'web' | 'text' | 'youtube') => {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const namePrefix = type === 'web' ? 'Web_Link' : type === 'youtube' ? 'Youtube_Link' : 'Pasted_Text';
    const file = new File([blob], `${namePrefix}_${Date.now()}.txt`, { type: 'text/plain' });
    setShowTextModal(false);
    setShowWebModal(false);
    setShowYoutubeModal(false);
    setPastedText('');
    setWebUrl('');
    setYoutubeUrl('');
    await uploadFile(file);
  };



  const handleShowSummary = async (doc: DocumentItem) => {
    setSummaryDoc(doc);
    setShowSummaryModal(true);
    setSummaryLoading(true);
    setSummaryContent('');
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId: doc._id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Lỗi server ${response.status}`);
      setSummaryContent(data.summary || 'Mô hình AI trả về nội dung rỗng.');
    } catch (err) {
      setSummaryContent(`Không thể tạo tóm tắt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadDocuments = async (showLoading = false) => {
    if (showLoading) setDocsLoading(true);
    try {
      const response = await api.getDocuments(token);
      setDocs(response.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tài liệu');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments(true);
  }, []);

  // Polling mechanism: Tự động làm mới nếu có tệp đang xử lý
  useEffect(() => {
    const hasProcessing = docs.some(d => d.status === 'processing');
    if (hasProcessing) {
      const interval = setInterval(() => {
        loadDocuments();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [docs]);

  const uploadFile = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setError('Tệp vượt quá giới hạn 100MB.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + 10));
    }, 120);

    try {
      await api.uploadDocument(token, file);
      setProgress(100);
      clearInterval(interval);
      setSuccessFile(file.name);
      api.invalidateCache('documents');
      await loadDocuments();
      setUploading(false);
      setProgress(0);
      setTimeout(() => setSuccessFile(''), 3000);
    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      setError(err instanceof Error ? err.message : 'Tải tệp thất bại');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleChooseFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(token, id);
      api.invalidateCache('documents');
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa tài liệu thất bại');
    }
  };

  const filteredDocs = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tài liệu học tập</h1>
          <p className="text-slate-500 text-sm mt-1">Tải tài liệu lên để AI xử lý và tạo quiz tự động</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {successFile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-5 py-3 rounded-2xl text-sm font-medium"
          >
            <CheckCircle2 size={18} />
            <span>Đã tải lên thành công: <strong>{successFile}</strong></span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload zone */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploading ? (
          <div className="p-12 text-center max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">Đang tải lên và xử lý...</h3>
            <p className="text-slate-500 text-sm mb-5">AI đang phân tích nội dung tài liệu của bạn</p>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm text-slate-500 font-medium">{progress}% hoàn thành</p>
          </div>
        ) : (
            <div className="bg-white rounded-[32px] p-6 md:p-10 text-center relative max-w-4xl mx-auto shadow-sm border border-slate-100">

               <div 
                 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                 onDragLeave={() => setIsDragging(false)}
                 onDrop={handleDrop}
                 className={`border-2 border-dashed rounded-3xl p-8 md:p-12 transition-colors ${
                   isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 bg-[#f8fafc]'
                 }`}
               >
                 <h3 className="text-lg font-medium text-slate-800 mb-2">hoặc thả tệp của bạn</h3>
                 <p className="text-sm text-slate-500 mb-8 font-medium">pdf, hình ảnh, tài liệu, âm thanh, <a href="#" className="underline decoration-slate-300 hover:text-slate-800 transition-colors">và các định dạng khác</a></p>
                 
                 <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={handleChooseFile} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all font-semibold text-sm text-slate-700">
                      <UploadCloud size={18} /> Tải tệp lên
                    </button>
                    <button onClick={() => setShowWebModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all font-semibold text-sm text-slate-700">
                      <Link size={18} /> Trang web
                    </button>
                    <button onClick={() => setShowYoutubeModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all font-semibold text-sm text-slate-700">
                      <Youtube size={18} className="text-red-500" /> YouTube
                    </button>

                    <button onClick={() => setShowTextModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all font-semibold text-sm text-slate-700">
                      <ClipboardPaste size={18} /> Văn bản đã sao chép
                    </button>
                 </div>
               </div>
            </div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
            <button onClick={() => setError('')} className="hover:text-red-900">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents list */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-text-primary">Tài liệu của bạn</h2>
          <span className="text-sm text-slate-500">{filteredDocs.length} tệp</span>
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded-md w-1/3" />
                    <div className="h-3 bg-slate-50 rounded-md w-1/4" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-24 h-8 bg-slate-50 rounded-lg" />
                  <div className="w-16 h-8 bg-slate-50 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {search ? 'Không tìm thấy tài liệu phù hợp' : 'Chưa có tài liệu nào'}
            </p>
            <p className="text-sm mt-1">
              {search ? 'Thử từ khóa khác' : 'Tải lên tài liệu để AI có thể tạo quiz cho bạn'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredDocs.slice(0, displayLimit).map((doc, idx) => {
              const { color, bg, Icon } = getFileStyle(doc.type);
              return (
                <motion.div
                  key={doc._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-text-primary truncate max-w-xs">{doc.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className={`uppercase font-bold ${color}`}>{doc.type}</span>
                        {doc.fileSize ? (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </>
                        ) : null}
                        {doc.pages ? (
                          <>
                            <span>•</span>
                            <span>{doc.pages} trang</span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleShowSummary(doc)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare size={14} /> Xem tóm tắt
                    </button>
                    {doc.status === 'processed' ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                        <CheckCircle2 size={13} /> Đã xử lý
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                        <Loader2 size={13} className="animate-spin" /> Đang xử lý
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {filteredDocs.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit(prev => prev + 10)}
                className="w-full py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:bg-white hover:border-primary hover:text-primary transition-all mt-4"
              >
                Xem thêm tài liệu ({filteredDocs.length - displayLimit} tệp chưa hiện)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Web Link Modal */}
      <AnimatePresence>
        {showWebModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">Dán liên kết web hoặc YouTube</h3>
                <button onClick={() => setShowWebModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6">
                <input type="text" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm" placeholder="Nhập địa chỉ https://..." />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowWebModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                <button onClick={() => handleUploadFromText(webUrl, 'web')} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-colors">Tải lên</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* YouTube Link Modal */}
      <AnimatePresence>
        {showYoutubeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">Dán liên kết YouTube</h3>
                <button onClick={() => setShowYoutubeModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6">
                <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm" placeholder="Nhập địa chỉ video YouTube (Ví dụ: https://youtube.com/...)" />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowYoutubeModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                <button onClick={() => handleUploadFromText(youtubeUrl, 'youtube')} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-colors">Tải lên</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Text Paste Modal */}
      <AnimatePresence>
        {showTextModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">Dán văn bản</h3>
                <button onClick={() => setShowTextModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6">
                <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} rows={10} className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none custom-scrollbar" placeholder="Dán văn bản sao chép vào đây..." />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowTextModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Hủy</button>
                <button onClick={() => handleUploadFromText(pastedText, 'text')} className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-colors">Tải lên</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><MessageSquare size={20} className="text-primary"/> Tóm tắt tài liệu</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate max-w-[300px]">{summaryDoc?.name}</p>
                </div>
                <button onClick={() => setShowSummaryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative min-h-[200px]">
                 {summaryLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 h-full absolute inset-0">
                        <Loader2 size={32} className="animate-spin text-primary mb-4"/>
                        <p className="font-medium">AI đang phân tích và tạo tóm tắt...</p>
                    </div>
                 ) : (
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap format-markdown">
                        {summaryContent}
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
