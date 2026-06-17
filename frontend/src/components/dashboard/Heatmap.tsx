import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeatmapProps {
  data: Array<{ date: string; score: number }>;
}

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const weeks = useMemo(() => {
    if (!data.length) return [];
    
    // Sort data by date just in case
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    // Map data to weeks
    // We want to group by 7 days. Today is the last day of the last week.
    const result: Array<Array<{ date: string; score: number }>> = [];
    let currentWeek: Array<{ date: string; score: number }> = [];
    
    // Fill the first week with empty slots if needed to align days
    
    // We want Mon to be row 1, Sun to be row 7? 
    // Usually GitHub Mon is row 2, Sun is row 1.
    // Let's use Mon (1) to Sun (0). Row order based on image: Mon, Wed, Fri labels.
    // Mon (1), Tue (2), Wed (3), Thu (4), Fri (5), Sat (6), Sun (0)
    
    // Actually simpler: just find the first date, see what day it is, and pad.
    // Let's align so that the rows are Mon-Sun.
    
    for (let i = 0; i < sortedData.length; i++) {
        const d = new Date(sortedData[i].date);
        const day = d.getDay(); 
        const dayIdx = day === 0 ? 6 : day - 1;
        
        if (i === 0) {
            // Pad start
            for (let p = 0; p < dayIdx; p++) {
                currentWeek.push({ date: '', score: -1 });
            }
        }
        
        currentWeek.push(sortedData[i]);
        
        // For Week/Month (short data), we might want a different wrapping
        if (currentWeek.length === 7) {
            result.push(currentWeek);
            currentWeek = [];
        }
    }
    
    if (currentWeek.length > 0) {
        // Pad end
        while (currentWeek.length < 7) {
            currentWeek.push({ date: '', score: -1 });
        }
        result.push(currentWeek);
    }
    
    return result;
  }, [data]);

  const months = useMemo(() => {
    if (!data.length) return [];
    const monthLabels: Array<{ label: string; index: number }> = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIdx) => {
        const firstValidDay = week.find(d => d.date !== '');
        if (firstValidDay) {
            const d = new Date(firstValidDay.date);
            const m = d.getMonth();
            if (m !== lastMonth) {
                const monthName = d.toLocaleDateString('vi-VN', { month: 'short' });
                monthLabels.push({ label: monthName, index: weekIdx });
                lastMonth = m;
            }
        }
    });

    // Skip labels that are too close
    return monthLabels.filter((m, i) => i === 0 || m.index - monthLabels[i-1].index >= 3);
  }, [weeks, data]);

  return (
    <div className="w-full">
      <div className="relative flex">
        {/* Day Labels */}
        <div className="flex flex-col justify-between text-[8px] sm:text-[10px] text-slate-400 pr-2 pb-1 pt-6 h-[104px] font-medium">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
            {/* Month Labels */}
            <div className="relative h-6 text-[10px] text-slate-400 font-medium">
                {months.map((m, i) => (
                    <span 
                        key={i} 
                        className="absolute whitespace-nowrap" 
                        style={{ left: `${m.index * 15}px`, position: 'absolute' }}
                    >
                        {m.label}
                    </span>
                ))}
            </div>

            <div 
                className="grid grid-flow-col gap-[3px] w-fit" 
                style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
            >
                {weeks.map((week, wIdx) => (
                    week.map((day, dIdx) => (
                        <HeatmapCell 
                            key={`${wIdx}-${dIdx}`}
                            day={day}
                            wIdx={wIdx}
                            dIdx={dIdx}
                        />
                    ))
                ))}
            </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-3 text-[10px] text-slate-500">
        <span>Less</span>
        <div className="flex gap-[3px]">
            {colors.map((c, i) => (
                <div key={i} className={`w-3 h-3 rounded-[2px] ${c}`} />
            ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

const getLevel = (score: number) => {
  if (score <= 0) return 0;
  if (score <= 3) return 1;
  if (score <= 7) return 2;
  if (score <= 12) return 3;
  return 4;
};

const colors = [
  'bg-slate-100',      // 0
  'bg-green-100',      // 1
  'bg-green-300',      // 2
  'bg-success-light',  // 3
  'bg-success',        // 4
];

const HeatmapCell: React.FC<{
  day: { date: string; score: number };
  wIdx: number;
  dIdx: number;
}> = ({ day}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
        className="relative group"
        onMouseEnter={() => day.date && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
    >
        <div
            className={`w-3 h-3 rounded-[2px] transition-all duration-300 ${day.score === -1 ? 'bg-transparent' : colors[getLevel(day.score)]}`}
        />
        {day.date && (
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
              >
                <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
                    <p>{new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    <p className="text-primary-light mt-0.5">{day.score} điểm hoạt động</p>
                </div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-white/10" />
              </motion.div>
            )}
          </AnimatePresence>
        )}
    </div>
  );
};
