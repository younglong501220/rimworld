import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BUILDING_DEFS, TILE_SIZE } from '../game/constants';
import { ColonyGameEngine } from '../game/GameEngine';
import { BuildingType, CropType, DesignationType, ZoneType } from '../types/game';

interface GameCanvasProps {
  engine: ColonyGameEngine;
  activeTool: 'select' | 'mine' | 'chop' | 'harvest' | 'cancel' | 'build' | 'zone_stockpile' | 'zone_grow' | 'zone_delete';
  selectedBuildingType: BuildingType | null;
  selectedCropType: CropType;
  selectedPawnId: string | null;
  selectedEntity: { type: 'pawn' | 'building' | 'item' | 'tile'; x: number; y: number; id?: string } | null;
  onSelectEntity: (entity: { type: 'pawn' | 'building' | 'item' | 'tile'; x: number; y: number; id?: string } | null) => void;
  showTemperatureOverlay: boolean;
  onToggleTemperatureOverlay: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  activeTool,
  selectedBuildingType,
  selectedCropType,
  selectedPawnId,
  selectedEntity,
  onSelectEntity,
  showTemperatureOverlay,
  onToggleTemperatureOverlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera State
  const [camera, setCamera] = useState({
    x: 10 * TILE_SIZE,
    y: 10 * TILE_SIZE,
    zoom: 1.0,
  });

  const isDraggingCamera = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cameraStartPos = useRef({ x: 0, y: 0 });

  // Box drag designation state
  const isBoxSelecting = useRef(false);
  const boxStartTile = useRef<{ x: number; y: number } | null>(null);
  const boxCurrentTile = useRef<{ x: number; y: number } | null>(null);

  // Track animation frame
  const animFrameId = useRef<number | null>(null);

  // Focus on selected pawn when clicked from top bar
  useEffect(() => {
    if (selectedPawnId) {
      const p = engine.pawns.find((pawn) => pawn.id === selectedPawnId);
      if (p) {
        setCamera((prev) => ({
          ...prev,
          x: p.realX + TILE_SIZE / 2,
          y: p.realY + TILE_SIZE / 2,
        }));
      }
    }
  }, [selectedPawnId, engine.pawns]);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const rect = cvs.getBoundingClientRect();
      cvs.width = rect.width * window.devicePixelRatio;
      cvs.height = rect.height * window.devicePixelRatio;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply Camera Transform
    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const mapPxW = engine.mapWidth * TILE_SIZE;
    const mapPxH = engine.mapHeight * TILE_SIZE;

    // 1. Draw Map Boundary & Background void
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-200, -200, mapPxW + 400, mapPxH + 400);

    // 2. Terrain Layer
    for (let y = 0; y < engine.mapHeight; y++) {
      for (let x = 0; x < engine.mapWidth; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const t = engine.terrain[y][x];

        if (t === 'rich_soil') {
          ctx.fillStyle = '#3a2e1d'; // Rich dark loam
        } else if (t === 'rocky_floor') {
          ctx.fillStyle = '#334155'; // Slate/stone floor
        } else {
          ctx.fillStyle = '#47553c'; // Standard soil/grass
        }
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Subtle tile grid lines
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    // 3. Zones Layer
    for (const zone of engine.zones) {
      ctx.fillStyle = zone.color;
      for (const cell of zone.cells) {
        ctx.fillRect(cell.x * TILE_SIZE, cell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = zone.type === 'stockpile' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(74, 222, 128, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cell.x * TILE_SIZE + 2, cell.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
    }

    // 4. Natural Features (Rocks, Trees, Berry Bushes)
    for (let y = 0; y < engine.mapHeight; y++) {
      for (let x = 0; x < engine.mapWidth; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const feat = engine.naturalFeatures[y][x];
        if (!feat) continue;

        if (feat.type === 'rock') {
          // Rock Outcrop
          let rockColor = '#475569';
          let oreColor = '#64748b';

          if (feat.mineral === 'steel_vein') {
            rockColor = '#3b4c5e';
            oreColor = '#94a3b8';
          } else if (feat.mineral === 'silver_vein') {
            rockColor = '#334155';
            oreColor = '#e2e8f0';
          }

          ctx.fillStyle = rockColor;
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

          // Ore mineral specks
          ctx.fillStyle = oreColor;
          ctx.beginPath();
          ctx.arc(px + 12, py + 14, 4, 0, Math.PI * 2);
          ctx.arc(px + 24, py + 22, 3, 0, Math.PI * 2);
          ctx.arc(px + 18, py + 26, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Highlight edges
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (feat.type === 'tree') {
          // Tree trunk & canopy
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 15, py + 22, 6, 12); // Trunk

          // Lush canopy foliage
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(px + 18, py + 14, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.arc(px + 16, py + 12, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (feat.type === 'berry_bush') {
          // Berry Bush
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.arc(px + 18, py + 20, 10, 0, Math.PI * 2);
          ctx.fill();

          if (feat.isRipe) {
            // Ripe red berries
            ctx.fillStyle = '#ef4444';
            [
              [14, 16],
              [22, 17],
              [18, 24],
              [12, 22],
              [23, 23],
            ].forEach(([bx, by]) => {
              ctx.beginPath();
              ctx.arc(px + bx, py + by, 2.5, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      }
    }

    // 5. Buildings Layer
    for (let y = 0; y < engine.mapHeight; y++) {
      for (let x = 0; x < engine.mapWidth; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const b = engine.buildings[y][x];
        if (!b) continue;

        if (b.type === 'wall_wood') {
          // Wood Wall
          ctx.fillStyle = '#854d0e';
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = '#a16207';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.strokeStyle = '#713f12';
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (b.type === 'wall_stone') {
          // Stone Wall
          ctx.fillStyle = '#64748b';
          ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = '#475569';
          ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (b.type === 'door_wood') {
          // Wooden Door
          ctx.fillStyle = '#b45309';
          ctx.fillRect(px + 4, py + 2, TILE_SIZE - 8, TILE_SIZE - 4);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px + 12, py + 18, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'bed') {
          // Bed
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // Mattress blanket
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px + 6, py + 12, TILE_SIZE - 12, TILE_SIZE - 18);
          // Pillow
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(px + 8, py + 6, TILE_SIZE - 16, 5);
        } else if (b.type === 'table_wood') {
          // Wooden Dining Table
          ctx.fillStyle = '#92400e';
          ctx.fillRect(px + 3, py + 5, TILE_SIZE - 6, TILE_SIZE - 10);
          ctx.strokeStyle = '#78350f';
          ctx.strokeRect(px + 3, py + 5, TILE_SIZE - 6, TILE_SIZE - 10);
        } else if (b.type === 'stool_wood') {
          // Stool
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(px + 18, py + 18, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'campfire') {
          // Campfire
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.arc(px + 18, py + 18, 10, 0, Math.PI * 2);
          ctx.stroke();

          // Flames
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(px + 18, py + 17, 6 + Math.sin(Date.now() * 0.01) * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(px + 18, py + 16, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'stove') {
          // Stove
          ctx.fillStyle = '#334155';
          ctx.fillRect(px + 3, py + 4, TILE_SIZE - 6, TILE_SIZE - 8);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(px + 8, py + 10, 8, 8);
        } else if (b.type === 'research_bench') {
          // Research Bench
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px + 2, py + 4, TILE_SIZE - 4, TILE_SIZE - 8);
          // Papers / computer screen
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px + 6, py + 8, 10, 8);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(px + 20, py + 12, 10, 10);
        } else if (b.type === 'horseshoe_pin') {
          // Horseshoe pin
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(px + 18, py + 18, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px + 24, py + 22, 5, 0, Math.PI * 1.5);
          ctx.stroke();
        } else if (b.type === 'torch_lamp') {
          // Torch
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 16, py + 14, 4, 14);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px + 18, py + 12, 4 + Math.sin(Date.now() * 0.015) * 1, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'heater') {
          // Space Heater
          ctx.fillStyle = '#475569';
          ctx.fillRect(px + 6, py + 8, TILE_SIZE - 12, TILE_SIZE - 14);
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(px + 9, py + 12, TILE_SIZE - 18, 3);
          ctx.fillRect(px + 9, py + 18, TILE_SIZE - 18, 3);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(px + 10, py + 13, TILE_SIZE - 20, 1);
        } else if (b.type === 'cooler') {
          // Air Cooler
          ctx.fillStyle = '#334155';
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(px + 18, py + 18, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px + 18, py + 18, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 6. Blueprints Layer (Semi-transparent with work progress)
    for (const bp of engine.blueprints.values()) {
      const px = bp.x * TILE_SIZE;
      const py = bp.y * TILE_SIZE;

      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 2]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Blueprint building text icon
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(BUILDING_DEFS[bp.buildingType].nameZh.slice(0, 2), px + 18, py + 22);

      // Work progress bar
      if (bp.workProgress > 0) {
        const pct = bp.workProgress / bp.maxWork;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(px + 3, py + 28, TILE_SIZE - 6, 4);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + 3, py + 28, (TILE_SIZE - 6) * pct, 4);
      }
      ctx.restore();
    }

    // 7. Ground Items Layer
    for (const item of engine.items) {
      const px = item.x * TILE_SIZE;
      const py = item.y * TILE_SIZE;

      if (item.type === 'wood') {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 6, py + 12, 22, 6);
        ctx.fillRect(px + 8, py + 18, 20, 6);
      } else if (item.type === 'steel') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px + 8, py + 14, 18, 8);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(px + 8, py + 14, 18, 8);
      } else if (item.type === 'stone_blocks') {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px + 8, py + 14, 20, 9);
      } else if (item.type === 'meal_simple') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px + 18, py + 18, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 12, py + 16, 12, 3);
      } else if (item.type === 'berries') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px + 14, py + 17, 4, 0, Math.PI * 2);
        ctx.arc(px + 22, py + 17, 4, 0, Math.PI * 2);
        ctx.arc(px + 18, py + 22, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'medicine') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(px + 9, py + 11, 16, 14);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px + 15, py + 13, 4, 10);
        ctx.fillRect(px + 12, py + 16, 10, 4);
      } else if (item.type === 'silver') {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(px + 18, py + 18, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'components') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(px + 10, py + 12, 14, 12);
      }

      // Count label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.count}`, px + TILE_SIZE - 4, py + TILE_SIZE - 3);
    }

    // 8. Designations Layer (Mine, Chop, Harvest, etc.)
    for (let y = 0; y < engine.mapHeight; y++) {
      for (let x = 0; x < engine.mapWidth; x++) {
        const des = engine.designations[y][x];
        if (!des) continue;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (des === 'MINE') {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#fef08a';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⛏️', px + 18, py + 23);
        } else if (des === 'CHOP') {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#ffedd5';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪓', px + 18, py + 23);
        } else if (des === 'HARVEST') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#dcfce7';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🌾', px + 18, py + 23);
        }
      }
    }

    // 9. Hostile Animals
    for (const animal of engine.hostileAnimals) {
      const px = animal.realX;
      const py = animal.realY;

      // Animal body (Brown/Dark red)
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(px + 18, py + 20, 11, 0, Math.PI * 2);
      ctx.fill();

      // Mad eyes (Glowing red)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px + 14, py + 17, 2.5, 0, Math.PI * 2);
      ctx.arc(px + 22, py + 17, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // HP Bar
      const pct = animal.hp / animal.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(px + 4, py + 2, 28, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + 4, py + 2, 28 * pct, 4);
    }

    // 10. Pawns Layer (Colonists)
    for (const pawn of engine.pawns) {
      const px = pawn.realX;
      const py = pawn.realY;
      const isSelected = selectedPawnId === pawn.id || (selectedEntity?.type === 'pawn' && selectedEntity.id === pawn.id);

      // Selection indicator circle
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + 18, py + 18, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Drafted badge
      if (pawn.isDrafted) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px + 28, py + 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Colonist body
      ctx.fillStyle = pawn.color;
      ctx.beginPath();
      ctx.arc(px + 18, py + 20, 9, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fed7aa'; // Skin tone
      ctx.beginPath();
      ctx.arc(px + 18, py + 12, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 15, py + 11, 1.5, 2);
      ctx.fillRect(px + 19, py + 11, 1.5, 2);

      // Name tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pawn.nickname, px + 18, py - 4);

      // Job progress bar above head
      if (pawn.state === 'WORKING' && pawn.currentJob && pawn.currentJob.maxProgress > 1) {
        const pct = pawn.currentJob.progress / pawn.currentJob.maxProgress;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(px + 2, py - 12, 32, 4);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(px + 2, py - 12, 32 * pct, 4);
      }

      // Mental break or state icon bubble
      if (pawn.mentalBreak) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '12px sans-serif';
        ctx.fillText('💢', px + 28, py + 6);
      } else if (pawn.state === 'SLEEPING') {
        ctx.fillStyle = '#60a5fa';
        ctx.font = '12px sans-serif';
        ctx.fillText('💤', px + 28, py + 6);
      }
    }

    // 11. Day / Night Lighting Ambient
    // Game hour: 0-24. Night from 20:00 to 5:00
    let darkness = 0;
    if (engine.gameHour < 5 || engine.gameHour > 21) {
      darkness = 0.55;
    } else if (engine.gameHour >= 5 && engine.gameHour <= 7) {
      darkness = 0.55 * (1 - (engine.gameHour - 5) / 2); // Sunrise
    } else if (engine.gameHour >= 19 && engine.gameHour <= 21) {
      darkness = 0.55 * ((engine.gameHour - 19) / 2); // Sunset
    }

    if (darkness > 0.05) {
      ctx.save();
      ctx.fillStyle = `rgba(15, 23, 42, ${darkness})`;
      ctx.fillRect(0, 0, mapPxW, mapPxH);

      // Light cutouts for torches and campfires
      ctx.globalCompositeOperation = 'destination-out';
      for (let y = 0; y < engine.mapHeight; y++) {
        for (let x = 0; x < engine.mapWidth; x++) {
          const b = engine.buildings[y][x];
          if (b && (b.type === 'campfire' || b.type === 'torch_lamp')) {
            const rad = b.type === 'campfire' ? 90 : 60;
            const grad = ctx.createRadialGradient(
              x * TILE_SIZE + 18,
              y * TILE_SIZE + 18,
              10,
              x * TILE_SIZE + 18,
              y * TILE_SIZE + 18,
              rad
            );
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x * TILE_SIZE + 18, y * TILE_SIZE + 18, rad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // 12. Temperature Layer (Thermal Overlay)
    if (showTemperatureOverlay) {
      ctx.save();
      for (let y = 0; y < engine.mapHeight; y++) {
        for (let x = 0; x < engine.mapWidth; x++) {
          const temp = engine.temperatureGrid[y]?.[x] ?? engine.outdoorTemperature;
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          let heatColor = 'rgba(16, 185, 129, 0.35)'; // comfortable green
          if (temp <= -10) {
            heatColor = 'rgba(30, 58, 138, 0.65)'; // deep blue
          } else if (temp <= 0) {
            heatColor = 'rgba(2, 132, 199, 0.55)'; // cold ice blue
          } else if (temp <= 15) {
            heatColor = 'rgba(20, 184, 166, 0.42)'; // cool teal
          } else if (temp <= 24) {
            heatColor = 'rgba(34, 197, 94, 0.35)'; // pleasant green
          } else if (temp <= 34) {
            heatColor = 'rgba(249, 115, 22, 0.5)'; // warm orange
          } else {
            heatColor = 'rgba(225, 29, 72, 0.65)'; // scorching red
          }

          ctx.fillStyle = heatColor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }

      // Draw Room Temperature Badges in center of each enclosed room
      for (const room of engine.rooms) {
        if (!room.isEnclosed || room.cells.length === 0) continue;
        let avgX = 0;
        let avgY = 0;
        for (const c of room.cells) {
          avgX += c.x;
          avgY += c.y;
        }
        avgX = Math.round(avgX / room.cells.length);
        avgY = Math.round(avgY / room.cells.length);

        const rpx = avgX * TILE_SIZE;
        const rpy = avgY * TILE_SIZE;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(rpx - 14, rpy + 4, 64, 22);
        ctx.strokeStyle = room.temperature <= 0 ? '#38bdf8' : room.temperature > 30 ? '#f97316' : '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rpx - 14, rpy + 4, 64, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${room.temperature}°C`, rpx + 18, rpy + 16);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText(`保溫:${Math.round(room.insulation * 100)}%`, rpx + 18, rpy + 23);
      }
      ctx.restore();
    }

    // 13. Active Drag Box Preview
    if (isBoxSelecting.current && boxStartTile.current && boxCurrentTile.current) {
      const minX = Math.min(boxStartTile.current.x, boxCurrentTile.current.x);
      const maxX = Math.max(boxStartTile.current.x, boxCurrentTile.current.x);
      const minY = Math.min(boxStartTile.current.y, boxCurrentTile.current.y);
      const maxY = Math.max(boxStartTile.current.y, boxCurrentTile.current.y);

      const bx = minX * TILE_SIZE;
      const by = minY * TILE_SIZE;
      const bw = (maxX - minX + 1) * TILE_SIZE;
      const bh = (maxY - minY + 1) * TILE_SIZE;

      ctx.fillStyle =
        activeTool === 'mine'
          ? 'rgba(234, 179, 8, 0.3)'
          : activeTool === 'build'
          ? 'rgba(56, 189, 248, 0.3)'
          : activeTool === 'chop'
          ? 'rgba(249, 115, 22, 0.3)'
          : activeTool === 'zone_stockpile'
          ? 'rgba(56, 189, 248, 0.25)'
          : activeTool === 'zone_grow'
          ? 'rgba(74, 222, 128, 0.25)'
          : 'rgba(239, 68, 68, 0.3)';

      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
    }

    ctx.restore();
  }, [camera, engine, activeTool, selectedEntity, selectedPawnId, showTemperatureOverlay]);

  // Request Animation Frame loop
  useEffect(() => {
    const loop = () => {
      render();
      animFrameId.current = requestAnimationFrame(loop);
    };
    animFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [render]);

  // Convert client mouse coord to world map grid coordinate
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { gx: 0, gy: 0, wx: 0, wy: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;

      const wx = (sx - rect.width / 2) / camera.zoom + camera.x;
      const wy = (sy - rect.height / 2) / camera.zoom + camera.y;

      const gx = Math.floor(wx / TILE_SIZE);
      const gy = Math.floor(wy / TILE_SIZE);

      return { gx, gy, wx, wy };
    },
    [camera]
  );

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.button === 2) {
      // Middle or Right click drags camera
      isDraggingCamera.current = true;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      cameraStartPos.current = { x: camera.x, y: camera.y };
      return;
    }

    if (e.button === 0) {
      // Left click
      const { gx, gy } = screenToWorld(e.clientX, e.clientY);
      if (gx < 0 || gx >= engine.mapWidth || gy < 0 || gy >= engine.mapHeight) return;

      if (activeTool === 'select') {
        // Check if drafted pawn should move/attack on right click or if selecting entity
        // Check Pawn first
        const clickedPawn = engine.pawns.find((p) => p.x === gx && p.y === gy);
        if (clickedPawn) {
          onSelectEntity({ type: 'pawn', x: gx, y: gy, id: clickedPawn.id });
          return;
        }

        // Check Building
        const b = engine.buildings[gy][gx];
        if (b) {
          onSelectEntity({ type: 'building', x: gx, y: gy, id: b.id });
          return;
        }

        // Check Ground Item
        const item = engine.items.find((i) => i.x === gx && i.y === gy);
        if (item) {
          onSelectEntity({ type: 'item', x: gx, y: gy, id: item.id });
          return;
        }

        // Otherwise select tile
        onSelectEntity({ type: 'tile', x: gx, y: gy });
      } else {
        // Start multi-tile designation box drag
        isBoxSelecting.current = true;
        boxStartTile.current = { x: gx, y: gy };
        boxCurrentTile.current = { x: gx, y: gy };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingCamera.current) {
      const dx = (e.clientX - dragStartPos.current.x) / camera.zoom;
      const dy = (e.clientY - dragStartPos.current.y) / camera.zoom;
      setCamera((prev) => ({
        ...prev,
        x: cameraStartPos.current.x - dx,
        y: cameraStartPos.current.y - dy,
      }));
      return;
    }

    if (isBoxSelecting.current) {
      const { gx, gy } = screenToWorld(e.clientX, e.clientY);
      boxCurrentTile.current = { x: gx, y: gy };
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingCamera.current) {
      isDraggingCamera.current = false;
      return;
    }

    if (isBoxSelecting.current && boxStartTile.current && boxCurrentTile.current) {
      isBoxSelecting.current = false;

      const minX = Math.max(0, Math.min(boxStartTile.current.x, boxCurrentTile.current.x));
      const maxX = Math.min(engine.mapWidth - 1, Math.max(boxStartTile.current.x, boxCurrentTile.current.x));
      const minY = Math.max(0, Math.min(boxStartTile.current.y, boxCurrentTile.current.y));
      const maxY = Math.min(engine.mapHeight - 1, Math.max(boxStartTile.current.y, boxCurrentTile.current.y));

      const selectedCells: { x: number; y: number }[] = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          selectedCells.push({ x, y });

          if (activeTool === 'mine') {
            engine.setDesignation(x, y, 'MINE');
          } else if (activeTool === 'chop') {
            engine.setDesignation(x, y, 'CHOP');
          } else if (activeTool === 'harvest') {
            engine.setDesignation(x, y, 'HARVEST');
          } else if (activeTool === 'cancel') {
            engine.setDesignation(x, y, null);
          } else if (activeTool === 'build' && selectedBuildingType) {
            engine.placeBlueprint(selectedBuildingType, x, y);
          }
        }
      }

      if (activeTool === 'zone_stockpile') {
        engine.createZone('stockpile', selectedCells);
      } else if (activeTool === 'zone_grow') {
        engine.createZone('growing', selectedCells, selectedCropType);
      } else if (activeTool === 'zone_delete') {
        for (const cell of selectedCells) {
          engine.removeZoneAt(cell.x, cell.y);
        }
      }

      boxStartTile.current = null;
      boxCurrentTile.current = null;
    }
  };

  // Right Click Context Handler (Issue direct draft movement or cancel)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { gx, gy } = screenToWorld(e.clientX, e.clientY);

    // If selected pawn is drafted, order movement/attack!
    if (selectedPawnId) {
      const pawn = engine.pawns.find((p) => p.id === selectedPawnId);
      if (pawn && pawn.isDrafted) {
        engine.issueDraftMove(pawn.id, gx, gy);
      }
    }
  };

  // Zoom with Wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2.5, prev.zoom * zoomFactor)),
    }));
  };

  // Keyboard navigation (WASD or Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 30 / camera.zoom;
      if (e.key === 'w' || e.key === 'ArrowUp') {
        setCamera((prev) => ({ ...prev, y: prev.y - step }));
      } else if (e.key === 's' || e.key === 'ArrowDown') {
        setCamera((prev) => ({ ...prev, y: prev.y + step }));
      } else if (e.key === 'a' || e.key === 'ArrowLeft') {
        setCamera((prev) => ({ ...prev, x: prev.x - step }));
      } else if (e.key === 'd' || e.key === 'ArrowRight') {
        setCamera((prev) => ({ ...prev, x: prev.x + step }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera.zoom]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      />

      {/* Floating Camera Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 text-xs text-slate-300 shadow-xl backdrop-blur-sm">
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.2) }))}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          title="放大 (Zoom In)"
        >
          +
        </button>
        <span className="px-1.5 font-mono text-[11px] tabular-nums">{Math.round(camera.zoom * 100)}%</span>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(0.5, prev.zoom * 0.8) }))}
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          title="縮小 (Zoom Out)"
        >
          -
        </button>
        <button
          onClick={() =>
            setCamera({
              x: (engine.mapWidth * TILE_SIZE) / 2,
              y: (engine.mapHeight * TILE_SIZE) / 2,
              zoom: 1.0,
            })
          }
          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          title="重置視角"
        >
          居中
        </button>
        <span className="w-px h-3 bg-slate-700 mx-0.5" />
        <button
          onClick={onToggleTemperatureOverlay}
          className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
            showTemperatureOverlay
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="切換熱量與溫度圖層 (Temperature Layer)"
        >
          <span>🌡️</span>
          <span>{showTemperatureOverlay ? '關閉溫度圖' : '溫度圖層'}</span>
        </button>
      </div>

      {/* Key Tips Overlay */}
      <div className="absolute bottom-2 left-4 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 backdrop-blur-sm pointer-events-none">
        WASD/方向鍵平移視角 · 滑鼠滾輪縮放 · 右鍵拖曳視角 / 徵召右鍵指令 · 框選快速規劃
      </div>
    </div>
  );
};
