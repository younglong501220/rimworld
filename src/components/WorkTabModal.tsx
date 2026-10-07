import React from 'react';
import { WORK_TYPE_LABELS } from '../game/constants';
import { ColonyGameEngine } from '../game/GameEngine';
import { WorkTypeName } from '../types/game';
import { sounds } from '../utils/audio';

interface WorkTabModalProps {
  engine: ColonyGameEngine;
  onClose: () => void;
}

export const WorkTabModal: React.FC<WorkTabModalProps> = ({ engine, onClose }) => {
  const workTypes = Object.keys(WORK_TYPE_LABELS) as WorkTypeName[];

  const cyclePriority = (pawnId: string, workType: WorkTypeName) => {
    const pawn = engine.pawns.find((p) => p.id === pawnId);
    if (!pawn) return;

    const curr = pawn.workPriorities[workType] || 0;
    // Cycle: 0 -> 1 -> 2 -> 3 -> 4 -> 0
    let next = 0;
    if (curr === 0) next = 1;
    else if (curr === 1) next = 2;
    else if (curr === 2) next = 3;
    else if (curr === 3) next = 4;
    else next = 0;

    pawn.workPriorities[workType] = next;
    sounds.playClick();
    // Force re-render
    engine.detectRooms();
  };

  const getPriorityStyle = (prio: number) => {
    switch (prio) {
      case 1:
        return 'bg-amber-500 text-slate-950 font-extrabold shadow-sm';
      case 2:
        return 'bg-amber-600/70 text-white font-bold';
      case 3:
        return 'bg-slate-700 text-slate-200';
      case 4:
        return 'bg-slate-800 text-slate-400';
      default:
        return 'bg-slate-950/40 text-slate-600 hover:text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span>
              <span>工作分配面板 (Work Priorities)</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              RimWorld 核心系統：殖民者依照數字優先級（1 最高，4 最低）從左至右自動尋路執行任務。
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold"
          >
            關閉面板 ✕
          </button>
        </div>

        {/* Priority Matrix Table */}
        <div className="p-6 overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300">
                <th className="py-2.5 px-3 min-w-[140px] font-semibold">殖民者 (Colonist)</th>
                {workTypes.map((wt) => (
                  <th key={wt} className="py-2.5 px-2 text-center min-w-[55px]">
                    <div className="font-semibold text-slate-200">{WORK_TYPE_LABELS[wt].short}</div>
                    <div className="text-[10px] text-slate-400 scale-90">{WORK_TYPE_LABELS[wt].zh}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {engine.pawns.map((pawn) => (
                <tr key={pawn.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: pawn.color }}
                      />
                      <div>
                        <div className="font-bold text-slate-100">{pawn.nickname}</div>
                        <div className="text-[10px] text-slate-400">{pawn.traits[0]}</div>
                      </div>
                    </div>
                  </td>

                  {workTypes.map((wt) => {
                    const prio = pawn.workPriorities[wt] || 0;
                    return (
                      <td key={wt} className="py-3 px-2 text-center">
                        <button
                          onClick={() => cyclePriority(pawn.id, wt)}
                          className={`w-8 h-8 rounded border border-slate-700/60 font-mono text-sm transition-all inline-flex items-center justify-center ${getPriorityStyle(
                            prio
                          )}`}
                          title={`點擊切換 ${pawn.nickname} 的【${WORK_TYPE_LABELS[wt].zh}】優先級`}
                        >
                          {prio > 0 ? prio : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Guide banner */}
          <div className="mt-6 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">數值等級說明：</span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-500 text-slate-950 font-bold inline-flex items-center justify-center text-xs">
                  1
                </span>
                <span>最高優先</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-amber-600/70 text-white font-bold inline-flex items-center justify-center text-xs">
                  2
                </span>
                <span>次要優先</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-slate-700 text-slate-200 inline-flex items-center justify-center text-xs">
                  3
                </span>
                <span>常規</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 inline-flex items-center justify-center text-xs">
                  4
                </span>
                <span>空閒執行</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-slate-950 text-slate-600 inline-flex items-center justify-center text-xs">
                  —
                </span>
                <span>停用</span>
              </span>
            </div>
            <div className="italic text-slate-500">點擊任意格位即可循環切換</div>
          </div>
        </div>
      </div>
    </div>
  );
};
