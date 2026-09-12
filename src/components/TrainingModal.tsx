import React, { useState } from 'react';
import { BotDifficulty, MapId, Team } from '../types/game';
import { MAPS } from '../game/constants';
import { soundManager } from '../game/audio/SoundManager';
import { X, Play, Bot, Shield, Check, Compass, Zap } from 'lucide-react';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTraining: (mapId: MapId, difficulty: BotDifficulty, team: Team) => void;
  defaultMapId: MapId;
}

export const TrainingModal: React.FC<TrainingModalProps> = ({
  isOpen,
  onClose,
  onStartTraining,
  defaultMapId
}) => {
  const [selectedMap, setSelectedMap] = useState<MapId>(defaultMapId || 'paper_city');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [selectedTeam, setSelectedTeam] = useState<Team>('BLUE');

  if (!isOpen) return null;

  const handleStart = () => {
    soundManager.playButtonClick();
    onStartTraining(selectedMap, difficulty, selectedTeam);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="paper-card relative w-full max-w-lg rounded-3xl p-6 bg-[#fffdfa] border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] text-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-sm">
              🤖
            </div>
            <div>
              <h3 className="text-2xl font-black font-comic tracking-wide text-slate-950">
                MODO TREINAMENTO
              </h3>
              <p className="text-xs font-bold text-amber-700">
                100% Offline • Jogue contra 11 Bots de Papel
              </p>
            </div>
          </div>
          <button
            onClick={() => { soundManager.playButtonClick(); onClose(); }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 transition"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Difficulty Selection */}
          <div>
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block mb-2">
              Dificuldade dos Bots:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Fácil', desc: 'Reação suave, ideal para novatos', icon: '🟢' },
                { id: 'medium', label: 'Médio', desc: 'Balanceado e competitivo', icon: '🟡' },
                { id: 'hard', label: 'Difícil', desc: 'Miras rápidas e reflexos ágeis', icon: '🔴' }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => { soundManager.playButtonClick(); setDifficulty(lvl.id as BotDifficulty); }}
                  className={`p-3 rounded-2xl border-2 text-left transition relative ${
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
                  <h4 className="text-sm font-black text-slate-950 font-comic">{lvl.label}</h4>
                  <p className="text-[10px] font-semibold text-slate-600 line-clamp-2 mt-0.5">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Map Selection */}
          <div>
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block mb-2">
              Escolha a Arena de Dobradura:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(MAPS).map((m) => (
                <button
                  key={m.id}
                  onClick={() => { soundManager.playButtonClick(); setSelectedMap(m.id); }}
                  className={`p-3 rounded-2xl border-2 text-left transition relative ${
                    selectedMap === m.id
                      ? 'border-slate-900 bg-amber-200/90 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl mb-1 block">
                    {m.id === 'paper_city' ? '🏙️' : m.id === 'paper_factory' ? '🏭' : '🏝️'}
                  </span>
                  <h4 className="text-xs font-black text-slate-950 font-comic">{m.name}</h4>
                  {selectedMap === m.id && (
                    <div className="absolute top-2 right-2 bg-slate-900 text-white rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider font-comic block mb-2">
              Sua Equipe:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { soundManager.playButtonClick(); setSelectedTeam('BLUE'); }}
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between ${
                  selectedTeam === 'BLUE'
                    ? 'border-blue-600 bg-blue-100 shadow-sm'
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
                className={`p-3 rounded-2xl border-2 transition flex items-center justify-between ${
                  selectedTeam === 'RED'
                    ? 'border-rose-600 bg-rose-100 shadow-sm'
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

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t-2 border-slate-200">
          <button
            id="btn-start-training"
            onClick={handleStart}
            className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-comic font-black text-lg border-3 border-slate-900 shadow-[4px_4px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-3 transition"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>INICIAR TREINAMENTO (OFFLINE)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
