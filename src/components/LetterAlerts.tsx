import React from 'react';
import { Letter } from '../types/game';

interface LetterAlertsProps {
  letters: Letter[];
  onOpenLetter: (letter: Letter) => void;
  onDismissLetter: (letterId: string) => void;
}

export const LetterAlerts: React.FC<LetterAlertsProps> = ({
  letters,
  onOpenLetter,
  onDismissLetter,
}) => {
  // Show top 5 unread or recent letters on right edge
  const activeLetters = letters.slice(0, 5);

  if (activeLetters.length === 0) return null;

  return (
    <div className="absolute right-4 top-16 flex flex-col gap-2 z-30 pointer-events-auto">
      {activeLetters.map((letter) => {
        const bgColors =
          letter.type === 'urgent'
            ? 'bg-rose-900/90 border-rose-500 text-rose-100 shadow-rose-950/80 animate-bounce'
            : letter.type === 'bad'
            ? 'bg-red-950/90 border-red-600 text-red-200'
            : letter.type === 'good'
            ? 'bg-sky-950/90 border-sky-500 text-sky-100'
            : 'bg-slate-900/90 border-slate-700 text-slate-200';

        const icon =
          letter.type === 'urgent'
            ? '🚨'
            : letter.type === 'bad'
            ? '⚠️'
            : letter.type === 'good'
            ? '✉️'
            : '📜';

        return (
          <div
            key={letter.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-xl backdrop-blur-md text-xs cursor-pointer transition-transform hover:scale-105 ${bgColors}`}
            onClick={() => onOpenLetter(letter)}
          >
            <span className="text-base">{icon}</span>
            <div className="flex flex-col text-left">
              <span className="font-bold max-w-[170px] truncate">{letter.title}</span>
              <span className="text-[10px] opacity-75">{letter.dateStr}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissLetter(letter.id);
              }}
              className="ml-1 opacity-60 hover:opacity-100 p-0.5"
              title="忽略通知"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
