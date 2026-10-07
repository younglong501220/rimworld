import React, { useEffect, useRef, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { GameCanvas } from './components/GameCanvas';
import { HistoryModal } from './components/HistoryModal';
import { InspectorPanel } from './components/InspectorPanel';
import { LetterAlerts } from './components/LetterAlerts';
import { LetterDetailModal } from './components/LetterDetailModal';
import { ResearchModal } from './components/ResearchModal';
import { TopBar } from './components/TopBar';
import { WorkTabModal } from './components/WorkTabModal';
import { ColonyGameEngine } from './game/GameEngine';
import { BuildingType, CropType, Letter } from './types/game';
import { sounds } from './utils/audio';

export default function App() {
  const engineRef = useRef<ColonyGameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new ColonyGameEngine();
  }
  const engine = engineRef.current;

  // React state for triggers and selections
  const [, setTickState] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Active tools
  const [activeTool, setActiveTool] = useState<
    'select' | 'mine' | 'chop' | 'harvest' | 'cancel' | 'build' | 'zone_stockpile' | 'zone_grow' | 'zone_delete'
  >('select');
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<CropType>('potato');

  // Selected items & pawns
  const [selectedPawnId, setSelectedPawnId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'pawn' | 'building' | 'item' | 'tile';
    x: number;
    y: number;
    id?: string;
  } | null>(null);

  // Main UI Tabs & Modals
  const [activeMainTab, setActiveMainTab] = useState<'architect' | 'work' | 'research' | 'history'>('architect');
  const [activeLetterModal, setActiveLetterModal] = useState<Letter | null>(null);
  const [showTemperatureOverlay, setShowTemperatureOverlay] = useState(false);

  // Listen to engine updates
  useEffect(() => {
    engine.setChangeListener(() => {
      setTickState((t) => (t + 1) % 1000000);
    });
  }, [engine]);

  // Main Engine Simulation Loop (Ticks based on gameSpeed)
  useEffect(() => {
    let lastTime = performance.now();
    let tickAccumulator = 0;
    let animId: number;

    const loop = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (gameSpeed > 0) {
        // Base: 4 ticks per second at 1x
        const ticksPerSec = gameSpeed === 1 ? 4 : gameSpeed === 2 ? 8 : 14;
        tickAccumulator += delta * ticksPerSec;

        while (tickAccumulator >= 1) {
          engine.update();
          tickAccumulator -= 1;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameSpeed, engine]);

  // Keyboard Shortcuts (Space for pause, 1/2/3 for speed, Escape to cancel tool)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setGameSpeed((curr) => (curr === 0 ? 1 : 0));
      } else if (e.key === '1') {
        setGameSpeed(1);
      } else if (e.key === '2') {
        setGameSpeed(2);
      } else if (e.key === '3') {
        setGameSpeed(3);
      } else if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
        if (e.key === 'h' || e.key === 'H') {
          setSelectedEntity(null);
          setSelectedPawnId(null);
          return;
        }
        setActiveTool('select');
        setSelectedBuildingType(null);
        setSelectedEntity(null);
        setSelectedPawnId(null);
        setActiveLetterModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMute = () => {
    sounds.isMuted = !sounds.isMuted;
    setIsMuted(sounds.isMuted);
  };

  const handleSelectPawn = (pawnId: string) => {
    if (selectedPawnId === pawnId) {
      // Toggle off / hide if clicking the same pawn
      setSelectedPawnId(null);
      setSelectedEntity(null);
      return;
    }
    setSelectedPawnId(pawnId);
    const p = engine.pawns.find((pawn) => pawn.id === pawnId);
    if (p) {
      setSelectedEntity({ type: 'pawn', x: p.x, y: p.y, id: pawnId });
    }
  };

  const unreadLetterCount = engine.letters.filter((l) => !l.read).length;
  const completedResearchCount = engine.researchProjects.filter((p) => p.isCompleted).length;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top HUD Bar */}
      <TopBar
        engine={engine}
        gameSpeed={gameSpeed}
        onSetSpeed={setGameSpeed}
        selectedPawnId={selectedPawnId}
        onSelectPawn={handleSelectPawn}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Center Main Game Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Game Canvas */}
        <GameCanvas
          engine={engine}
          activeTool={activeTool}
          selectedBuildingType={selectedBuildingType}
          selectedCropType={selectedCropType}
          selectedPawnId={selectedPawnId}
          selectedEntity={selectedEntity}
          showTemperatureOverlay={showTemperatureOverlay}
          onToggleTemperatureOverlay={() => setShowTemperatureOverlay((prev) => !prev)}
          onSelectEntity={(ent) => {
            setSelectedEntity(ent);
            if (ent && ent.type === 'pawn' && ent.id) {
              setSelectedPawnId(ent.id);
            } else {
              setSelectedPawnId(null);
            }
          }}
        />

        {/* Right-edge Storyteller Alert Letters */}
        <LetterAlerts
          letters={engine.letters}
          onOpenLetter={(letter) => {
            letter.read = true;
            setActiveLetterModal(letter);
          }}
          onDismissLetter={(id) => {
            engine.letters = engine.letters.filter((l) => l.id !== id);
            setTickState((t) => t + 1);
          }}
        />

        {/* Floating Entity Inspector Panel (Bottom-Left) */}
        <InspectorPanel
          engine={engine}
          selectedEntity={selectedEntity}
          onClose={() => {
            setSelectedEntity(null);
            setSelectedPawnId(null);
          }}
        />
      </div>

      {/* Bottom HUD / Architect Control Bar */}
      <BottomBar
        activeTool={activeTool}
        onSetTool={(tool) => {
          setActiveTool(tool);
          if (tool !== 'build') setSelectedBuildingType(null);
        }}
        selectedBuildingType={selectedBuildingType}
        onSetBuildingType={setSelectedBuildingType}
        selectedCropType={selectedCropType}
        onSetCropType={setSelectedCropType}
        activeMainTab={activeMainTab}
        onSetActiveMainTab={setActiveMainTab}
        unreadLetterCount={unreadLetterCount}
        completedResearchCount={completedResearchCount}
      />

      {/* Modals */}
      {activeMainTab === 'work' && (
        <WorkTabModal engine={engine} onClose={() => setActiveMainTab('architect')} />
      )}

      {activeMainTab === 'research' && (
        <ResearchModal engine={engine} onClose={() => setActiveMainTab('architect')} />
      )}

      {activeMainTab === 'history' && (
        <HistoryModal
          letters={engine.letters}
          onClose={() => setActiveMainTab('architect')}
          onJumpTo={(x, y) => {
            setSelectedEntity({ type: 'tile', x, y });
          }}
        />
      )}

      {activeLetterModal && (
        <LetterDetailModal
          letter={activeLetterModal}
          onClose={() => setActiveLetterModal(null)}
          onJumpTo={(x, y) => {
            setSelectedEntity({ type: 'tile', x, y });
          }}
        />
      )}
    </div>
  );
}
