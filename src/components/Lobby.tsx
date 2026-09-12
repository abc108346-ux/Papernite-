import React, { useEffect, useRef, useState } from 'react';
import { GraphicsSettings, MapSelectionId, UserProfile } from '../types/game';
import { SKINS, WEAPONS, MAP_OPTIONS } from '../game/constants';
import { LobbyViewer } from '../game/engine/LobbyViewer';
import { soundManager } from '../game/audio/SoundManager';
import { AuthService } from '../firebase/authService';
import { MapCard } from './MapCard';
import { MapSelectionModal } from './MapSelectionModal';
import {
  Play,
  Sliders,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  Shield,
  Trophy,
  Crosshair,
  ChevronRight,
  Check,
  Bot,
  MapPin,
  Maximize2,
  Sparkles,
  Layers
} from 'lucide-react';

interface LobbyProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  selectedMap: MapSelectionId;
  onSelectMap: (mapId: MapSelectionId) => void;
  onStartMatch: () => void;
  onOpenTraining: () => void;
  onOpenSettings: () => void;
  isSearchingMatch: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  userProfile,
  onUpdateProfile,
  selectedMap,
  onSelectMap,
  onStartMatch,
  onOpenTraining,
  onOpenSettings,
  isSearchingMatch
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<LobbyViewer | null>(null);

  const [activeTab, setActiveTab] = useState<'play' | 'maps' | 'skins' | 'weapons' | 'friends'>('play');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const currentMapOption = MAP_OPTIONS[selectedMap] || MAP_OPTIONS.paper_city;

  // Initialize 3D Character Viewer in Lobby
  useEffect(() => {
    if (viewerContainerRef.current && !viewerRef.current) {
      viewerRef.current = new LobbyViewer(
        viewerContainerRef.current,
        userProfile.skinId,
        userProfile.weaponId
      );
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update 3D Character when skin/weapon changes
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.updateCharacter(userProfile.skinId, userProfile.weaponId);
    }
  }, [userProfile.skinId, userProfile.weaponId]);

  // Start lobby music on first user interaction
  const handleToggleMusic = () => {
    soundManager.init();
    if (isAudioMuted) {
      soundManager.startLobbyMusic();
      setIsAudioMuted(false);
    } else {
      soundManager.stopLobbyMusic();
      setIsAudioMuted(true);
    }
  };

  const handleSelectSkin = (skinId: string) => {
    soundManager.playButtonClick();
    const updated = { ...userProfile, skinId };
    onUpdateProfile(updated);
    AuthService.saveProfile(updated);
  };

  const handleSelectWeapon = (weaponId: string) => {
    soundManager.playWeaponSwitch();
    const updated = { ...userProfile, weaponId };
    onUpdateProfile(updated);
    AuthService.saveProfile(updated);
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    soundManager.playButtonClick();
    const updated = {
      ...userProfile,
      friends: [...(userProfile.friends || []), newFriendName.trim()]
    };
    onUpdateProfile(updated);
    AuthService.saveProfile(updated);
    setNewFriendName('');
  };

  const handleGoogleSignIn = async () => {
    soundManager.playButtonClick();
    setLoginError(null);
    try {
      const profile = await AuthService.loginWithGoogle();
      if (profile) {
        onUpdateProfile(profile);
      }
    } catch (err: any) {
      console.warn('Google sign in warning:', err);
      setLoginError('Configuração OAuth em andamento.');
    }
  };

  const handleSignOut = async () => {
    soundManager.playButtonClick();
    await AuthService.logout();
    const defaultProf = AuthService.getInitialProfile();
    onUpdateProfile(defaultProf);
  };

  return (
    <div
      id="papernite-lobby"
      className="relative w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-y-auto font-sans select-none pb-safe"
    >
      {/* Cartoon Paper Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* HEADER BAR */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-3 bg-slate-950/90 border-b-2 border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 border-2 border-slate-950 flex items-center justify-center font-black text-slate-950 text-xl font-comic shadow-[3px_3px_0px_rgba(15,23,42,1)]">
            P
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-comic tracking-wider text-amber-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center gap-2">
              PAPERNITE <span className="text-xs font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">3D FPS</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Tiroteio de Primeira Pessoa em Cartolina • Matchmaking Online 6v6
            </p>
          </div>
        </div>

        {/* PROFILE & STATS */}
        <div className="flex items-center gap-3">
          
          {/* Level & Stats */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5 shadow">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-bold leading-none">Nível</span>
                <span className="text-xs font-black text-slate-200">{userProfile.level || 1}</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-slate-800" />

            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-bold leading-none">K/D</span>
              <span className="text-xs font-black text-slate-200">
                {userProfile.deaths ? (userProfile.kills / userProfile.deaths).toFixed(1) : userProfile.kills || '1.0'}
              </span>
            </div>

            <div className="w-[1px] h-6 bg-slate-800" />

            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-bold leading-none">Vitórias</span>
              <span className="text-xs font-black text-amber-400">{userProfile.wins || 0}</span>
            </div>
          </div>

          {/* User Name / Google Login Button */}
          {userProfile.isGuest ? (
            <button
              id="btn-google-login"
              onClick={handleGoogleSignIn}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 rounded-xl text-xs font-black font-comic flex items-center gap-1.5 shadow-md border border-slate-950 transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Entrar com Google</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                {userProfile.displayName}
              </span>
              <button
                onClick={handleSignOut}
                title="Desconectar"
                className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Audio Mute/Unmute */}
          <button
            id="btn-toggle-music"
            onClick={handleToggleMusic}
            title={isAudioMuted ? 'Ativar Música' : 'Mutar Música'}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Settings Button */}
          <button
            id="btn-open-settings"
            onClick={() => { soundManager.playButtonClick(); onOpenSettings(); }}
            title="Configurações Gráficas"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notice Banner if login config needed */}
      {loginError && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 text-xs text-center py-1.5 px-4 font-semibold">
          {loginError} Perfil local salvo normalmente para jogar sem limitações!
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full items-start">
        
        {/* LEFT COLUMN: Tabs & Options (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4 order-2 lg:order-1">
          
          {/* Navigation Pill Tabs */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto ">
            <button
              id="tab-btn-play"
              type="button"
              onClick={() => { soundManager.playButtonClick(); setActiveTab('play'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'play' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Jogar</span>
            </button>

            <button
              id="tab-btn-maps"
              type="button"
              onClick={() => { soundManager.playButtonClick(); setActiveTab('maps'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'maps' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Mapas</span>
              <span className="bg-slate-900/60 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">4</span>
            </button>

            <button
              id="tab-btn-skins"
              type="button"
              onClick={() => { soundManager.playButtonClick(); setActiveTab('skins'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'skins' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Skins</span>
            </button>

            <button
              id="tab-btn-weapons"
              type="button"
              onClick={() => { soundManager.playButtonClick(); setActiveTab('weapons'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'weapons' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Armas</span>
            </button>

            <button
              id="tab-btn-friends"
              type="button"
              onClick={() => { soundManager.playButtonClick(); setActiveTab('friends'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'friends' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Amigos</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: PLAY & MAP SELECTION                                               */}
          {/* ========================================================================= */}
          {activeTab === 'play' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-4">
              
              {/* CURRENT MAP SELECTION HIGHLIGHT & FULLSCREEN EXPANDER */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 text-xl font-mono font-black">
                    {selectedMap === 'paper_city' ? '🏙️' : selectedMap === 'paper_factory' ? '🏭' : selectedMap === 'paper_island' ? '🏝️' : '🎲'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black font-comic block">
                      MAPA SELECIONADO
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white font-comic truncate uppercase">
                      {currentMapOption.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentMapOption.subtitle} • {currentMapOption.theme}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-open-map-modal"
                  type="button"
                  onClick={() => { soundManager.playButtonClick(); setIsMapModalOpen(true); }}
                  className="py-2 px-3.5 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-black text-xs font-comic border border-amber-400/40 transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ver Todos (4)</span>
                </button>
              </div>

              {/* MAPS CARDS SCROLLABLE SECTION (Touch scroll on mobile, mouse wheel on PC) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-amber-400 uppercase tracking-widest font-comic block">
                    Escolha a Arena de Dobradura (4 Mapas)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Deslize para ver todos ↕
                  </span>
                </div>

                {/* Vertical scrollable card container with natural & custom scrollbar */}
                <div
                  id="maps-scroll-container"
                  className="max-h-[290px] sm:max-h-[330px] overflow-y-auto pr-1 space-y-3.5 border border-slate-800/80 rounded-2xl p-2 bg-slate-950/60"
                >
                  {(Object.keys(MAP_OPTIONS) as MapSelectionId[]).map((mapKey) => {
                    const opt = MAP_OPTIONS[mapKey];
                    return (
                      <MapCard
                        key={mapKey}
                        id={mapKey}
                        name={opt.name}
                        subtitle={opt.subtitle}
                        theme={opt.theme}
                        shortDescription={opt.shortDescription}
                        badge={opt.badge}
                        isSelected={selectedMap === mapKey}
                        onSelect={() => onSelectMap(mapKey)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Game Mode Info */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase font-comic block">MODO PRINCIPAL</span>
                  <h3 className="text-sm sm:text-base font-black text-white">Mata-Mata em Equipes (6 vs 6)</h3>
                  <span className="text-[11px] text-slate-400">Até 12 jogadores • Bots automáticos de treino</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-400/30 text-xs font-bold font-mono">
                  <span>Alvo: 30 Kills</span>
                </div>
              </div>

              {/* Action Buttons: Online Matchmaking vs Offline Training */}
              <div className="space-y-2.5 pt-1">
                {/* 1. JOGAR ONLINE */}
                <button
                  id="btn-play-matchmaking"
                  onClick={() => { soundManager.init(); soundManager.playButtonClick(); onStartMatch(); }}
                  disabled={isSearchingMatch}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg font-comic tracking-wider border-4 border-slate-950 shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3 cursor-pointer ${
                    isSearchingMatch
                      ? 'bg-amber-300 text-slate-900 cursor-wait animate-pulse'
                      : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 hover:scale-[1.01]'
                  }`}
                >
                  <Play className="w-6 h-6 fill-current" />
                  <div className="text-left leading-tight">
                    <span className="block">{isSearchingMatch ? 'BUSCANDO JOGADORES...' : 'JOGAR ONLINE (MATCHMAKING)'}</span>
                    <span className="text-[11px] font-sans font-bold opacity-80 block">
                      Partida 6 vs 6 • Fila online com outros jogadores reais
                    </span>
                  </div>
                </button>

                {/* 2. MODO TREINAMENTO */}
                <button
                  id="btn-open-training"
                  onClick={() => { soundManager.init(); soundManager.playButtonClick(); onOpenTraining(); }}
                  disabled={isSearchingMatch}
                  className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-comic font-black text-sm sm:text-base border-3 border-amber-400/50 shadow-lg transition flex items-center justify-center gap-3 hover:border-amber-400 active:scale-95 cursor-pointer"
                >
                  <Bot className="w-5 h-5 text-amber-400" />
                  <div className="text-left leading-tight">
                    <span className="block text-white">MODO TREINAMENTO (100% OFFLINE)</span>
                    <span className="text-[10px] font-sans font-semibold text-slate-400 block">
                      Partida offline contra 11 bots • Dificuldade configurável
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DEDICATED FULL MAPS TAB                                            */}
          {/* ========================================================================= */}
          {activeTab === 'maps' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300 font-comic uppercase flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    <span>ARENAS DE CARTOLINA (4 MAPAS)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deslize com o dedo no celular ou role com a roda do mouse no computador
                  </p>
                </div>
                <button
                  onClick={() => { soundManager.playButtonClick(); setIsMapModalOpen(true); }}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-amber-400/50 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Tela Cheia</span>
                </button>
              </div>

              {/* Scrollable list of full map cards */}
              <div className="max-h-[460px] sm:max-h-[520px] overflow-y-auto pr-1 space-y-4">
                {(Object.keys(MAP_OPTIONS) as MapSelectionId[]).map((mapKey) => {
                  const opt = MAP_OPTIONS[mapKey];
                  return (
                    <MapCard
                      key={mapKey}
                      id={mapKey}
                      name={opt.name}
                      subtitle={opt.subtitle}
                      theme={opt.theme}
                      shortDescription={opt.shortDescription}
                      badge={opt.badge}
                      isSelected={selectedMap === mapKey}
                      onSelect={() => onSelectMap(mapKey)}
                    />
                  );
                })}
              </div>

              {/* Bottom Quick Return Button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Mapa Ativo: <strong className="text-amber-300">{currentMapOption.name}</strong>
                </span>
                <button
                  onClick={() => { soundManager.playButtonClick(); setActiveTab('play'); }}
                  className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-comic text-xs sm:text-sm border-2 border-slate-950 shadow flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>IR PARA O MENU JOGAR</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SKINS SELECTION                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'skins' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-3">
              <label className="text-xs font-black text-amber-400 uppercase tracking-widest block font-comic">
                Skins de Papel & Dobraduras
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {Object.values(SKINS).map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => handleSelectSkin(skin.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between cursor-pointer ${
                      userProfile.skinId === skin.id
                        ? 'border-amber-400 bg-amber-400/20 shadow-md scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className="w-4 h-4 rounded-full border border-white/40"
                        style={{ backgroundColor: skin.primaryColor }}
                      />
                      {userProfile.skinId === skin.id && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">EQUIPADO</span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-100">{skin.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{skin.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: WEAPONS LOADOUT                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'weapons' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-3">
              <label className="text-xs font-black text-amber-400 uppercase tracking-widest block font-comic">
                Arsenal de Cartolina & Bolinhas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {Object.values(WEAPONS).map((wep) => (
                  <button
                    key={wep.id}
                    onClick={() => handleSelectWeapon(wep.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      userProfile.weaponId === wep.id
                        ? 'border-amber-400 bg-amber-400/20 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-100">{wep.name}</h4>
                      {userProfile.weaponId === wep.id && (
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">EQUIPADO</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">{wep.description}</p>
                    <div className="mt-2 flex gap-3 text-[10px] font-mono text-amber-300">
                      <span>Dano: {wep.damage}</span>
                      <span>Cadência: {wep.fireRate}/min</span>
                      <span>Pente: {wep.ammoCapacity}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: FRIENDS SYSTEM                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'friends' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest font-comic">
                  Lista de Amigos ({userProfile.friends?.length || 0})
                </label>
              </div>

              {/* Add Friend Input */}
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input
                  type="text"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="Nome do amigo..."
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Friends list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto ">
                {userProfile.friends && userProfile.friends.length > 0 ? (
                  userProfile.friends.map((friend, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-xs text-slate-200">{friend}</span>
                      </div>
                      <button
                        onClick={() => { soundManager.playButtonClick(); onStartMatch(); }}
                        className="text-[10px] font-black bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 px-2.5 py-1 rounded-lg border border-amber-400/40 cursor-pointer"
                      >
                        Convidar para Partida
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Nenhum amigo adicionado ainda.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: 3D CHARACTER PREVIEW (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="relative w-full h-[340px] sm:h-[440px] rounded-3xl overflow-hidden border-4 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-2xl flex items-center justify-center">
            
            {/* 3D Viewer Container */}
            <div ref={viewerContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Drag to rotate hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-slate-400 px-4 py-1.5 rounded-full text-xs border border-slate-700 pointer-events-none whitespace-nowrap">
              🔄 Arraste para girar seu guerreiro 360°
            </div>

            {/* Current Equipped Tag */}
            <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 px-3 py-1 rounded-xl text-xs font-black border-2 border-slate-950 shadow-md">
              {SKINS[userProfile.skinId]?.name || 'Explorador'}
            </div>
          </div>
        </div>

      </main>

      {/* DEDICATED FULLSCREEN MAP SELECTION MODAL */}
      <MapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        selectedMap={selectedMap}
        onSelectMap={onSelectMap}
        onStartMatch={onStartMatch}
      />

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-3 px-6 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-500">
        PAPERNITE © 2026 • 100% Primeira Pessoa • Partidas 6v6 • Feito com Três Dimensões, Cartolina e Imaginação
      </footer>

    </div>
  );
};
