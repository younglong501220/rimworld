import React from 'react';
import { ColonyGameEngine } from '../game/GameEngine';
import { Pawn } from '../types/game';
import { sounds } from '../utils/audio';

interface TopBarProps {
  engine: ColonyGameEngine;
  gameSpeed: number;
  onSetSpeed: (speed: number) => void;
  selectedPawnId: string | null;
  onSelectPawn: (pawnId: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  engine,
  gameSpeed,
  onSetSpeed,
  selectedPawnId,
  onSelectPawn,
  isMuted,
  onToggleMute,
}) => {
  const wood = engine.getTotalResource('wood');
  const steel = engine.getTotalResource('steel');
  const meals = engine.getTotalResource('meal_simple');
  const berries = engine.getTotalResource('berries');
  const medicine = engine.getTotalResource('medicine');
  const silver = engine.getTotalResource('silver');

  const formattedHour = `${Math.floor(engine.gameHour).toString().padStart(2, '0')}:00`;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4 select-none shrink-0 z-20">
      {/* Zone 1: Colony Brand Title & Resources */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            新黎明殖民地
          </span>
          <span className="text-xs text-slate-500">· 邊緣星際</span>
        </div>

        {/* Resources Bar */}
        <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-md">
          <div className="flex items-center gap-1.5" title="木材 (建造與烹飪燃料)">
            <span>🪵</span>
            <span className="font-mono font-medium text-amber-200 tabular-nums">{wood}</span>
          </div>
          <div className="flex items-center gap-1.5" title="鋼鐵 (重型設施與科技)">
            <span>⚙️</span>
            <span className="font-mono font-medium text-slate-300 tabular-nums">{steel}</span>
          </div>
          <div className="flex items-center gap-1.5" title="簡易餐點 (殖民者食物)">
            <span>🍱</span>
            <span className={`font-mono font-medium tabular-nums ${meals < 4 ? 'text-red-400' : 'text-emerald-300'}`}>
              {meals}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="原料與漿果">
            <span>🍓</span>
            <span className="font-mono font-medium text-rose-300 tabular-nums">{berries}</span>
          </div>
          <div className="flex items-center gap-1.5" title="藥品 (包紮與急救)">
            <span>💊</span>
            <span className="font-mono font-medium text-blue-300 tabular-nums">{medicine}</span>
          </div>
          <div className="flex items-center gap-1.5" title="白銀 (貨幣)">
            <span>🪙</span>
            <span className="font-mono font-medium text-slate-200 tabular-nums">{silver}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Colonists Roster (Top Colonist Cards) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-xl">
        {engine.pawns.map((pawn: Pawn) => {
          const isSelected = selectedPawnId === pawn.id;
          const moodColor =
            pawn.mood > 60 ? 'bg-emerald-500' : pawn.mood > 30 ? 'bg-amber-500' : 'bg-red-500';

          return (
            <button
              key={pawn.id}
              onClick={() => onSelectPawn(pawn.id)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border transition-all ${
                isSelected
                  ? 'bg-slate-800 border-sky-500 shadow-sm shadow-sky-500/20 text-white'
                  : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-slate-700"
                style={{ backgroundColor: pawn.color }}
              />
              <div className="flex flex-col items-start leading-tight">
                <div className="flex items-center gap-1 font-medium">
                  <span>{pawn.nickname}</span>
                  {pawn.isDrafted && <span className="text-[10px] text-red-400 font-bold">[徵召]</span>}
                </div>
                {/* Mood bar */}
                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                  <div className={`h-full ${moodColor}`} style={{ width: `${pawn.mood}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Zone 3: Time, Temperature & Speed Controls */}
      <div className="flex items-center gap-3">
        {/* Date, Time & Weather */}
        <div className="text-right text-xs">
          <div className="font-medium text-slate-200 flex items-center justify-end gap-1.5">
            <span>第 {engine.dayCount} 天</span>
            <span className="font-mono text-slate-400">{formattedHour}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400">
            <span
              className={
                engine.outdoorTemperature > 30
                  ? 'text-orange-400 font-semibold'
                  : engine.outdoorTemperature < 5
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-300'
              }
              title={`戶外環境氣溫: ${engine.outdoorTemperature}°C`}
            >
              室外 {engine.outdoorTemperature}°C
            </span>
            {engine.rooms.length > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-400" title={`封閉室溫: ${engine.rooms[0].temperature}°C`}>
                  室內 {engine.rooms[0].temperature}°C
                </span>
              </>
            )}
            <span>·</span>
            <span>
              {engine.weather === 'heatwave'
                ? '🔥 極端熱浪'
                : engine.weather === 'coldsnap'
                ? '❄️ 寒流侵襲'
                : '☀️ 晴朗'}
            </span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
          <button
            onClick={() => onSetSpeed(0)}
            className={`px-2 py-1 text-xs font-mono rounded ${
              gameSpeed === 0 ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="暫停 (Space)"
          >
            ⏸
          </button>
          <button
            onClick={() => onSetSpeed(1)}
            className={`px-2 py-1 text-xs font-mono rounded ${
              gameSpeed === 1 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="1x 正常速度"
          >
            ▶
          </button>
          <button
            onClick={() => onSetSpeed(2)}
            className={`px-2 py-1 text-xs font-mono rounded ${
              gameSpeed === 2 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="2x 快速"
          >
            ⏩
          </button>
          <button
            onClick={() => onSetSpeed(3)}
            className={`px-2 py-1 text-xs font-mono rounded ${
              gameSpeed === 3 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="3x 極速"
          >
            ⏭
          </button>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleMute}
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-md text-xs transition-colors"
          title={isMuted ? '解除靜音' : '靜音音效'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
};
