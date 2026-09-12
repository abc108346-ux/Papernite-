import React, { useEffect, useRef, useState } from 'react';
import { BotDifficulty, GameMatchState, GraphicsSettings, MapId, MapSelectionId, MatchmakingQueueState, PlayerNetworkState, Team, UserProfile } from './types/game';
import { DEFAULT_SETTINGS, LOADING_TIPS, MAPS, WEAPONS } from './game/constants';
import { AuthService } from './firebase/authService';
import { GameEngine, HUDData, IMatchNetworkBridge } from './game/engine/GameEngine';
import { NetworkClient } from './game/network/NetworkClient';
import { LocalMatchController } from './game/engine/LocalMatchController';
import { Lobby } from './components/Lobby';
import { HUD } from './components/HUD';
import { ScoreboardModal } from './components/ScoreboardModal';
import { SettingsModal } from './components/SettingsModal';
import { MatchEndModal } from './components/MatchEndModal';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { TrainingModal } from './components/TrainingModal';
import { MobileOrientationBlocker } from './components/MobileOrientationBlocker';
import { soundManager } from './game/audio/SoundManager';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'loading' | 'playing'>('lobby');
  const [userProfile, setUserProfile] = useState<UserProfile>(AuthService.getInitialProfile());
  const [selectedMap, setSelectedMap] = useState<MapSelectionId>('paper_city');
  const [settings, setSettings] = useState<GraphicsSettings>(() => {
    try {
      const saved = localStorage.getItem('papernite_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  // Modals & HUD state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [matchWinner, setMatchWinner] = useState<Team | 'DRAW' | null>(null);
  const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Matchmaking real-time queue
  const [queueState, setQueueState] = useState<MatchmakingQueueState>({
    playersCount: 1,
    maxPlayers: 12,
    status: 'searching',
    countdown: 6,
    estimatedSeconds: 10
  });

  // Match and HUD data
  const [hudState, setHudState] = useState<HUDData>({
    health: 100,
    maxHealth: 100,
    currentAmmo: 25,
    maxAmmo: 25,
    weaponId: 'rifle',
    isAiming: false,
    isReloading: false,
    team: 'BLUE',
    scoreRed: 0,
    scoreBlue: 0,
    timeRemaining: 300,
    showHitmarker: false,
    isDead: false,
    respawnCountdown: 0,
    killFeed: []
  });

  const [matchState, setMatchState] = useState<GameMatchState>({
    matchId: '',
    mapId: 'paper_city',
    status: 'waiting',
    timeRemaining: 300,
    scoreRed: 0,
    scoreBlue: 0,
    maxScore: 30,
    players: {},
    killFeed: []
  });

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const networkClientRef = useRef<NetworkClient | null>(null);
  const localMatchControllerRef = useRef<LocalMatchController | null>(null);
  const activeBridgeRef = useRef<IMatchNetworkBridge | null>(null);

  // Apply audio volumes on boot
  useEffect(() => {
    soundManager.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
  }, [settings.masterVolume, settings.sfxVolume, settings.musicVolume]);

  // =========================================================================
  // 1. ONLINE MATCHMAKING FLOW
  // =========================================================================
  const handleStartOnlineMatchmaking = async () => {
    soundManager.init();
    
    if (!AuthService.getCurrentUser()) {
      try {
        const profile = await AuthService.loginWithGoogle();
        if (profile) setUserProfile(profile);
      } catch(e) {
        alert("Você precisa fazer login com Google para jogar online.");
        return;
      }
    }

    setIsMatchmakingOpen(true);
    setQueueState({
      playersCount: 1,
      maxPlayers: 12,
      status: 'searching',
      countdown: 6,
      estimatedSeconds: 10
    });

    const client = new NetworkClient({
      onQueueUpdate: (qs) => {
        setQueueState(qs);
      },

      onMatchFound: (data) => {
        setQueueState(prev => ({ ...prev, status: 'match_found', countdown: 0 }));
        setSelectedMap(data.mapId);
      },

      onMatchJoined: (matchId, playerId, team, mapId, state) => {
        setIsMatchmakingOpen(false);
        setMatchState(state);
        setHudState(prev => ({ ...prev, team, weaponId: userProfile.weaponId }));
        setLoadingTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
        setScreen('loading');

        setTimeout(() => {
          setScreen('playing');

          setTimeout(() => {
            if (gameContainerRef.current) {
              if (gameEngineRef.current) {
                gameEngineRef.current.destroy();
              }

              activeBridgeRef.current = client;

              const engine = new GameEngine(
                gameContainerRef.current,
                mapId,
                client,
                settings,
                (hudData) => {
                  setHudState(prev => ({
                    ...prev,
                    ...hudData,
                    scoreRed: prev.scoreRed,
                    scoreBlue: prev.scoreBlue,
                    timeRemaining: prev.timeRemaining,
                    killFeed: prev.killFeed
                  }));
                }
              );

              engine.setLocalPlayerInfo(playerId, team, userProfile.skinId, userProfile.weaponId);

              engine.inputManager.setCallbacks({
                onPointerLockChange: (locked) => setIsPointerLocked(locked),
                onWeaponSwitch: (slot) => engine.handleWeaponSwitch(slot),
                onScoreboard: (show) => setIsScoreboardOpen(show),
                onPause: () => setIsSettingsOpen(true)
              });

              gameEngineRef.current = engine;
            }
          }, 100); // Wait for React to render the canvas
        }, 1200);
      },

      onGameTick: (players, scoreRed, scoreBlue, timeRemaining) => {
        setMatchState(prev => ({
          ...prev,
          players,
          scoreRed,
          scoreBlue,
          timeRemaining
        }));

        setHudState(prev => ({
          ...prev,
          scoreRed,
          scoreBlue,
          timeRemaining
        }));

        if (gameEngineRef.current) {
          gameEngineRef.current.updateRemotePlayers(players);
        }
      },

      onProjectileSpawned: (projectile) => {
        if (gameEngineRef.current && projectile.shooterId !== activeBridgeRef.current?.playerId) {
          gameEngineRef.current.onProjectileSpawned(projectile);
        }
      },

      onPlayerDamaged: () => {},

      onPlayerKilled: (killItem, scoreRed, scoreBlue) => {
        soundManager.playKill();
        setMatchState(prev => {
          const kf = [killItem, ...prev.killFeed].slice(0, 5);
          return { ...prev, scoreRed, scoreBlue, killFeed: kf };
        });
        setHudState(prev => ({ ...prev, killFeed: [killItem, ...prev.killFeed].slice(0, 5) }));
      },

      onPlayerRespawned: (player) => {
        if (player.id === activeBridgeRef.current?.playerId && gameEngineRef.current) {
          gameEngineRef.current.respawnAt(player.pos);
        }
      },

      onMatchEnded: (winner, state) => {
        setMatchState(state);
        setMatchWinner(winner);

        const isWin = winner === hudState.team;
        const myPlayerData = state.players[activeBridgeRef.current?.playerId || ''];

        const updatedProfile: UserProfile = {
          ...userProfile,
          stats: {
            kills: userProfile.stats.kills + (myPlayerData?.kills || 0),
            deaths: userProfile.stats.deaths + (myPlayerData?.deaths || 0),
            wins: userProfile.stats.wins + (isWin ? 1 : 0),
            matchesPlayed: userProfile.stats.matchesPlayed + 1
          }
        };

        setUserProfile(updatedProfile);
        AuthService.saveProfile(updatedProfile);
      },

      onPingUpdate: () => {}
    });

    networkClientRef.current = client;
    await client.connect();

    client.joinQueue(
      userProfile.displayName,
      userProfile.skinId,
      userProfile.weaponId,
      selectedMap
    );
  };

  const handleCancelMatchmaking = () => {
    if (networkClientRef.current) {
      networkClientRef.current.leaveQueue();
      networkClientRef.current.disconnect();
      networkClientRef.current = null;
    }
    setIsMatchmakingOpen(false);
  };

  // =========================================================================
  // 2. OFFLINE TRAINING MODE FLOW
  // =========================================================================
  const handleStartTraining = (mapId: MapId, difficulty: BotDifficulty, team: Team) => {
    setIsTrainingOpen(false);
    setSelectedMap(mapId);
    setLoadingTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
    setScreen('loading');

    // Create LocalMatchController
    const localController = new LocalMatchController(
      mapId,
      difficulty,
      {
        id: `offline_player_${Date.now()}`,
        name: userProfile.displayName,
        skinId: userProfile.skinId,
        weaponId: userProfile.weaponId,
        team
      },
      {
        onMatchJoined: (matchId, playerId, assignedTeam, assignedMap, state) => {
          setMatchState(state);
          setHudState(prev => ({ ...prev, team: assignedTeam, weaponId: userProfile.weaponId }));

          setTimeout(() => {
            setScreen('playing');

            setTimeout(() => {
              if (gameContainerRef.current) {
                if (gameEngineRef.current) {
                  gameEngineRef.current.destroy();
                }

                activeBridgeRef.current = localController;

                const engine = new GameEngine(
                  gameContainerRef.current,
                  assignedMap,
                  localController,
                  settings,
                  (hudData) => {
                    setHudState(prev => ({
                      ...prev,
                      ...hudData,
                      scoreRed: prev.scoreRed,
                      scoreBlue: prev.scoreBlue,
                      timeRemaining: prev.timeRemaining,
                      killFeed: prev.killFeed
                    }));
                  }
                );

                engine.setLocalPlayerInfo(playerId, assignedTeam, userProfile.skinId, userProfile.weaponId);

                engine.inputManager.setCallbacks({
                  onPointerLockChange: (locked) => setIsPointerLocked(locked),
                  onWeaponSwitch: (slot) => engine.handleWeaponSwitch(slot),
                  onScoreboard: (show) => setIsScoreboardOpen(show),
                  onPause: () => setIsSettingsOpen(true)
                });

                gameEngineRef.current = engine;
              }
            }, 100); // Wait for React to render the canvas
          }, 900);
        },

        onGameTick: (players, scoreRed, scoreBlue, timeRemaining) => {
          setMatchState(prev => ({
            ...prev,
            players,
            scoreRed,
            scoreBlue,
            timeRemaining
          }));

          setHudState(prev => ({
            ...prev,
            scoreRed,
            scoreBlue,
            timeRemaining
          }));

          if (gameEngineRef.current) {
            gameEngineRef.current.updateRemotePlayers(players);
          }
        },

        onProjectileSpawned: (projectile) => {
          if (gameEngineRef.current && projectile.shooterId !== activeBridgeRef.current?.playerId) {
            gameEngineRef.current.onProjectileSpawned(projectile);
          }
        },

        onPlayerDamaged: () => {},

        onPlayerKilled: (killItem, scoreRed, scoreBlue) => {
          soundManager.playKill();
          setMatchState(prev => {
            const kf = [killItem, ...prev.killFeed].slice(0, 5);
            return { ...prev, scoreRed, scoreBlue, killFeed: kf };
          });
          setHudState(prev => ({ ...prev, killFeed: [killItem, ...prev.killFeed].slice(0, 5) }));
        },

        onPlayerRespawned: (player) => {
          if (player.id === activeBridgeRef.current?.playerId && gameEngineRef.current) {
            gameEngineRef.current.respawnAt(player.pos);
          }
        },

        onMatchEnded: (winner, state) => {
          setMatchState(state);
          setMatchWinner(winner);

          const isWin = winner === hudState.team;
          const myPlayerData = state.players[activeBridgeRef.current?.playerId || ''];

          const updatedProfile: UserProfile = {
            ...userProfile,
            stats: {
              kills: userProfile.stats.kills + (myPlayerData?.kills || 0),
              deaths: userProfile.stats.deaths + (myPlayerData?.deaths || 0),
              wins: userProfile.stats.wins + (isWin ? 1 : 0),
              matchesPlayed: userProfile.stats.matchesPlayed + 1
            }
          };

          setUserProfile(updatedProfile);
          AuthService.saveProfile(updatedProfile);
        },

        onPingUpdate: () => {}
      }
    );

    localMatchControllerRef.current = localController;
    localController.start();
  };

  const handleReturnToLobby = () => {
    soundManager.playButtonClick();
    if (gameEngineRef.current) {
      gameEngineRef.current.destroy();
      gameEngineRef.current = null;
    }
    if (networkClientRef.current) {
      networkClientRef.current.disconnect();
      networkClientRef.current = null;
    }
    if (localMatchControllerRef.current) {
      localMatchControllerRef.current.disconnect();
      localMatchControllerRef.current = null;
    }
    activeBridgeRef.current = null;

    setMatchWinner(null);
    setIsMatchmakingOpen(false);
    setScreen('lobby');
  };

  const handlePlayAgain = () => {
    handleReturnToLobby();
    setTimeout(() => {
      handleStartOnlineMatchmaking();
    }, 400);
  };

  const handleSaveSettings = (newSettings: GraphicsSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('papernite_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  return (
    <div
      id="papernite-app"
      className={`relative w-screen ${
        screen === 'playing' ? 'h-screen overflow-hidden' : 'min-h-screen overflow-y-auto '
      } bg-slate-950 font-sans select-none`}
    >
      
      {/* MOBILE ORIENTATION ENFORCER (16:9 Landscape) */}
      <MobileOrientationBlocker />

      {/* SCREEN 1: LOBBY */}
      {screen === 'lobby' && (
        <Lobby
          userProfile={userProfile}
          onUpdateProfile={setUserProfile}
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
          onStartMatch={handleStartOnlineMatchmaking}
          onOpenTraining={() => setIsTrainingOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isSearchingMatch={isMatchmakingOpen}
        />
      )}

      {/* SCREEN 2: LOADING SCREEN */}
      {screen === 'loading' && (
        <div id="loading-screen" className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 select-none animate-fadeIn">
          <div className="bg-amber-100 text-slate-900 p-8 sm:p-10 rounded-3xl border-4 border-slate-900 shadow-2xl max-w-md text-center transform -rotate-1">
            
            {/* Animated Paper Origami Loader */}
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-4xl animate-bounce">📄</span>
            </div>

            <h2 className="text-3xl font-black font-comic tracking-wide text-slate-950">
              DOBRANDO O MAPA...
            </h2>
            <p className="text-sm font-bold text-amber-700 mt-1">
              {(MAPS as any)[selectedMap]?.name || 'Arena Aleatória'} • Mata-Mata em Equipes (6 vs 6)
            </p>

            <div className="mt-6 p-3 bg-amber-200/80 rounded-2xl border-2 border-amber-300 text-xs font-semibold text-slate-800">
              💡 <strong>Dica de Papel:</strong> {loadingTip}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
              <span>Sincronizando com a arena de cartolina...</span>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: 3D PLAYING CANVAS (100% FIRST PERSON) */}
      {screen === 'playing' && (
        <div id="game-canvas-wrapper" className="relative w-full h-full overflow-hidden">
          {/* Three.js Render Target */}
          <div ref={gameContainerRef} className="w-full h-full cursor-crosshair" />

          {/* HUD Overlay */}
          <HUD
            hud={hudState}
            inputManager={gameEngineRef.current?.inputManager}
            isPointerLocked={isPointerLocked}
            onRequestPointerLock={() => gameEngineRef.current?.inputManager.requestPointerLock()}
            onWeaponSwitch={(slot) => gameEngineRef.current?.handleWeaponSwitch(slot)}
            onReload={() => gameEngineRef.current?.startReload()}
            onOpenScoreboard={() => setIsScoreboardOpen(true)}
          />
        </div>
      )}

      {/* MODAL: MATCHMAKING QUEUE (WAITING ROOM) */}
      {isMatchmakingOpen && (
        <MatchmakingScreen
          queueState={queueState}
          selectedMap={selectedMap}
          playerName={userProfile.displayName}
          onCancel={handleCancelMatchmaking}
        />
      )}

      {/* MODAL: TRAINING MODE SETUP */}
      <TrainingModal
        isOpen={isTrainingOpen}
        onClose={() => setIsTrainingOpen(false)}
        onStartTraining={handleStartTraining}
        defaultMapId={selectedMap}
      />

      {/* MODAL: SCOREBOARD (TAB) */}
      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        players={matchState.players}
        scoreRed={matchState.scoreRed}
        scoreBlue={matchState.scoreBlue}
        timeRemaining={matchState.timeRemaining}
      />

      {/* MODAL: SETTINGS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* MODAL: MATCH END (VICTORY / DEFEAT) */}
      {matchWinner && (
        <MatchEndModal
          winner={matchWinner}
          localTeam={hudState.team}
          matchState={matchState}
          onReturnToLobby={handleReturnToLobby}
          onPlayAgain={handlePlayAgain}
        />
      )}

    </div>
  );
}
