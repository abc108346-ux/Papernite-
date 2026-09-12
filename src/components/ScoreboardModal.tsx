import React from 'react';
import { PlayerNetworkState } from '../types/game';
import { X, Shield, Award, Users } from 'lucide-react';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Record<string, PlayerNetworkState>;
  scoreRed: number;
  scoreBlue: number;
  timeRemaining: number;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  scoreRed,
  scoreBlue,
  timeRemaining
}) => {
  if (!isOpen) return null;

  const playerList = Object.values(players) as PlayerNetworkState[];
  const redPlayers = playerList.filter(p => p.team === 'RED').sort((a, b) => b.kills - a.kills);
  const bluePlayers = playerList.filter(p => p.team === 'BLUE').sort((a, b) => b.kills - a.kills);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div id="scoreboard-modal-backdrop" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div id="scoreboard-modal-card" className="bg-amber-50 w-full max-w-4xl rounded-3xl border-4 border-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-400 p-4 sm:p-5 border-b-4 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-slate-950" />
            <div>
              <h2 className="text-2xl font-black text-slate-950 font-comic tracking-wide">
                PLACAR DA PARTIDA • PAPERNITE
              </h2>
              <p className="text-xs font-bold text-slate-800">Partida Mata-Mata em Equipes (6 vs 6)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/90 text-slate-900 px-4 py-1.5 rounded-xl border-2 border-slate-900 font-mono font-black text-lg">
              ⏱️ {formattedTime}
            </div>
            <button
              id="close-scoreboard-btn"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Team Scores Banner */}
        <div className="grid grid-cols-2 text-center border-b-4 border-slate-900">
          <div className="bg-red-500 text-white py-3 border-r-2 border-slate-900">
            <div className="text-xs font-bold uppercase tracking-widest font-comic">TIME VERMELHO</div>
            <div className="text-4xl font-black">{scoreRed}</div>
          </div>
          <div className="bg-blue-500 text-white py-3 border-l-2 border-slate-900">
            <div className="text-xs font-bold uppercase tracking-widest font-comic">TIME AZUL</div>
            <div className="text-4xl font-black">{scoreBlue}</div>
          </div>
        </div>

        {/* Players Tables */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Red Team Column */}
          <div className="bg-white rounded-2xl border-2 border-red-300 overflow-hidden shadow">
            <div className="bg-red-100 px-4 py-2 text-red-700 font-black text-sm border-b border-red-200 flex justify-between">
              <span>JOGADORES VERMELHOS ({redPlayers.length}/6)</span>
              <span>K / D / PING</span>
            </div>
            <div className="divide-y divide-slate-100">
              {redPlayers.map((p, idx) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-red-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-slate-800">
                      {p.name} {p.isBot && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">BOT</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold text-xs">
                    <span className="text-emerald-600">{p.kills}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600">{p.deaths}</span>
                    <span className="text-slate-400 text-[10px] w-8 text-right">{p.ping}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blue Team Column */}
          <div className="bg-white rounded-2xl border-2 border-blue-300 overflow-hidden shadow">
            <div className="bg-blue-100 px-4 py-2 text-blue-700 font-black text-sm border-b border-blue-200 flex justify-between">
              <span>JOGADORES AZUIS ({bluePlayers.length}/6)</span>
              <span>K / D / PING</span>
            </div>
            <div className="divide-y divide-slate-100">
              {bluePlayers.map((p, idx) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-blue-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-bold text-slate-800">
                      {p.name} {p.isBot && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">BOT</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold text-xs">
                    <span className="text-emerald-600">{p.kills}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600">{p.deaths}</span>
                    <span className="text-slate-400 text-[10px] w-8 text-right">{p.ping}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-amber-100 p-3 text-center border-t-2 border-slate-300 text-xs text-slate-600 font-semibold">
          Pressione <kbd className="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono">TAB</kbd> ou toque para fechar
        </div>

      </div>
    </div>
  );
};
