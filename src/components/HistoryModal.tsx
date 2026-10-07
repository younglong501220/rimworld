import React from 'react';
import { Letter } from '../types/game';

interface HistoryModalProps {
  letters: Letter[];
  onClose: () => void;
  onJumpTo: (x: number, y: number) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ letters, onClose, onJumpTo }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>📜</span>
              <span>殖民地事件歷史日誌 (Colony Event Log)</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              邊緣世界故事生成器（Storyteller）在此記錄所有發生的重大危機、驚喜與突發事件。
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold"
          >
            關閉 ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {letters.map((letter) => {
            const borderCol =
              letter.type === 'urgent' || letter.type === 'bad'
                ? 'border-l-rose-500'
                : letter.type === 'good'
                ? 'border-l-sky-500'
                : 'border-l-slate-500';

            return (
              <div
                key={letter.id}
                className={`p-3.5 bg-slate-950/70 border border-slate-800 border-l-4 ${borderCol} rounded-r-lg space-y-1.5`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{letter.title}</span>
                  <span className="font-mono text-[11px] text-slate-400">{letter.dateStr}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{letter.message}</p>
                {letter.x !== undefined && letter.y !== undefined && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        onJumpTo(letter.x!, letter.y!);
                        onClose();
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold"
                    >
                      跳轉至事件位置 (X: {letter.x}, Y: {letter.y}) →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {letters.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">尚無事件紀錄</div>
          )}
        </div>
      </div>
    </div>
  );
};
