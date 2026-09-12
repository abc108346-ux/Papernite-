import React from 'react';
import { HUDData } from '../game/engine/GameEngine';
import { WEAPONS } from '../game/constants';
import { Crosshair, Shield, RefreshCw, Zap, Users, Volume2 } from 'lucide-react';
import { InputManager } from '../game/controls/InputManager';

interface HUDProps {
  hud: HUDData;
  inputManager?: InputManager;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
  onWeaponSwitch: (slot: number) => void;
  onReload: () => void;
  onOpenScoreboard: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  inputManager,
  isPointerLocked,
  onRequestPointerLock,
  onWeaponSwitch,
  onReload,
  onOpenScoreboard
}) => {
  const [joyOffset, setJoyOffset] = React.useState({ x: 0, y: 0 });
  const isMobile = inputManager?.isMobile();
  const weapon = WEAPONS[hud.weaponId] || WEAPONS.rifle;

  // Format time (mm:ss)
  const minutes = Math.floor(hud.timeRemaining / 60);
  const seconds = hud.timeRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div id="game-hud-root" className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between overflow-hidden">
      
      {/* Damage Flash Red Vignette */}
      {hud.health < 35 && !hud.isDead && (
        <div className="absolute inset-0 border-8 border-red-500/40 animate-pulse pointer-events-none" />
      )}

      {/* TOP HEADER: Match Scoreboard & Timer */}
      <header id="hud-top-bar" className="w-full flex items-center justify-between px-3 sm:px-6 pt-3 sm:pt-4">
        {/* Blue Team Score (Left) */}
        <div className="flex items-center gap-2 sm:gap-3 bg-blue-600/95 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-lg border-2 border-blue-300">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-comic">TIME AZUL</span>
          <span className="text-xl sm:text-2xl font-black font-mono">{hud.scoreBlue}</span>
        </div>

        {/* Center: Scoreboard comparison pill & Match Timer */}
        <div className="flex flex-col items-center">
          <div className="bg-[#fffdfa] text-slate-900 px-4 sm:px-6 py-1 rounded-2xl shadow-lg border-3 border-slate-900 font-black text-sm sm:text-base font-comic flex items-center gap-3">
            <span className="text-blue-700 font-bold">AZUL [{hud.scoreBlue}]</span>
            <span className="text-slate-400 font-mono">—</span>
            <span className="text-rose-700 font-bold">[{hud.scoreRed}] VERMELHO</span>
            <span className="ml-1 text-xs font-mono bg-amber-200 px-2 py-0.5 rounded-lg border border-amber-400">
              ⏱️ {timeFormatted}
            </span>
          </div>

          <button
            id="hud-scoreboard-btn"
            onClick={onOpenScoreboard}
            className="mt-1 pointer-events-auto bg-slate-900/85 hover:bg-slate-900 text-amber-300 text-[11px] px-3 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 shadow transition"
          >
            <Users className="w-3 h-3" />
            <span>Placar Geral (TAB)</span>
          </button>
        </div>

        {/* Red Team Score (Right) */}
        <div className="flex items-center gap-2 sm:gap-3 bg-red-600/95 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl shadow-lg border-2 border-red-300">
          <span className="text-xl sm:text-2xl font-black font-mono">{hud.scoreRed}</span>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-comic">TIME VERMELHO</span>
        </div>
      </header>

      {/* KILL FEED (Top Right) */}
      <div id="hud-kill-feed" className="absolute top-20 right-4 flex flex-col gap-1.5 max-w-xs">
        {hud.killFeed.map((kf, i) => (
          <div
            key={kf.id || i}
            className="bg-slate-900/85 text-xs text-slate-100 px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-md flex items-center gap-2 animate-fadeIn"
          >
            <span className={kf.killerTeam === 'RED' ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
              {kf.killerName}
            </span>
            <span className="text-amber-300 font-semibold">[{kf.weaponName}]</span>
            {kf.isHeadshot && <span className="text-yellow-400 font-bold">🎯</span>}
            <span className={kf.victimTeam === 'RED' ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
              {kf.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* RETICLE / CROSSHAIR (Center) */}
      {!hud.isDead && (
        <div id="hud-reticle-center" className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Hitmarker X */}
          {hud.showHitmarker && (
            <div className="absolute text-red-500 font-black text-2xl animate-ping select-none">
              ✕
            </div>
          )}

          {/* Paper Crosshair */}
          {!hud.isAiming ? (
            <div className="relative w-7 h-7 flex items-center justify-center opacity-85">
              <div className="absolute w-1.5 h-1.5 bg-amber-400 rounded-full border border-slate-900" />
              <div className="absolute -top-3 w-0.5 h-2.5 bg-white shadow-sm" />
              <div className="absolute -bottom-3 w-0.5 h-2.5 bg-white shadow-sm" />
              <div className="absolute -left-3 w-2.5 h-0.5 bg-white shadow-sm" />
              <div className="absolute -right-3 w-2.5 h-0.5 bg-white shadow-sm" />
            </div>
          ) : (
            /* Sniper / ADS sight dot */
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-md animate-pulse" />
          )}
        </div>
      )}

      {/* PC Pointer Lock Hint */}
      {!isMobile && !isPointerLocked && !hud.isDead && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 pointer-events-auto">
          <button
            id="click-to-play-lock"
            onClick={onRequestPointerLock}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg px-8 py-4 rounded-2xl shadow-2xl border-4 border-slate-900 transform hover:scale-105 transition active:scale-95 flex flex-col items-center gap-1"
          >
            <span>🖱️ CLIQUE PARA ENTRAR NA PARTIDA</span>
            <span className="text-xs font-bold text-slate-800 opacity-80">(Travar Mouse)</span>
          </button>
        </div>
      )}

      {/* DEATH OVERLAY */}
      {hud.isDead && (
        <div id="hud-death-screen" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-auto animate-fadeIn">
          <div className="bg-amber-100 text-slate-900 p-8 rounded-3xl border-4 border-slate-900 shadow-2xl text-center max-w-sm mx-4 transform -rotate-1">
            <span className="text-5xl mb-2 block">📄💥</span>
            <h2 className="text-3xl font-black text-red-600 font-comic">VOCÊ FOI DOBRADO!</h2>
            <p className="text-slate-600 mt-2 text-sm">Seu guerreiro de papel virou confete.</p>
            <div className="mt-5 text-xl font-bold bg-amber-200 py-2 rounded-xl border-2 border-amber-400">
              Renascendo em: <span className="text-red-600 font-black text-2xl">{hud.respawnCountdown}s</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM HUD: Health & Ammo */}
      <footer id="hud-bottom-bar" className="w-full flex items-end justify-between px-4 sm:px-8 pb-4 sm:pb-6">
        
        {/* HEALTH BAR (Left) */}
        <div id="hud-health-card" className="bg-slate-900/90 text-white p-3 sm:p-4 rounded-2xl border-2 border-slate-700 shadow-xl flex items-center gap-3 transform -rotate-1">
          <div className="bg-red-500/20 p-2.5 rounded-xl border border-red-400/40 text-red-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
              <span>VIDA DE PAPEL</span>
              <span className="text-slate-200">{hud.health} / {hud.maxHealth}</span>
            </div>
            <div className="w-32 sm:w-44 h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-600">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  hud.health > 50 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : hud.health > 25 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* QUICK WEAPON SWITCH SLOTS (Center) */}
        <div id="hud-weapon-slots" className="hidden md:flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-700">
          {Object.values(WEAPONS).map((w, idx) => (
            <button
              key={w.id}
              onClick={() => onWeaponSwitch(idx)}
              className={`pointer-events-auto px-3 py-1.5 rounded-xl text-xs font-black transition flex flex-col items-center ${
                hud.weaponId === w.id
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-105 border-2 border-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-[10px] opacity-75 font-mono">[{idx + 1}]</span>
              <span>{w.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* AMMO & WEAPON (Right) */}
        <div id="hud-ammo-card" className="bg-slate-900/90 text-white p-3 sm:p-4 rounded-2xl border-2 border-slate-700 shadow-xl flex items-center gap-4 transform rotate-1">
          <div className="text-right">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              {weapon.name}
            </div>
            <div className="flex items-baseline justify-end gap-1 font-mono">
              <span className={`text-3xl sm:text-4xl font-black ${hud.currentAmmo <= 3 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
                {hud.currentAmmo}
              </span>
              <span className="text-sm font-bold text-slate-400">/{hud.maxAmmo}</span>
            </div>
            {hud.isReloading && (
              <span className="text-xs text-yellow-300 font-bold animate-pulse flex items-center justify-end gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Recarregando...
              </span>
            )}
          </div>

          <button
            id="hud-reload-btn"
            onClick={onReload}
            className="pointer-events-auto bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black p-2.5 sm:p-3 rounded-xl shadow-md border-2 border-slate-900 flex flex-col items-center"
            title="Recarregar arma (R)"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px] font-mono mt-0.5">R</span>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MOBILE TOUCH CONTROLS (Rendered if Mobile / Touch device is active)       */}
      {/* ========================================================================= */}
      {isMobile && !hud.isDead && (
        <div id="mobile-controls-layer" className="absolute inset-0 pointer-events-none z-30">
          
          {/* VIRTUAL JOYSTICK (Bottom Left) */}
          <div
            id="mobile-joystick-zone"
            className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-slate-900/40 border-2 border-white/30 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none"
            onTouchStart={(e) => {
              if (inputManager) {
                inputManager.touchJoystick.active = true;
              }
            }}
            onTouchMove={(e) => {
              if (inputManager && e.touches.length > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const touch = e.touches[0];
                const dx = (touch.clientX - centerX) / (rect.width / 2);
                const dy = (touch.clientY - centerY) / (rect.height / 2);
                const clampedX = Math.max(-1, Math.min(1, dx));
                const clampedY = Math.max(-1, Math.min(1, dy));
                inputManager.touchJoystick.x = clampedX;
                inputManager.touchJoystick.y = clampedY;
                setJoyOffset({ x: clampedX * 36, y: clampedY * 36 });
              }
            }}
            onTouchEnd={() => {
              if (inputManager) {
                inputManager.touchJoystick.active = false;
                inputManager.touchJoystick.x = 0;
                inputManager.touchJoystick.y = 0;
                setJoyOffset({ x: 0, y: 0 });
              }
            }}
          >
            {/* Joystick Thumb Knub */}
            <div 
              className="w-14 h-14 rounded-full bg-amber-400/80 border-2 border-slate-900 shadow-lg flex items-center justify-center text-xs font-bold text-slate-950 transition-transform duration-75"
              style={{ transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)` }}
            >
              🕹️
            </div>
          </div>

          {/* TOUCH LOOK ZONE (Right Screen half for looking around) */}
          <div
            id="mobile-look-zone"
            className="absolute top-20 right-0 bottom-24 left-1/2 pointer-events-auto touch-none"
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                e.currentTarget.dataset.lastX = String(e.touches[0].clientX);
                e.currentTarget.dataset.lastY = String(e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (inputManager && e.touches.length > 0) {
                const lastX = parseFloat(e.currentTarget.dataset.lastX || '0');
                const lastY = parseFloat(e.currentTarget.dataset.lastY || '0');
                const touch = e.touches[0];
                const dx = touch.clientX - lastX;
                const dy = touch.clientY - lastY;
                inputManager.addTouchLookDelta(dx, dy);
                e.currentTarget.dataset.lastX = String(touch.clientX);
                e.currentTarget.dataset.lastY = String(touch.clientY);
              }
            }}
          />

          {/* TOUCH ACTION BUTTONS (Bottom Right) */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end pointer-events-auto">
            <div className="flex items-center gap-3">
              {/* AIM BUTTON */}
              <button
                id="touch-btn-aim"
                onTouchStart={() => { if (inputManager) inputManager.touchAim = !inputManager.touchAim; }}
                className={`w-14 h-14 rounded-full border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-sm transition ${
                  hud.isAiming ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/80 text-white'
                }`}
              >
                🎯
              </button>

              {/* JUMP BUTTON */}
              <button
                id="touch-btn-jump"
                onTouchStart={() => { if (inputManager) inputManager.touchJump = true; }}
                className="w-14 h-14 rounded-full bg-slate-900/80 active:bg-amber-400 text-white active:text-slate-950 border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-lg"
              >
                ⬆️
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* SPRINT BUTTON */}
              <button
                id="touch-btn-sprint"
                onTouchStart={() => { if (inputManager) inputManager.touchSprint = !inputManager.touchSprint; }}
                className={`w-14 h-14 rounded-full border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-sm ${
                  inputManager?.touchSprint ? 'bg-amber-400 text-slate-950' : 'bg-slate-900/80 text-white'
                }`}
              >
                🏃
              </button>

              {/* SHOOT BUTTON (Large primary action) */}
              <button
                id="touch-btn-shoot"
                onTouchStart={() => { if (inputManager) inputManager.touchShoot = true; }}
                onTouchEnd={() => { if (inputManager) inputManager.touchShoot = false; }}
                className="w-20 h-20 rounded-full bg-red-600 active:bg-red-500 text-white border-4 border-slate-900 shadow-2xl flex items-center justify-center font-black text-2xl active:scale-95"
              >
                💥
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
