import React from 'react';
import { BUILDING_DEFS, SKILL_LABELS } from '../game/constants';
import { ColonyGameEngine } from '../game/GameEngine';
import { SkillName } from '../types/game';

interface InspectorPanelProps {
  engine: ColonyGameEngine;
  selectedEntity: { type: 'pawn' | 'building' | 'item' | 'tile'; x: number; y: number; id?: string } | null;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ engine, selectedEntity, onClose }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const prevEntityKeyRef = React.useRef<string | null>(null);

  // If a new entity is selected, expand by default
  React.useEffect(() => {
    const currentKey = selectedEntity
      ? `${selectedEntity.type}_${selectedEntity.id || ''}_${selectedEntity.x}_${selectedEntity.y}`
      : null;
    if (currentKey && currentKey !== prevEntityKeyRef.current) {
      prevEntityKeyRef.current = currentKey;
      setIsCollapsed(false);
    }
  }, [selectedEntity]);

  if (!selectedEntity) return null;

  const { type, x, y, id } = selectedEntity;

  // Render a compact mini-badge when collapsed so the map is never obscured
  if (isCollapsed) {
    const pawn = type === 'pawn' && id ? engine.pawns.find((p) => p.id === id) : null;
    const b = type === 'building' ? engine.buildings[y]?.[x] : null;
    const bDef = b ? BUILDING_DEFS[b.type] : null;
    const it = type === 'item' ? engine.items.find((i) => i.x === x && i.y === y) : null;

    let titleText = '地形與空間';
    if (pawn) titleText = `${pawn.nickname || pawn.name} (心情 ${pawn.mood}%)`;
    else if (bDef) titleText = bDef.nameZh;
    else if (it) titleText = `物品 (${it.type})`;

    return (
      <div className="absolute bottom-28 left-4 z-30 flex items-center gap-2 bg-slate-900/95 border border-slate-700/90 rounded-xl shadow-2xl px-3 py-2 text-xs text-slate-200 backdrop-blur-md transition-all">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors"
          title="點擊展開狀態方框"
        >
          {pawn && (
            <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: pawn.color }} />
          )}
          <span className="font-bold text-white text-xs">{titleText}</span>
          <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-sky-900 transition-colors">
            👁️ 展開狀態方框 ↗
          </span>
        </button>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors ml-1"
          title="關閉選取"
        >
          ✕
        </button>
      </div>
    );
  }

  // 1. PAWN INSPECTOR
  if (type === 'pawn' && id) {
    const pawn = engine.pawns.find((p) => p.id === id);
    if (!pawn) return null;

    const currentJobText = pawn.currentJob ? pawn.currentJob.description : pawn.state === 'SLEEPING' ? '睡眠中' : '漫步無所事事';
    const jobPct = pawn.currentJob && pawn.currentJob.maxProgress > 1 ? Math.round((pawn.currentJob.progress / pawn.currentJob.maxProgress) * 100) : null;
    const pawnCellTemp = engine.temperatureGrid[pawn.y]?.[pawn.x] ?? engine.outdoorTemperature;

    const effPct = Math.round((pawn.workEfficiency ?? 1) * 100);
    const effColor = effPct >= 120 ? 'text-emerald-400' : effPct >= 100 ? 'text-slate-200' : effPct >= 80 ? 'text-amber-400' : 'text-rose-400';
    const effDesc = effPct >= 120 ? '亢奮快轉 (+25%)' : effPct >= 100 ? '標準速度' : effPct >= 80 ? '消極怠工 (-20%)' : '情緒低落 (-50%)';

    return (
      <div className="absolute bottom-28 left-4 w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs text-slate-200 z-30 backdrop-blur-md max-h-[75vh] flex flex-col overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: pawn.color }} />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{pawn.name}</span>
                <span className="text-[11px] font-normal text-slate-400">({pawn.nickname})</span>
              </div>
              <div className="text-[11px] text-slate-400">{pawn.backstory}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors shadow-sm"
              title="隱藏狀態方框，防止遮擋地圖畫面"
            >
              <span>👁️ 隱藏</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="關閉選取"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto pr-1 space-y-3.5 my-2">
          {/* Activity Banner */}
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between font-medium">
              <span className="text-slate-400">當前行動：</span>
              <span className="text-sky-300 font-semibold">{currentJobText}</span>
            </div>
            {jobPct !== null && (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-sky-400 h-full transition-all" style={{ width: `${jobPct}%` }} />
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">工作效率 (受心情影響)：</span>
              <span className={`font-mono font-bold ${effColor}`}>
                {effPct}% <span className="text-[10px] font-normal">({effDesc})</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">當前環境溫度：</span>
              <span className="font-mono font-bold text-slate-200">
                {pawnCellTemp}°C{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  {pawnCellTemp < 5 ? '(冷)' : pawnCellTemp > 30 ? '(熱)' : '(適中)'}
                </span>
              </span>
            </div>
            {pawn.mentalBreak && (
              <div className="mt-1 text-rose-400 font-bold flex items-center gap-1">
                <span>⚠️ 精神崩潰：</span>
                <span>{pawn.mentalBreak === 'dazed' ? '迷茫亂晃' : pawn.mentalBreak === 'binge' ? '暴食狂' : '悲傷漫步'}</span>
              </div>
            )}
          </div>

          {/* Needs Bars */}
          <div>
            <div className="font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>生理與心理需求 (Needs)</span>
              <span className="text-[11px] text-slate-400">心情: {pawn.mood}%</span>
            </div>
            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              {/* Mood */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">心情值 (Mood)</span>
                  <span className="font-mono text-slate-200">{pawn.mood}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pawn.mood > 60 ? 'bg-emerald-500' : pawn.mood > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pawn.mood}%` }}
                  />
                </div>
              </div>

              {/* Food */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">飽食度 (Food)</span>
                  <span className="font-mono text-slate-200">{Math.round(pawn.food)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pawn.food < 25 ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{ width: `${pawn.food}%` }}
                  />
                </div>
              </div>

              {/* Rest */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">精力休息 (Rest)</span>
                  <span className="font-mono text-slate-200">{Math.round(pawn.rest)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pawn.rest < 25 ? 'bg-rose-500' : 'bg-blue-400'}`}
                    style={{ width: `${pawn.rest}%` }}
                  />
                </div>
              </div>

              {/* Comfort */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">舒適度 (Comfort)</span>
                  <span className="font-mono text-slate-200">{Math.round(pawn.comfort ?? 70)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pawn.comfort < 25 ? 'bg-rose-500' : 'bg-teal-400'}`}
                    style={{ width: `${pawn.comfort ?? 70}%` }}
                  />
                </div>
              </div>

              {/* Recreation */}
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">娛樂值 (Joy)</span>
                  <span className="font-mono text-slate-200">{Math.round(pawn.recreation)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pawn.recreation < 25 ? 'bg-rose-500' : 'bg-purple-400'}`}
                    style={{ width: `${pawn.recreation}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Thoughts */}
          <div>
            <div className="font-semibold text-slate-300 mb-1">心情想法 (Thoughts)</div>
            <div className="space-y-1">
              {pawn.thoughts.map((th) => (
                <div key={th.id} className="flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-1 rounded">
                  <span className="text-slate-300">{th.label}</span>
                  <span className={`font-mono font-bold ${th.moodDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {th.moodDelta >= 0 ? `+${th.moodDelta}` : th.moodDelta}
                  </span>
                </div>
              ))}
              {pawn.thoughts.length === 0 && (
                <div className="text-[11px] text-slate-500 italic">殖民者內心平靜無波瀾</div>
              )}
            </div>
          </div>

          {/* Skills with Passions */}
          <div>
            <div className="font-semibold text-slate-300 mb-1">技能與熱情 (Skills & Passions)</div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              {Object.entries(pawn.skills).map(([sKey, sVal]) => {
                const label = SKILL_LABELS[sKey as SkillName] || sKey;
                const passionIcon = sVal.passion === 2 ? '🔥' : sVal.passion === 1 ? '✨' : '';
                return (
                  <div key={sKey} className="flex items-center justify-between text-[11px] px-1.5 py-0.5">
                    <span className="text-slate-400 flex items-center gap-1">
                      {label.split(' ')[0]} {passionIcon}
                    </span>
                    <span className="font-mono font-semibold text-slate-200">{Math.floor(sVal.level)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => engine.toggleDraftPawn(pawn.id)}
            className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              pawn.isDrafted
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <span>{pawn.isDrafted ? '🛡️ 解除徵召 (Undraft)' : '⚔️ 徵召防衛 (Draft)'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. BUILDING INSPECTOR
  if (type === 'building') {
    const b = engine.buildings[y][x];
    if (!b) return null;
    const def = BUILDING_DEFS[b.type];

    return (
      <div className="absolute bottom-28 left-4 w-80 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs text-slate-200 z-30 backdrop-blur-md animate-in fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="font-bold text-sm text-white">{def.nameZh}</div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors"
              title="隱藏面板以避免遮擋地圖"
            >
              👁️ 隱藏
            </button>
            <button onClick={onClose} className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors" title="關閉選取">
              ✕
            </button>
          </div>
        </div>
        <div className="my-3 space-y-2">
          <div className="text-slate-400 leading-relaxed">{def.description}</div>
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
            <span className="text-slate-400">生命值 (HP)：</span>
            <span className="font-mono text-emerald-400 font-bold">{b.hp} / {b.maxHp}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
            <span className="text-slate-400">建築材質：</span>
            <span className="capitalize text-slate-300">{b.material === 'wood' ? '原木' : b.material === 'stone' ? '石磚' : '鋼鐵'}</span>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              engine.setDesignation(x, y, 'DECONSTRUCT');
              onClose();
            }}
            className="w-full py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-200 rounded-md font-semibold transition-colors"
          >
            🔨 拆除此建築 (回收資源)
          </button>
        </div>
      </div>
    );
  }

  // 3. ITEM INSPECTOR
  if (type === 'item') {
    const item = engine.items.find((i) => i.x === x && i.y === y);
    if (!item) return null;

    const namesZh: Record<string, string> = {
      wood: '木材 (Wood)',
      steel: '鋼鐵 (Steel)',
      stone_blocks: '石磚 (Stone Blocks)',
      meal_simple: '簡易餐點 (Simple Meal)',
      berries: '野生漿果 (Berries)',
      medicine: '草藥急救包 (Medicine)',
      silver: '白銀 (Silver)',
      components: '零組件 (Components)',
    };

    return (
      <div className="absolute bottom-28 left-4 w-72 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs text-slate-200 z-30 backdrop-blur-md animate-in fade-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="font-bold text-sm text-white">{namesZh[item.type] || item.type}</div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors"
              title="隱藏面板以避免遮擋地圖"
            >
              👁️ 隱藏
            </button>
            <button onClick={onClose} className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors" title="關閉選取">
              ✕
            </button>
          </div>
        </div>
        <div className="my-3 space-y-2">
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
            <span className="text-slate-400">堆疊數量：</span>
            <span className="font-mono text-sky-400 font-bold text-sm">{item.count}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
            <span className="text-slate-400">地圖座標：</span>
            <span className="font-mono text-slate-400">X: {x}, Y: {y}</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. TILE & ROOM INSPECTOR
  const terrainType = engine.terrain[y][x];
  const room = engine.rooms.find((r) => r.cells.some((c) => c.x === x && c.y === y));
  const tileTemp = engine.temperatureGrid[y]?.[x] ?? engine.outdoorTemperature;

  return (
    <div className="absolute bottom-28 left-4 w-80 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs text-slate-200 z-30 backdrop-blur-md animate-in fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="font-bold text-sm text-white">地形與空間資訊</div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCollapsed(true)}
            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors"
            title="隱藏面板以避免遮擋地圖"
          >
            👁️ 隱藏
          </button>
          <button onClick={onClose} className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors" title="關閉選取">
            ✕
          </button>
        </div>
      </div>
      <div className="my-3 space-y-2">
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
          <span className="text-slate-400">地皮類型：</span>
          <span className="text-slate-300 font-medium">
            {terrainType === 'rich_soil' ? '🌱 肥沃土壤 (+40% 作物生長)' : terrainType === 'rocky_floor' ? '🪨 岩石平地' : '🌾 普通土壤'}
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
          <span className="text-slate-400">局部環境溫度：</span>
          <span className="font-mono font-bold text-sky-300">{tileTemp}°C</span>
        </div>
        <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
          <span className="text-slate-400">空間歸屬：</span>
          <span className="text-sky-300 font-medium">{room ? `🏠 ${room.name} (${room.type})` : '🌲 戶外露天 (Outdoors)'}</span>
        </div>
        {room && (
          <>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
              <span className="text-slate-400">室內即時溫度：</span>
              <span className={`font-mono font-bold ${room.temperature <= 0 ? 'text-sky-400' : room.temperature > 28 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {room.temperature}°C {room.temperature <= 0 ? '❄️(冷凍)' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
              <span className="text-slate-400">周圍牆體隔熱率：</span>
              <span className="font-mono text-slate-200 font-medium">{Math.round(room.insulation * 100)}%</span>
            </div>
            {(room.heatersCount > 0 || room.coolersCount > 0) && (
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
                <span className="text-slate-400">溫控運作設備：</span>
                <span className="text-slate-200">
                  {room.heatersCount > 0 ? `♨️ ${room.heatersCount} 電暖器 ` : ''}
                  {room.coolersCount > 0 ? `❄️ ${room.coolersCount} 空調冷氣` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
              <span className="text-slate-400">房間美觀度：</span>
              <span className="font-mono text-emerald-400">{room.beauty}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
