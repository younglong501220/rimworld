import React from 'react';
import { ColonyGameEngine } from '../game/GameEngine';
import { sounds } from '../utils/audio';

interface ResearchModalProps {
  engine: ColonyGameEngine;
  onClose: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({ engine, onClose }) => {
  const handleSelectProject = (projectId: string) => {
    engine.activeResearchId = projectId;
    sounds.playClick();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>🧠</span>
              <span>科技樹研發中心 (Research Tree)</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              建造「簡易研發台」並安排高智力殖民者投入研究，即可解鎖新結構與製造設施。
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold"
          >
            關閉 ✕
          </button>
        </div>

        {/* Research Projects List */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engine.researchProjects.map((project) => {
              const isActive = engine.activeResearchId === project.id;
              const pct = Math.min(100, Math.round((project.progress / project.cost) * 100));

              return (
                <div
                  key={project.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    project.isCompleted
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : isActive
                      ? 'bg-sky-950/30 border-sky-500 shadow-md shadow-sky-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-white">{project.name}</span>
                      {project.isCompleted ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                          ✓ 已解鎖
                        </span>
                      ) : isActive ? (
                        <span className="text-[11px] font-semibold text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800 animate-pulse">
                          🔬 當前研究中
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">
                          成本: {project.cost} 點
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {project.description}
                    </p>

                    {/* Unlocks */}
                    {project.unlocks.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-3 text-[11px] text-slate-400">
                        <span>解鎖項目：</span>
                        {project.unlocks.map((u) => (
                          <span
                            key={u}
                            className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {u === 'wall_stone'
                              ? '🏛️ 石磚牆'
                              : u === 'stove'
                              ? '🍳 燃料爐灶'
                              : u === 'heater'
                              ? '♨️ 電暖器'
                              : u === 'cooler'
                              ? '❄️ 冷氣空調'
                              : u}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progress & Action */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-400">
                      <span>研發進度</span>
                      <span>
                        {Math.floor(project.progress)} / {project.cost} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full transition-all ${
                          project.isCompleted ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {!project.isCompleted && (
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        disabled={isActive}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : 'bg-sky-600 hover:bg-sky-500 text-white'
                        }`}
                      >
                        {isActive ? '正在專注研發' : '設為研發目標'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
