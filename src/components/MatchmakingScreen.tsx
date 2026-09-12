import React, { useEffect, useState } from 'react';
import { MatchmakingQueueState, MapSelectionId } from '../types/game';
import { MAP_OPTIONS } from '../game/constants';
import { soundManager } from '../game/audio/SoundManager';
import { Users, X, Shield, Clock, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface MatchmakingScreenProps {
  queueState: MatchmakingQueueState;
  selectedMap: MapSelectionId;
  playerName: string;
  onCancel: () => void;
}

export const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({
  queueState,
  selectedMap,
  playerName,
  onCancel
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const mapInfo = MAP_OPTIONS[selectedMap] || MAP_OPTIONS.paper_city;
  const isMatchFound = queueState.status === 'match_found' || queueState.countdown <= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
      {/* Cartoon Paper Background Texture */}
      <div className="paper-card relative w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-[#fffdfa] border-4 border-slate-900 shadow-[10px_10px_0px_rgba(15,23,42,1)] text-slate-900 overflow-hidden">
        
        {/* Paper Fold Corner Decoration */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400 border-l-4 border-b-4 border-slate-900 -mr-8 -mt-8 rotate-45 pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-200 border-2 border-slate-900 rounded-full text-xs font-black uppercase tracking-wider font-comic shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Fila de Matchmaking Real</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black font-comic tracking-tight text-slate-950">
            {isMatchFound ? 'PARTIDA ENCONTRADA!' : 'PROCURANDO PARTIDA...'}
          </h2>

          <p className="text-sm font-bold text-slate-600">
            {isMatchFound
              ? 'Conectando ao servidor e dobrando as folhas da arena...'
              : 'O sistema está buscando outros jogadores online para a partida.'}
          </p>
        </div>

        {/* Center Visual: Radar / Paper Scanning Animation */}
        <div className="relative my-6 flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Pulsing Rings */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-300 animate-ping opacity-35" />
            <div className="absolute -inset-3 rounded-full border-2 border-dashed border-amber-500 animate-spin opacity-40" />
            
            <div className="relative w-24 h-24 rounded-full bg-amber-100 border-4 border-slate-900 flex items-center justify-center shadow-inner">
              <span className="text-5xl select-none animate-bounce">
                {isMatchFound ? '🎯' : '📄'}
              </span>
            </div>
          </div>

          {/* Real Players Counter Display */}
          <div className="mt-5 w-full bg-amber-50 border-3 border-slate-900 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="font-comic font-black text-sm text-slate-900">
                  Jogadores encontrados:
                </span>
              </div>
              <span className="font-mono font-black text-lg text-amber-700 bg-amber-200/80 px-2.5 py-0.5 rounded-xl border border-amber-400">
                {queueState.playersCount} / {queueState.maxPlayers}
              </span>
            </div>

            {/* Progress Bar of 12 slots */}
            <div className="w-full bg-slate-200 h-4 rounded-full border-2 border-slate-900 overflow-hidden flex p-0.5 gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-full rounded-sm transition-all duration-300 ${
                    i < queueState.playersCount
                      ? 'bg-amber-500 shadow-sm'
                      : 'bg-slate-300/60'
                  }`}
                />
              ))}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Você está PRONTO ({playerName})</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Match Info */}
        <div className="bg-slate-100 rounded-2xl border-2 border-slate-900 p-3.5 flex items-center justify-between text-xs font-semibold text-slate-700 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-300 border border-slate-900 flex items-center justify-center font-bold text-sm">
              🗺️
            </div>
            <div>
              <span className="block font-black text-slate-900 font-comic uppercase text-[11px]">
                Mapa Selecionado
              </span>
              <span className="font-bold text-slate-800">{mapInfo.name}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="block font-black text-slate-900 font-comic uppercase text-[11px]">
              Modo
            </span>
            <span className="text-amber-700 font-bold">Mata-Mata (6 vs 6)</span>
          </div>
        </div>

        {/* Countdown / Status Message */}
        {queueState.countdown !== null && (
          <div className="mb-4 text-center py-2 px-4 bg-emerald-100 border-2 border-emerald-600 rounded-xl text-emerald-900 font-comic font-black text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
            <span>
              {isMatchFound
                ? 'Partida confirmada! Entrando no mapa...'
                : `Iniciando partida em ${queueState.countdown}s (completando com bots)...`}
            </span>
          </div>
        )}

        {/* Cancel Button */}
        <button
          id="btn-cancel-matchmaking"
          onClick={() => {
            soundManager.playButtonClick();
            onCancel();
          }}
          disabled={isMatchFound}
          className={`w-full py-3.5 px-6 rounded-2xl font-black font-comic text-base border-3 border-slate-900 transition flex items-center justify-center gap-2 shadow-[4px_4px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
            isMatchFound
              ? 'bg-slate-200 text-slate-400 border-slate-400 cursor-not-allowed'
              : 'bg-rose-400 hover:bg-rose-300 text-slate-950'
          }`}
        >
          <X className="w-5 h-5" />
          <span>CANCELAR BUSCA</span>
        </button>
      </div>
    </div>
  );
};
