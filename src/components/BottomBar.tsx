import React, { useState } from 'react';
import { BUILDING_DEFS } from '../game/constants';
import { BuildingType, CropType } from '../types/game';

interface BottomBarProps {
  activeTool: string;
  onSetTool: (tool: any) => void;
  selectedBuildingType: BuildingType | null;
  onSetBuildingType: (type: BuildingType | null) => void;
  selectedCropType: CropType;
  onSetCropType: (crop: CropType) => void;
  activeMainTab: 'architect' | 'work' | 'research' | 'history';
  onSetActiveMainTab: (tab: 'architect' | 'work' | 'research' | 'history') => void;
  unreadLetterCount: number;
  completedResearchCount: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  activeTool,
  onSetTool,
  selectedBuildingType,
  onSetBuildingType,
  selectedCropType,
  onSetCropType,
  activeMainTab,
  onSetActiveMainTab,
  unreadLetterCount,
  completedResearchCount,
}) => {
  const [architectCategory, setArchitectCategory] = useState<'orders' | 'structure' | 'furniture' | 'production' | 'zone'>('orders');

  return (
    <div className="bg-slate-900 border-t border-slate-800 flex flex-col z-20 shrink-0">
      {/* Sub-menu panel for Architect tool choices */}
      {activeMainTab === 'architect' && (
        <div className="bg-slate-950/90 border-b border-slate-800/80 p-2.5 flex items-center justify-between text-xs overflow-x-auto gap-3">
          {/* Sub-category selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md shrink-0 border border-slate-800">
            <button
              onClick={() => setArchitectCategory('orders')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                architectCategory === 'orders' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              規劃指令
            </button>
            <button
              onClick={() => setArchitectCategory('structure')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                architectCategory === 'structure' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              結構設施
            </button>
            <button
              onClick={() => setArchitectCategory('furniture')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                architectCategory === 'furniture' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              傢俱生活
            </button>
            <button
              onClick={() => setArchitectCategory('production')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                architectCategory === 'production' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              生產與研發
            </button>
            <button
              onClick={() => setArchitectCategory('zone')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                architectCategory === 'zone' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              區域規劃
            </button>
          </div>

          {/* Action buttons inside selected category */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {architectCategory === 'orders' && (
              <>
                <button
                  onClick={() => onSetTool('select')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'select' ? 'bg-sky-600/30 border-sky-500 text-white' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🔍</span>
                  <span>選取 / 查看</span>
                </button>
                <button
                  onClick={() => onSetTool('mine')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'mine' ? 'bg-amber-600/30 border-amber-500 text-amber-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>⛏️</span>
                  <span>開採礦石 (Mine)</span>
                </button>
                <button
                  onClick={() => onSetTool('chop')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'chop' ? 'bg-orange-600/30 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🪓</span>
                  <span>伐木獲取木材</span>
                </button>
                <button
                  onClick={() => onSetTool('harvest')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'harvest' ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🌾</span>
                  <span>收割作物與漿果</span>
                </button>
                <button
                  onClick={() => onSetTool('cancel')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'cancel' ? 'bg-red-600/30 border-red-500 text-red-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>❌</span>
                  <span>取消規劃指令</span>
                </button>
              </>
            )}

            {architectCategory === 'structure' && (
              <>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('wall_wood');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'wall_wood'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🧱</span>
                  <span>木牆 (5 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('wall_stone');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'wall_stone'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🏛️</span>
                  <span>石磚牆 (5 石磚)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('door_wood');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'door_wood'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🚪</span>
                  <span>木門 (10 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('cooler');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'cooler'
                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>❄️</span>
                  <span>冷氣空調 (30 鋼鐵 + 10 木材)</span>
                </button>
              </>
            )}

            {architectCategory === 'furniture' && (
              <>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('bed');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'bed'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🛏️</span>
                  <span>單人床 (20 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('table_wood');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'table_wood'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🪑</span>
                  <span>用餐桌 (15 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('stool_wood');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'stool_wood'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🪵</span>
                  <span>木凳 (8 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('torch_lamp');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'torch_lamp'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🔥</span>
                  <span>火把燈 (5 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('heater');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'heater'
                      ? 'bg-orange-600/30 border-orange-500 text-orange-200'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>♨️</span>
                  <span>電暖器 (20 鋼鐵 + 10 木材)</span>
                </button>
              </>
            )}

            {architectCategory === 'production' && (
              <>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('campfire');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'campfire'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>⛺</span>
                  <span>露天營火 (12 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('stove');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'stove'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🍳</span>
                  <span>燃料爐灶 (25 鋼鐵 + 10 木材)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('research_bench');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'research_bench'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🔬</span>
                  <span>簡易研發台 (20 木材 + 15 鋼鐵)</span>
                </button>
                <button
                  onClick={() => {
                    onSetTool('build');
                    onSetBuildingType('horseshoe_pin');
                  }}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'build' && selectedBuildingType === 'horseshoe_pin'
                      ? 'bg-sky-600/30 border-sky-500 text-white'
                      : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🎯</span>
                  <span>擲蹄鐵環 (娛樂 10 木材)</span>
                </button>
              </>
            )}

            {architectCategory === 'zone' && (
              <>
                <button
                  onClick={() => onSetTool('zone_stockpile')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'zone_stockpile' ? 'bg-sky-600/30 border-sky-500 text-sky-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>📦</span>
                  <span>框選主要儲存區</span>
                </button>
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  <span className="text-slate-400">農田作物:</span>
                  <select
                    value={selectedCropType}
                    onChange={(e) => onSetCropType(e.target.value as CropType)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs outline-none"
                  >
                    <option value="potato">🥔 土豆 (生長快)</option>
                    <option value="corn">🌽 玉米 (產量大)</option>
                    <option value="healroot">🌿 草藥 (藥材)</option>
                  </select>
                  <button
                    onClick={() => onSetTool('zone_grow')}
                    className={`px-2 py-0.5 rounded text-xs ml-1 ${
                      activeTool === 'zone_grow' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    框選農田
                  </button>
                </div>
                <button
                  onClick={() => onSetTool('zone_delete')}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                    activeTool === 'zone_delete' ? 'bg-red-600/30 border-red-500 text-red-200' : 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>🗑️</span>
                  <span>刪除區域</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Bottom Tabs: Architect, Work, Research, History */}
      <div className="h-11 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSetActiveMainTab('architect')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeMainTab === 'architect'
                ? 'bg-slate-800 text-sky-400 border-t-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏗️</span>
            <span>建築規劃 (Architect)</span>
          </button>
          <button
            onClick={() => onSetActiveMainTab('work')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeMainTab === 'work'
                ? 'bg-slate-800 text-sky-400 border-t-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📋</span>
            <span>工作分配 (Work Tab)</span>
          </button>
          <button
            onClick={() => onSetActiveMainTab('research')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeMainTab === 'research'
                ? 'bg-slate-800 text-sky-400 border-t-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧠</span>
            <span>科技研發 (Research)</span>
            {completedResearchCount > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded-full">
                {completedResearchCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSetActiveMainTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 ${
              activeMainTab === 'history'
                ? 'bg-slate-800 text-sky-400 border-t-2 border-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📜</span>
            <span>事件紀錄 (History)</span>
            {unreadLetterCount > 0 && (
              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                {unreadLetterCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block">
          核心系統：非直接控制 · AI 自動尋路執行
        </div>
      </div>
    </div>
  );
};
