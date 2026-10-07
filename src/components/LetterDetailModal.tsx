import React from 'react';
import { Letter } from '../types/game';

interface LetterDetailModalProps {
  letter: Letter | null;
  onClose: () => void;
  onJumpTo: (x: number, y: number) => void;
}

export const LetterDetailModal: React.FC<LetterDetailModalProps> = ({
  letter,
  onClose,
  onJumpTo,
}) => {
  if (!letter) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {letter.type === 'urgent'
                ? '🚨'
                : letter.type === 'bad'
                ? '⚠️'
                : letter.type === 'good'
                ? '✉️'
                : '📜'}
            </span>
            <div>
              <h3 className="font-bold text-base text-white">{letter.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{letter.dateStr}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          {letter.message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          {letter.x !== undefined && letter.y !== undefined && (
            <button
              onClick={() => {
                onJumpTo(letter.x!, letter.y!);
                onClose();
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
            >
              跳轉至事件位置
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            知曉關閉
          </button>
        </div>
      </div>
    </div>
  );
};
