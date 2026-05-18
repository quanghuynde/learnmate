import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, ChevronDown, Zap, AlertTriangle, Lightbulb } from 'lucide-react';
export function NightBeforeMode() {
  const [openSection, setOpenSection] = useState<string | null>('formulas');
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 rounded-3xl p-6 md:p-10 text-slate-200 relative overflow-hidden shadow-2xl">
      {/* Dark mode background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 text-center mb-12">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <Moon size={32} className="text-blue-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Chế độ Đêm trước thi
        </h1>
        <p className="text-slate-400">
          Thi cuối kỳ Hệ CSDL — Ngày mai lúc 9:00 sáng
        </p>

        <div className="mt-6 inline-flex items-center gap-2 bg-danger/20 text-danger-400 border border-danger/30 px-4 py-2 rounded-full font-bold tracking-widest text-sm">
          CÒN LẠI: 14:23:45
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-4 relative z-10">
        {/* Section 1 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-sm">
          <button
            onClick={() => toggleSection('formulas')}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-800 transition-colors">
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-lg text-white">
                Công thức & Định nghĩa chính
              </h3>
            </div>
            <ChevronDown
              className={`transition-transform ${openSection === 'formulas' ? 'rotate-180' : ''}`} />
            
          </button>

          <AnimatePresence>
            {openSection === 'formulas' &&
            <motion.div
              initial={{
                height: 0,
                opacity: 0
              }}
              animate={{
                height: 'auto',
                opacity: 1
              }}
              exit={{
                height: 0,
                opacity: 0
              }}
              className="overflow-hidden">
              
                <div className="p-5 pt-0 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-blue-400 mb-2">1NF</h4>
                    <p className="text-sm text-slate-400">
                      Đảm bảo tính nguyên tử, không có nhóm lặp lại, giá trị
                      nguyên tử.
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-blue-400 mb-2">2NF</h4>
                    <p className="text-sm text-slate-400">
                      Đạt 1NF + không có phụ thuộc một phần (tất cả thuộc tính
                      không khóa phụ thuộc vào TOÀN BỘ khóa chính).
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-blue-400 mb-2">3NF</h4>
                    <p className="text-sm text-slate-400">
                      Đạt 2NF + không có phụ thuộc bắc cầu (thuộc tính không
                      khóa CHỈ phụ thuộc vào khóa chính).
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-blue-400 mb-2">ACID</h4>
                    <p className="text-sm text-slate-400">
                      Atomicity, Consistency, Isolation, Durability - 4 tính
                      chất của giao dịch.
                    </p>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>

        {/* Section 2 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-sm">
          <button
            onClick={() => toggleSection('questions')}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-800 transition-colors">
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-lg text-white">
                Câu hỏi dự đoán ra đề
              </h3>
            </div>
            <ChevronDown
              className={`transition-transform ${openSection === 'questions' ? 'rotate-180' : ''}`} />
            
          </button>

          <AnimatePresence>
            {openSection === 'questions' &&
            <motion.div
              initial={{
                height: 0,
                opacity: 0
              }}
              animate={{
                height: 'auto',
                opacity: 1
              }}
              exit={{
                height: 0,
                opacity: 0
              }}
              className="overflow-hidden">
              
                <div className="p-5 pt-0 border-t border-slate-700/50 space-y-3">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-red-900/30 flex gap-4">
                    <div className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded h-fit whitespace-nowrap">
                      95% RA ĐỀ
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">
                        Cho một lược đồ quan hệ R và tập phụ thuộc hàm F. Hãy
                        chuẩn hóa R về 3NF.
                      </p>
                      <p className="text-sm text-slate-400">
                        Mẹo: Luôn tìm khóa chính trước, sau đó kiểm tra 2NF rồi
                        mới đến 3NF.
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-orange-900/30 flex gap-4">
                    <div className="text-xs font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded h-fit whitespace-nowrap">
                      80% RA ĐỀ
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">
                        Viết câu lệnh SQL sử dụng LEFT JOIN và GROUP BY có điều
                        kiện HAVING.
                      </p>
                      <p className="text-sm text-slate-400">
                        Nhớ: WHERE lọc trước khi nhóm, HAVING lọc sau khi nhóm.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>

        {/* Section 3 */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-sm">
          <button
            onClick={() => toggleSection('tips')}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-800 transition-colors">
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                <Lightbulb size={20} />
              </div>
              <h3 className="font-bold text-lg text-white">Mẹo làm bài thi</h3>
            </div>
            <ChevronDown
              className={`transition-transform ${openSection === 'tips' ? 'rotate-180' : ''}`} />
            
          </button>

          <AnimatePresence>
            {openSection === 'tips' &&
            <motion.div
              initial={{
                height: 0,
                opacity: 0
              }}
              animate={{
                height: 'auto',
                opacity: 1
              }}
              exit={{
                height: 0,
                opacity: 0
              }}
              className="overflow-hidden">
              
                <div className="p-5 pt-0 border-t border-slate-700/50">
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex gap-3">
                      <span className="text-yellow-400">1.</span> Đọc lướt toàn
                      bộ đề thi trong 5 phút đầu để phân bổ thời gian.
                    </li>
                    <li className="flex gap-3">
                      <span className="text-yellow-400">2.</span> Làm phần SQL
                      trước vì thường dễ lấy điểm trọn vẹn.
                    </li>
                    <li className="flex gap-3">
                      <span className="text-yellow-400">3.</span> Ở bài tập
                      chuẩn hóa, hãy viết rõ các bước suy luận khóa, giáo viên
                      thường chấm điểm từng bước.
                    </li>
                    <li className="flex gap-3">
                      <span className="text-yellow-400">4.</span> Đừng để trống
                      câu hỏi trắc nghiệm, nếu không chắc chắn hãy dùng phương
                      pháp loại trừ.
                    </li>
                  </ul>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>
      </div>
    </div>);

}