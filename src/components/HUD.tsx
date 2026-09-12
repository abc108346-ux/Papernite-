import React, { useRef, useState, useEffect } from 'react';
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
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const isMobile = inputManager?.isMobile() || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const weapon = WEAPONS[hud.weaponId] || WEAPONS.rifle;

  // Touch tracking refs to completely isolate movement and camera look
  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Format time (mm:ss)
  const minutes = Math.floor(hud.timeRemaining / 60);
  const seconds = hud.timeRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Joystick touch handlers
  const updateJoystick = (touch: React.Touch, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    const rawDx = touch.clientX - centerX;
    const rawDy = touch.clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(rawDy, rawDx);

    const clampedX = (Math.cos(angle) * clampedDist) / radius;
    const clampedY = (Math.sin(angle) * clampedDist) / radius;

    if (inputManager) {
      inputManager.touchJoystick.active = true;
      inputManager.touchJoystick.x = clampedX;
      inputManager.touchJoystick.y = clampedY;
    }
    setJoyOffset({ x: clampedX * 36, y: clampedY * 36 });
  };

  const resetJoystick = () => {
    joystickTouchIdRef.current = null;
    if (inputManager) {
      inputManager.touchJoystick.active = false;
      inputManager.touchJoystick.x = 0;
      inputManager.touchJoystick.y = 0;
    }
    setJoyOffset({ x: 0, y: 0 });
  };

  return (
    <div id="game-hud-root" className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between overflow-hidden">
      
      {/* Damage Flash Red Vignette */}
      {hud.health < 35 && !hud.isDead && (
        <div className="absolute inset-0 border-8 border-red-500/40 animate-pulse pointer-events-none z-10" />
      )}

      {/* TOP HEADER: Match Scoreboard & Timer */}
      <header id="hud-top-bar" className="w-full flex items-center justify-between px-3 sm:px-6 pt-3 sm:pt-4 z-20">
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
            className="mt-1 pointer-events-auto bg-slate-900/85 hover:bg-slate-900 text-amber-300 text-[11px] px-3 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 shadow transition cursor-pointer"
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
      <div id="hud-kill-feed" className="absolute top-20 right-4 flex flex-col gap-1.5 max-w-xs z-20">
        {hud.killFeed.slice(-4).map((k) => (
          <div
            key={k.id}
            className="bg-slate-900/85 text-white px-3 py-1 rounded-xl text-xs font-bold border border-slate-700 shadow flex items-center gap-2 animate-fade-in"
          >
            <span className={k.killerTeam === 'BLUE' ? 'text-blue-400 font-black' : 'text-red-400 font-black'}>
              {k.killerName}
            </span>
            <span className="text-amber-400 text-[11px] font-mono">
              [{k.weaponId.toUpperCase()}]
            </span>
            <span className={k.victimTeam === 'BLUE' ? 'text-blue-400' : 'text-red-400'}>
              {k.victimName}
            </span>
            {k.isHeadshot && <span className="text-yellow-400 text-[10px] font-black">🎯 HEADSHOT</span>}
          </div>
        ))}
      </div>

      {/* HITMARKER (Center of Screen on successful shot) */}
      {hud.showHitmarker && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-8 h-8 relative animate-ping">
            <div className="absolute inset-0 border-2 border-red-500 rotate-45" />
          </div>
        </div>
      )}

      {/* DEATH SCREEN / RESPAWN COUNTDOWN */}
      {hud.isDead && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-auto">
          <h2 className="text-4xl sm:text-5xl font-black font-comic text-white tracking-widest drop-shadow-lg mb-2">
            VOCÊ FOI ELIMINADO!
          </h2>
          <p className="text-lg font-bold text-amber-300 mb-6">
            Renascer de papel em {hud.respawnCountdown} segundos...
          </p>
          <div className="w-48 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (hud.respawnCountdown / 4) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* POINTER LOCK NOTIFICATION FOR PC */}
      {!isMobile && !isPointerLocked && !hud.isDead && (
        <div
          id="click-to-lock-overlay"
          onClick={onRequestPointerLock}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-auto cursor-pointer z-40"
        >
          <div className="bg-amber-400 text-slate-950 border-4 border-slate-900 rounded-3xl p-6 shadow-[8px_8px_0px_rgba(15,23,42,1)] text-center max-w-sm transform -rotate-1">
            <h3 className="text-2xl font-black font-comic mb-2">CLIQUE PARA JOGAR</h3>
            <p className="text-xs font-bold text-slate-800 mb-4">
              Clique na tela para travar o cursor do mouse e controlar a câmera FPS.
            </p>
            <div className="text-[11px] font-mono font-bold bg-slate-900 text-white py-1 px-3 rounded-xl inline-block">
              Pressione ESC a qualquer momento para liberar o mouse
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM HUD: Health & Ammo */}
      <footer id="hud-bottom-bar" className="w-full flex items-end justify-between px-4 sm:px-8 pb-4 sm:pb-6 z-20">
        
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
              className={`pointer-events-auto px-3 py-1.5 rounded-xl text-xs font-black transition flex flex-col items-center cursor-pointer ${
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
            className="pointer-events-auto bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black p-2.5 sm:p-3 rounded-xl shadow-md border-2 border-slate-900 flex flex-col items-center cursor-pointer"
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
        <div id="mobile-controls-layer" className="absolute inset-0 pointer-events-none z-30 select-none">
          
          {/* VIRTUAL JOYSTICK (Bottom Left) */}
          <div
            id="mobile-joystick-zone"
            className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-slate-900/40 border-2 border-white/30 backdrop-blur-sm pointer-events-auto flex items-center justify-center touch-none select-none z-30"
            onTouchStart={(e) => {
              e.preventDefault();
              if (joystickTouchIdRef.current === null && e.changedTouches.length > 0) {
                const t = e.changedTouches[0];
                joystickTouchIdRef.current = t.identifier;
                updateJoystick(t, e.currentTarget);
              }
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (joystickTouchIdRef.current === null) return;
              for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === joystickTouchIdRef.current) {
                  updateJoystick(t, e.currentTarget);
                  break;
                }
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
                  resetJoystick();
                  break;
                }
              }
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
                  resetJoystick();
                  break;
                }
              }
            }}
          >
            {/* Joystick Thumb Knob */}
            <div 
              className="w-14 h-14 rounded-full bg-amber-400/90 border-2 border-slate-900 shadow-lg flex items-center justify-center text-xs font-bold text-slate-950 pointer-events-none transition-transform duration-75"
              style={{ transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)` }}
            >
              🕹️
            </div>
          </div>

          {/* TOUCH LOOK ZONE (Entire Right half of the screen) */}
          <div
            id="mobile-look-zone"
            className="absolute inset-y-0 right-0 w-1/2 pointer-events-auto touch-none select-none z-30"
            onTouchStart={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (lookTouchIdRef.current === null) {
                  lookTouchIdRef.current = t.identifier;
                  lastLookPosRef.current = { x: t.clientX, y: t.clientY };
                  break;
                }
              }
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (lookTouchIdRef.current === null || !inputManager) return;
              for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === lookTouchIdRef.current) {
                  const dx = t.clientX - lastLookPosRef.current.x;
                  const dy = t.clientY - lastLookPosRef.current.y;
                  lastLookPosRef.current = { x: t.clientX, y: t.clientY };
                  inputManager.addTouchLookDelta(dx, dy);
                  break;
                }
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
                  lookTouchIdRef.current = null;
                  break;
                }
              }
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
                  lookTouchIdRef.current = null;
                  break;
                }
              }
            }}
          />

          {/* TOUCH ACTION BUTTONS (Bottom Right, higher z-index so they capture their own touches cleanly) */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end pointer-events-auto z-40">
            <div className="flex items-center gap-3">
              {/* AIM BUTTON */}
              <button
                id="touch-btn-aim"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (inputManager) inputManager.touchAim = !inputManager.touchAim;
                }}
                className={`w-14 h-14 rounded-full border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-sm cursor-pointer transition ${
                  hud.isAiming ? 'bg-amber-400 text-slate-950 scale-105' : 'bg-slate-900/80 text-white'
                }`}
              >
                🎯
              </button>

              {/* JUMP BUTTON */}
              <button
                id="touch-btn-jump"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (inputManager) inputManager.touchJump = true;
                }}
                className="w-14 h-14 rounded-full bg-slate-900/80 active:bg-amber-400 text-white active:text-slate-950 border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-lg cursor-pointer active:scale-95"
              >
                ⬆️
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* SPRINT BUTTON */}
              <button
                id="touch-btn-sprint"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (inputManager) inputManager.touchSprint = !inputManager.touchSprint;
                }}
                className={`w-14 h-14 rounded-full border-2 border-slate-900 shadow-xl flex items-center justify-center font-black text-sm cursor-pointer ${
                  inputManager?.touchSprint ? 'bg-amber-400 text-slate-950 scale-105' : 'bg-slate-900/80 text-white'
                }`}
              >
                🏃
              </button>

              {/* SHOOT BUTTON (Large primary action) */}
              <button
                id="touch-btn-shoot"
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (inputManager) inputManager.touchShoot = true;
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  if (inputManager) inputManager.touchShoot = false;
                }}
                className="w-20 h-20 rounded-full bg-red-600 active:bg-red-500 text-white border-4 border-slate-900 shadow-2xl flex items-center justify-center font-black text-2xl active:scale-95 cursor-pointer"
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
