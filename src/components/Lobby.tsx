import React, { useEffect, useRef, useState } from 'react';
import { GraphicsSettings, MapId, UserProfile } from '../types/game';
import { SKINS, WEAPONS, MAPS } from '../game/constants';
import { LobbyViewer } from '../game/engine/LobbyViewer';
import { soundManager } from '../game/audio/SoundManager';
import { AuthService } from '../firebase/authService';
import { Play, Sliders, Users, UserPlus, LogIn, LogOut, Volume2, VolumeX, Shield, Trophy, Crosshair, ChevronRight, Check, Bot } from 'lucide-react';

interface LobbyProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  selectedMap: MapId;
  onSelectMap: (mapId: MapId) => void;
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

  const [activeTab, setActiveTab] = useState<'play' | 'skins' | 'weapons' | 'friends'>('play');
  const [newFriendName, setNewFriendName] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  const handleGoogleLogin = async () => {
    soundManager.playButtonClick();
    setLoginError(null);
    try {
      const logged = await AuthService.loginWithGoogle();
      if (logged) {
        onUpdateProfile(logged);
      }
    } catch (err: any) {
      if (err.message === 'CONFIG_REQUIRED') {
        setLoginError('Configuração do Google Firebase necessária no menu de configurações.');
      } else {
        setLoginError('Erro ao autenticar com o Google. Tente novamente.');
      }
    }
  };

  const handleLogout = async () => {
    soundManager.playButtonClick();
    await AuthService.logout();
    onUpdateProfile(AuthService.getInitialProfile());
  };

  const kdRatio = userProfile.stats.deaths > 0
    ? (userProfile.stats.kills / userProfile.stats.deaths).toFixed(2)
    : userProfile.stats.kills.toFixed(2);

  return (
    <div id="papernite-lobby" className="relative w-full h-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans select-none">
      
      {/* Origami Paper Pattern Background Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fde047_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* TOP BAR: Brand Logo, Stats & Profile */}
      <header className="relative z-10 w-full flex items-center justify-between px-4 sm:px-8 py-4 bg-slate-950/70 border-b-2 border-slate-800 backdrop-blur-md">
        
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl border-2 border-slate-900 flex items-center justify-center text-2xl shadow-md transform -rotate-3">
            📄
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-300 font-comic tracking-wider">
              PAPERNITE
            </h1>
            <span className="text-[10px] sm:text-xs text-amber-200/80 font-bold uppercase tracking-widest block -mt-1">
              FPS 3D Cartoon • 100% Primeira Pessoa
            </span>
          </div>
        </div>

        {/* PROFILE & CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Audio Music Toggle */}
          <button
            id="lobby-music-toggle"
            onClick={handleToggleMusic}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 shadow"
            title="Música do Lobby"
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Settings Button */}
          <button
            id="lobby-settings-btn"
            onClick={() => { soundManager.playButtonClick(); onOpenSettings(); }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 shadow"
            title="Configurações"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* User Account / Google Login */}
          <div className="flex items-center gap-3 bg-slate-800/90 pl-3 pr-2 py-1.5 rounded-2xl border border-slate-700 shadow">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-slate-200 block">{userProfile.displayName}</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">K/D: {kdRatio} • {userProfile.stats.wins} Vitórias</span>
            </div>
            
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="Avatar" className="w-8 h-8 rounded-xl border border-amber-400 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs">
                {userProfile.displayName[0]?.toUpperCase() || 'P'}
              </div>
            )}

            {userProfile.uid.startsWith('guest_') ? (
              <button
                id="btn-google-login"
                onClick={handleGoogleLogin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl border border-slate-900 flex items-center gap-1.5 shadow"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Entrar com Google</span>
              </button>
            ) : (
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 p-1.5"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Notice Banner if login config needed */}
      {loginError && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 text-xs text-center py-1.5 px-4 font-semibold">
          {loginError} Perfil local salvo normalmente para jogar sem limitações!
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full items-center">
        
        {/* LEFT COLUMN: Tabs & Options (5 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4 order-2 lg:order-1">
          
          {/* Navigation Pill Tabs */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button
              onClick={() => { soundManager.playButtonClick(); setActiveTab('play'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === 'play' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Jogar</span>
            </button>
            <button
              onClick={() => { soundManager.playButtonClick(); setActiveTab('skins'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === 'skins' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Skins</span>
            </button>
            <button
              onClick={() => { soundManager.playButtonClick(); setActiveTab('weapons'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === 'weapons' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Armas</span>
            </button>
            <button
              onClick={() => { soundManager.playButtonClick(); setActiveTab('friends'); }}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
                activeTab === 'friends' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Amigos</span>
            </button>
          </div>

          {/* TAB 1: PLAY & MAP SELECTION */}
          {activeTab === 'play' && (
            <div className="bg-slate-950/70 p-5 rounded-3xl border-2 border-slate-800 backdrop-blur-md space-y-4">
              <div>
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-2 font-comic">
                  Escolha o Mapa de Papel
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {Object.values(MAPS).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { soundManager.playButtonClick(); onSelectMap(m.id); }}
                      className={`p-3 rounded-2xl border-2 text-left transition relative overflow-hidden ${
                        selectedMap === m.id
                          ? 'border-amber-400 bg-amber-400/15 shadow-lg'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      {selectedMap === m.id && (
                        <div className="absolute top-2 right-2 bg-amber-400 text-slate-950 rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <span className="text-xl mb-1 block">
                        {m.id === 'paper_city' ? '🏙️' : m.id === 'paper_factory' ? '🏭' : '🏝️'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-slate-100">{m.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{m.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Mode Info */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase font-comic block">MODO PRINCIPAL</span>
                  <h3 className="text-base font-black text-white">Mata-Mata em Equipes (6 vs 6)</h3>
                  <span className="text-xs text-slate-400">Até 12 jogadores • Bots automáticos de treino</span>
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
                  className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg font-comic tracking-wider border-4 border-slate-950 shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3 ${
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
                  className="w-full py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-comic font-black text-sm sm:text-base border-3 border-amber-400/50 shadow-lg transition flex items-center justify-center gap-3 hover:border-amber-400 active:scale-95"
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

          {/* TAB 2: SKINS SELECTION */}
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
                    className={`p-3 rounded-2xl border-2 text-left transition flex flex-col justify-between ${
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

          {/* TAB 3: WEAPONS LOADOUT */}
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
                    className={`p-3 rounded-2xl border-2 text-left transition ${
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

          {/* TAB 4: FRIENDS SYSTEM */}
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
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Friends list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
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
                        className="text-[10px] font-black bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 px-2.5 py-1 rounded-lg border border-amber-400/40"
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
          <div className="relative w-full h-[360px] sm:h-[460px] rounded-3xl overflow-hidden border-4 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-2xl flex items-center justify-center">
            
            {/* 3D Viewer Container */}
            <div ref={viewerContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Drag to rotate hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-slate-400 px-4 py-1.5 rounded-full text-xs border border-slate-700 pointer-events-none">
              🔄 Arraste para girar seu guerreiro 360°
            </div>

            {/* Current Equipped Tag */}
            <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 px-3 py-1 rounded-xl text-xs font-black border-2 border-slate-900 shadow-md">
              {SKINS[userProfile.skinId]?.name || 'Explorador'}
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-3 px-6 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-500">
        PAPERNITE © 2026 • 100% Primeira Pessoa • Partidas 6v6 • Feito com Três Dimensões, Cartolina e Imaginação
      </footer>

    </div>
  );
};
