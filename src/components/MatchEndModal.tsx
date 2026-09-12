import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameMatchState, Team, PlayerNetworkState } from '../types/game';
import { Trophy, RefreshCw, Home, Award } from 'lucide-react';
import { soundManager } from '../game/audio/SoundManager';

interface MatchEndModalProps {
  winner: Team | 'DRAW';
  localTeam: Team;
  matchState: GameMatchState;
  onReturnToLobby: () => void;
  onPlayAgain: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  winner,
  localTeam,
  matchState,
  onReturnToLobby,
  onPlayAgain
}) => {
  const isVictory = winner === localTeam;
  const isDraw = winner === 'DRAW';

  useEffect(() => {
    if (isVictory) {
      soundManager.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      const interval = setInterval(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 700);
      return () => clearInterval(interval);
    }
  }, [isVictory]);

  // Find MVP player
  const players = Object.values(matchState.players || {}) as PlayerNetworkState[];
  const mvp = players.sort((a, b) => b.kills - a.kills)[0];

  return (
    <div id="match-end-modal" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-amber-50 w-full max-w-lg rounded-3xl border-4 border-slate-900 shadow-2xl overflow-hidden text-center animate-bounceIn">
        
        {/* Banner */}
        <div className={`p-6 border-b-4 border-slate-900 ${isVictory ? 'bg-amber-400' : isDraw ? 'bg-slate-300' : 'bg-rose-500 text-white'}`}>
          <div className="text-6xl mb-2">
            {isVictory ? '🏆' : isDraw ? '🤝' : '📄💥'}
          </div>
          <h1 className="text-4xl font-black font-comic tracking-wide text-slate-950">
            {isVictory ? 'VITÓRIA DE PAPEL!' : isDraw ? 'EMPATE DOBRADO!' : 'DERROTA'}
          </h1>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {isVictory ? 'Sua equipe dominou a arena de cartolina!' : 'Foi por pouco, dobre-se e tente novamente!'}
          </p>
        </div>

        {/* Match Scores */}
        <div className="p-6">
          <div className="flex items-center justify-center gap-6 bg-white p-4 rounded-2xl border-2 border-slate-300 shadow-inner">
            <div className="text-center">
              <span className="text-xs font-bold text-red-600 block font-comic">TIME VERMELHO</span>
              <span className="text-3xl font-black text-slate-900">{matchState.scoreRed}</span>
            </div>
            <span className="text-2xl font-black text-slate-400">VS</span>
            <div className="text-center">
              <span className="text-xs font-bold text-blue-600 block font-comic">TIME AZUL</span>
              <span className="text-3xl font-black text-slate-900">{matchState.scoreBlue}</span>
            </div>
          </div>

          {/* MVP Card */}
          {mvp && (
            <div className="mt-4 bg-amber-100 p-3 rounded-xl border-2 border-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-600" />
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-amber-700 block">MVP DA PARTIDA</span>
                  <span className="font-bold text-slate-900 text-sm">{mvp.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-900">{mvp.kills}</span>
                <span className="text-xs text-amber-700 font-bold ml-1">Kills</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              id="btn-play-again"
              onClick={onPlayAgain}
              className="flex-1 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black py-3 px-4 rounded-2xl border-2 border-slate-900 shadow-md flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Jogar Novamente</span>
            </button>
            <button
              id="btn-return-lobby"
              onClick={onReturnToLobby}
              className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold py-3 px-4 rounded-2xl border-2 border-slate-900 shadow-md flex items-center justify-center gap-2 transition"
            >
              <Home className="w-5 h-5" />
              <span>Voltar ao Lobby</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
