import React, { useState } from 'react';
import { BotDifficulty, MapId, MapSelectionId, Team } from '../types/game';
import { MAP_OPTIONS } from '../game/constants';
import { soundManager } from '../game/audio/SoundManager';
import { X, Play, Bot, Shield, Check, Compass, Zap, Dice5 } from 'lucide-react';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTraining: (mapId: MapId, difficulty: BotDifficulty, team: Team) => void;
  defaultMapId: MapSelectionId;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  isOpen,
  onClose,
  onStartTraining,
  defaultMapId
}) => {
  const [selectedMap, setSelectedMap] = useState<MapSelectionId>(defaultMapId || 'paper_city');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [selectedTeam, setSelectedTeam] = useState<Team>('BLUE');

  if (!isOpen) return null;

  const handleStart = () => {
    soundManager.playButtonClick();
    let actualMap: MapId;
    if (selectedMap === 'random') {
      const maps: MapId[] = ['paper_city', 'paper_factory', 'paper_island'];
      actualMap = maps[Math.floor(Math.random() * maps.length)];
    } else {
      actualMap = selectedMap;
    }
    onStartTraining(actualMap, difficulty, selectedTeam);
  };

  return (
    <div
      id="training-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div className="paper-card relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#fffdfa] border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] text-slate-900 overflow-hidden">
        
        {/* Header (Sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 bg-[#fffdfa] border-b-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-sm">
              🤖
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black font-comic tracking-wide text-slate-950">
                MODO TREINAMENTO
              </h3>
              <p className="text-xs font-bold text-amber-700">
                100% Offline • Jogue contra 11 Bots com IA de Papel
              </p>
            </div>
          </div>
          <button
            id="btn-close-training-modal"
            onClick={() => { soundManager.playButtonClick(); onClose(); }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 transition"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* 1. Difficulty Selection */}
          <div>
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block mb-2">
              1. Dificuldade dos Bots:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Fácil', desc: 'Reação suave e miras lentas', icon: '🟢' },
                { id: 'medium', label: 'Médio', desc: 'Competitivo e balanceado', icon: '🟡' },
                { id: 'hard', label: 'Difícil', desc: 'Reflexos ágeis e mira precisa', icon: '🔴' }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => { soundManager.playButtonClick(); setDifficulty(lvl.id as BotDifficulty); }}
                  className={`p-3 rounded-2xl border-2 text-left transition relative cursor-pointer ${
                    difficulty === lvl.id
                      ? 'border-slate-900 bg-amber-200/90 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">{lvl.icon}</span>
                    {difficulty === lvl.id && (
                      <Check className="w-4 h-4 text-slate-900 stroke-[3]" />
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-950 font-comic">{lvl.label}</h4>
                  <p className="text-[10px] font-semibold text-slate-600 line-clamp-2 mt-0.5">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Map Selection (4 Options including ALEATÓRIO) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block">
                2. Arena de Papel (4 Opções):
              </label>
              <span className="text-[11px] text-amber-700 font-bold">
                Role para ver todos se necessário
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(MAP_OPTIONS) as MapSelectionId[]).map((mKey) => {
                const opt = MAP_OPTIONS[mKey];
                const isCurrent = selectedMap === mKey;
                return (
                  <button
                    key={mKey}
                    id={`training-map-btn-${mKey}`}
                    onClick={() => { soundManager.playButtonClick(); setSelectedMap(mKey); }}
                    className={`p-3 rounded-2xl border-2 text-left transition relative flex items-center gap-3 cursor-pointer ${
                      isCurrent
                        ? 'border-slate-900 bg-amber-200/90 shadow-sm ring-2 ring-amber-400'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-xl shrink-0">
                      {mKey === 'paper_city' ? '🏙️' : mKey === 'paper_factory' ? '🏭' : mKey === 'paper_island' ? '🏝️' : '🎲'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-slate-950 font-comic truncate">
                          {opt.name}
                        </h4>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-800 rounded font-bold uppercase">
                          {opt.theme}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                        {opt.shortDescription}
                      </p>
                    </div>

                    {isCurrent && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Team Selection */}
          <div>
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block mb-2">
              3. Sua Equipe:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { soundManager.playButtonClick(); setSelectedTeam('BLUE'); }}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                  selectedTeam === 'BLUE'
                    ? 'border-blue-600 bg-blue-100 shadow-sm ring-2 ring-blue-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border border-slate-900" />
                  <span className="font-comic font-black text-xs sm:text-sm text-blue-950">TIME AZUL</span>
                </div>
                {selectedTeam === 'BLUE' && <Check className="w-4 h-4 text-blue-800 stroke-[3]" />}
              </button>

              <button
                onClick={() => { soundManager.playButtonClick(); setSelectedTeam('RED'); }}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between cursor-pointer ${
                  selectedTeam === 'RED'
                    ? 'border-rose-600 bg-rose-100 shadow-sm ring-2 ring-rose-400'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-rose-500 border border-slate-900" />
                  <span className="font-comic font-black text-xs sm:text-sm text-rose-950">TIME VERMELHO</span>
                </div>
                {selectedTeam === 'RED' && <Check className="w-4 h-4 text-rose-800 stroke-[3]" />}
              </button>
            </div>
          </div>

        </div>

        {/* Footer Action Button (Sticky) */}
        <div className="sticky bottom-0 z-10 p-4 sm:p-5 bg-[#fffdfa] border-t-2 border-slate-200">
          <button
            id="btn-start-training"
            onClick={handleStart}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-comic font-black text-base sm:text-lg border-3 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-3 transition cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>INICIAR TREINAMENTO OFFLINE</span>
          </button>
        </div>

      </div>
    </div>
  );
};
