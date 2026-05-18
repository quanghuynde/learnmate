import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Search,
  CheckCircle2,
  Loader2,
  Trash2,
  File,
  FileSpreadsheet,
  Presentation,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { api, DocumentItem } from '../lib/api';

interface DocumentsProps {
  token: string;
}

const SUPPORTED_TYPES = [
  { ext: '.pdf', label: 'PDF', color: 'text-red-500', bg: 'bg-red-50', icon: FileText },
  { ext: '.docx', label: 'Word', color: 'text-blue-500', bg: 'bg-blue-50', icon: File },
  { ext: '.pptx', label: 'PowerPoint', color: 'text-orange-500', bg: 'bg-orange-50', icon: Presentation },
];

function getFileStyle(type: string) {
  if (type === 'pdf') return { color: 'text-red-500', bg: 'bg-red-50', Icon: FileText };
  if (type === 'docx') return { color: 'text-blue-500', bg: 'bg-blue-50', Icon: File };
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
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [successFile, setSuccessFile] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const response = await api.getDocuments(token);
      setDocs(response.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tài liệu');
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'pptx'].includes(ext || '')) {
      setError('Định dạng không hỗ trợ. Vui lòng chọn PDF, DOCX hoặc PPTX.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Tệp vượt quá giới hạn 50MB.');
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
      setSuccessFile(file.name);
      await loadDocuments();
      setTimeout(() => setSuccessFile(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải tệp thất bại');
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
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
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl transition-all overflow-hidden ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-primary/50 hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploading ? (
          <div className="p-12 text-center max-w-md mx-auto">
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
          <div className="p-10">
            {/* Main upload area */}
            <div className="text-center mb-8">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors ${
                  isDragging ? 'bg-primary text-white' : 'bg-blue-50 text-blue-500'
                }`}
              >
                <UploadCloud size={40} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {isDragging ? 'Thả tệp để tải lên' : 'Tải tài liệu mới'}
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                Kéo thả tệp vào đây hoặc nhấn nút bên dưới để chọn tệp từ máy tính
              </p>
              <button
                onClick={handleChooseFile}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-95"
              >
                <Plus size={18} />
                Chọn tệp
              </button>
            </div>

            {/* Supported file types */}
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-4">
                Định dạng hỗ trợ
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                {SUPPORTED_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.ext}
                      className={`flex items-center gap-2 px-4 py-2 ${t.bg} rounded-xl`}
                    >
                      <Icon size={16} className={t.color} />
                      <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
                      <span className="text-xs text-slate-400">{t.ext}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                  <FileSpreadsheet size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-500">Tối đa</span>
                  <span className="text-xs text-slate-400">50MB</span>
                </div>
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

        {filteredDocs.length === 0 && !uploading ? (
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
            {filteredDocs.map((doc, idx) => {
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
          </div>
        )}
      </div>
    </div>
  );
}
