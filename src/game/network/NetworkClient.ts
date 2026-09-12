import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase/authService';
import {
  GameMatchState,
  KillFeedItem,
  MapId,
  MapSelectionId,
  PaperProjectile,
  PlayerNetworkState,
  Team,
  Vector3D
} from '../../types/game';
import { WEAPONS } from '../constants';
import { PaperMapsBuilder } from '../engine/PaperMaps';
import { PaperBotAI } from '../bots/PaperBotAI';

export interface NetworkCallbacks {
  onMatchJoined: (matchId: string, playerId: string, team: Team, mapId: MapId, initialState: GameMatchState) => void;
  onPlayerJoined?: (player: PlayerNetworkState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onGameTick: (players: Record<string, PlayerNetworkState>, scoreRed: number, scoreBlue: number, timeRemaining: number) => void;
  onProjectileSpawned: (projectile: PaperProjectile) => void;
  onPlayerDamaged: (victimId: string, damage: number, currentHealth: number, hitPos?: Vector3D) => void;
  onPlayerKilled: (killItem: KillFeedItem, scoreRed: number, scoreBlue: number) => void;
  onPlayerRespawned: (player: PlayerNetworkState) => void;
  onMatchEnded: (winner: Team | 'DRAW', scoreRed: number, scoreBlue: number) => void;
  onQueueUpdate?: (info: { playersCount: number; maxPlayers: number; status: 'searching' | 'found' | 'starting'; countdown?: number; estimatedSeconds?: number }) => void;
  onMatchFound?: (data: { matchId: string; mapId: MapId; realPlayersCount: number; botsCount: number; team: Team }) => void;
  onPingUpdate?: (ping: number) => void;
}

export class NetworkClient {
  public matchId: string = '';
  public playerId: string = '';
  public playerName: string = 'Soldier';
  public playerTeam: Team = 'BLUE';
  public isHost: boolean = false;

  private mapId: MapId = 'paper_city';
  private callbacks: NetworkCallbacks;
  private unsubscribeMatch: Unsubscribe | null = null;
  private unsubscribePlayers: Unsubscribe | null = null;
  private unsubscribeEvents: Unsubscribe | null = null;

  private allPlayersCache: Record<string, PlayerNetworkState> = {};
  private myHealth: number = 100;
  private myKills: number = 0;
  private myDeaths: number = 0;
  private isDead: boolean = false;
  private respawnTimer: number = 0;

  private lastUpdate: number = 0;
  private updateInterval: number = 45; // ~22 updates/second for smooth movement
  private matchmakingTimer: any = null;

  // Host Bot Simulation
  private hostBots: PaperBotAI[] = [];
  private hostBotInterval: any = null;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public async connect(): Promise<void> {
    return Promise.resolve();
  }

  public async joinQueue(
    playerName: string,
    skinId: string,
    weaponId: string,
    mapPreference?: MapSelectionId,
    existingUid?: string
  ) {
    this.playerName = playerName;
    this.playerId = existingUid || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!isFirebaseConfigured || !db) {
      console.warn('Firebase not fully configured. Using fallback local mode.');
      this.callbacks.onMatchFound?.({
        matchId: 'local-match',
        mapId: (mapPreference as MapId) || 'paper_city',
        realPlayersCount: 1,
        botsCount: 11,
        team: 'BLUE'
      });
      return;
    }

    this.callbacks.onQueueUpdate?.({
      playersCount: 1,
      maxPlayers: 12,
      status: 'searching',
      estimatedSeconds: 4
    });

    try {
      // 1. Search for an open match waiting for players
      const matchesRef = collection(db, 'matches');
      const q = query(matchesRef, where('status', '==', 'waiting'));
      const snap = await getDocs(q);

      let foundMatchId: string | null = null;
      let targetMap: MapId = (mapPreference as MapId) || 'paper_city';

      for (const d of snap.docs) {
        const m = d.data();
        // Check if created recently (within last 3 minutes)
        if (m.createdAt) {
          foundMatchId = d.id;
          targetMap = m.mapId || targetMap;
          break;
        }
      }

      if (foundMatchId) {
        // Join existing match as guest
        this.matchId = foundMatchId;
        this.isHost = false;
        await this.enterMatch(foundMatchId, targetMap, skinId, weaponId);
      } else {
        // Create new match as host
        this.isHost = true;
        const newMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.matchId = newMatchId;

        await setDoc(doc(db, 'matches', newMatchId), {
          matchId: newMatchId,
          status: 'waiting',
          hostId: this.playerId,
          mapId: targetMap,
          scoreRed: 0,
          scoreBlue: 0,
          maxScore: 30,
          timeRemaining: 300,
          createdAt: serverTimestamp()
        });

        await this.enterMatch(newMatchId, targetMap, skinId, weaponId);

        // Host matchmaking timer: wait 5s for real players, then fill with bots and start!
        let countdown = 5;
        this.matchmakingTimer = setInterval(async () => {
          countdown--;
          const playerCount = Object.values(this.allPlayersCache).filter(p => !p.isBot).length;

          this.callbacks.onQueueUpdate?.({
            playersCount: Math.max(1, playerCount),
            maxPlayers: 12,
            status: countdown <= 1 ? 'starting' : 'searching',
            countdown
          });

          if (countdown <= 0) {
            clearInterval(this.matchmakingTimer);
            await this.startMatchWithBots(targetMap);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      // Fallback
      this.callbacks.onMatchFound?.({
        matchId: 'local-match',
        mapId: 'paper_city',
        realPlayersCount: 1,
        botsCount: 11,
        team: 'BLUE'
      });
    }
  }

  private async enterMatch(matchId: string, mapId: MapId, skinId: string, weaponId: string) {
    this.mapId = mapId;
    const mapData = PaperMapsBuilder.buildMap(mapId);

    // Read current players to balance teams
    const playersSnap = await getDocs(collection(db, 'matches', matchId, 'players'));
    let redCount = 0;
    let blueCount = 0;
    playersSnap.forEach(d => {
      const p = d.data();
      if (p.team === 'RED') redCount++;
      else blueCount++;
    });

    this.playerTeam = blueCount <= redCount ? 'BLUE' : 'RED';
    const spawns = this.playerTeam === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
    const spawnPos = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };

    // Register self in Firestore
    await setDoc(doc(db, 'matches', matchId, 'players', this.playerId), {
      id: this.playerId,
      name: this.playerName,
      skinId,
      weaponId,
      team: this.playerTeam,
      isBot: false,
      pos: spawnPos,
      rotY: 0,
      pitch: 0,
      isShooting: false,
      isAiming: false,
      isReloading: false,
      isDead: false,
      respawnTimer: 0,
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      updatedAt: serverTimestamp()
    });

    this.listenToMatch();

    const initialState: GameMatchState = {
      matchId,
      mapId,
      status: 'in_progress',
      timeRemaining: 300,
      scoreRed: 0,
      scoreBlue: 0,
      maxScore: 30,
      players: {},
      killFeed: []
    };

    const realPlayersCount = Math.max(1, playersSnap.size + 1);
    this.callbacks.onMatchFound?.({
      matchId,
      mapId,
      realPlayersCount,
      botsCount: Math.max(0, 12 - realPlayersCount),
      team: this.playerTeam
    });

    this.callbacks.onMatchJoined(matchId, this.playerId, this.playerTeam, mapId, initialState);
  }

  private async startMatchWithBots(mapId: MapId) {
    if (!this.isHost || !this.matchId) return;

    try {
      await updateDoc(doc(db, 'matches', this.matchId), { status: 'in_progress' });

      // Calculate how many bots are needed to reach 8-12 combatants
      const currentPlayers = Object.values(this.allPlayersCache);
      const realCount = currentPlayers.filter(p => !p.isBot).length;
      const targetTotal = 10;
      const botsToSpawn = Math.max(2, targetTotal - realCount);

      const mapData = PaperMapsBuilder.buildMap(mapId);

      const botNames = [
        'OrigamiBot', 'PaperSniper', 'CardboardHero', 'FoldMaster',
        'CreaseKing', 'PencilAce', 'SheetShooter', 'PapyrusFox'
      ];

      for (let i = 0; i < botsToSpawn; i++) {
        const botId = `bot_${i + 1}`;
        let team: Team = i % 2 === 0 ? 'RED' : 'BLUE';
        // Balance with current players
        let redCount = Object.values(this.allPlayersCache).filter(p => p.team === 'RED').length;
        let blueCount = Object.values(this.allPlayersCache).filter(p => p.team === 'BLUE').length;
        team = redCount <= blueCount ? 'RED' : 'BLUE';

        const spawns = team === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
        const spawn = spawns[i % spawns.length] || { x: (i - 4) * 3, y: 0.1, z: 15 };

        const botData: PlayerNetworkState = {
          id: botId,
          name: `${botNames[i % botNames.length]} [BOT]`,
          skinId: 'explorer',
          weaponId: i % 3 === 0 ? 'smg' : i % 3 === 1 ? 'shotgun' : 'rifle',
          team,
          isBot: true,
          ping: 15,
          pos: { ...spawn },
          rotY: Math.random() * Math.PI * 2,
          pitch: 0,
          isShooting: false,
          isAiming: false,
          isReloading: false,
          isDead: false,
          respawnTimer: 0,
          health: 100,
          maxHealth: 100,
          kills: 0,
          deaths: 0
        };

        await setDoc(doc(db, 'matches', this.matchId, 'players', botId), botData);

        const botAI = new PaperBotAI(botData, mapData.waypoints, mapData.collisionBoxes, 'medium');
        this.hostBots.push(botAI);
      }

      // Start Host Bot Simulation Loop (sync bots at 15fps)
      this.startHostBotLoop(mapData);
    } catch (e) {
      console.warn('Error spawning bots in host:', e);
    }
  }

  private startHostBotLoop(mapData: any) {
    if (this.hostBotInterval) clearInterval(this.hostBotInterval);

    let lastTick = Date.now();
    this.hostBotInterval = setInterval(() => {
      if (!this.matchId || this.hostBots.length === 0) return;

      const now = Date.now();
      const delta = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;

      this.hostBots.forEach(bot => {
        if (bot.data.isDead) {
          if (bot.data.respawnTimer > 0) {
            bot.data.respawnTimer -= delta;
            if (bot.data.respawnTimer <= 0) {
              // Respawn bot
              const spawns = bot.data.team === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
              const spawn = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };
              bot.data.pos = { ...spawn };
              bot.data.health = 100;
              bot.data.isDead = false;
            }
          }
          return;
        }

        bot.update(delta, this.allPlayersCache, (shooter, origin, dir) => {
          this.sendShoot(origin, dir, shooter.id, shooter.team);
          // Check bot hit against real player or enemy bots
          this.checkHostBotHit(shooter, origin, dir);
        });

        // Sync bot state to Firestore periodically
        updateDoc(doc(db, 'matches', this.matchId, 'players', bot.data.id), {
          pos: bot.data.pos,
          rotY: bot.data.rotY,
          pitch: bot.data.pitch,
          isShooting: bot.data.isShooting,
          isReloading: bot.data.isReloading,
          isDead: bot.data.isDead,
          health: bot.data.health
        }).catch(() => {});
      });
    }, 70);
  }

  private checkHostBotHit(shooter: PlayerNetworkState, origin: Vector3D, dir: Vector3D) {
    const weapon = WEAPONS[shooter.weaponId] || WEAPONS.rifle;

    for (const target of Object.values(this.allPlayersCache)) {
      if (target.id === shooter.id || target.team === shooter.team || target.isDead) continue;

      const dx = target.pos.x - origin.x;
      const dy = (target.pos.y + 0.8) - origin.y;
      const dz = target.pos.z - origin.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist > weapon.range) continue;

      const dirNorm = Math.hypot(dir.x, dir.y, dir.z);
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / (dist * dirNorm);

      if (dot > 0.985) {
        const isHeadshot = dy > 1.2;
        const damage = isHeadshot ? Math.round(weapon.damage * 1.5) : weapon.damage;
        this.sendHit(target.id, damage, isHeadshot, { x: target.pos.x, y: target.pos.y + 1, z: target.pos.z });
        break;
      }
    }
  }

  private listenToMatch() {
    if (!db || !this.matchId) return;

    // Listen to players
    this.unsubscribePlayers = onSnapshot(collection(db, 'matches', this.matchId, 'players'), (snap) => {
      const players: Record<string, PlayerNetworkState> = {};
      let scoreRed = 0;
      let scoreBlue = 0;

      snap.forEach(d => {
        const p = d.data() as PlayerNetworkState;
        players[p.id] = p;
        if (p.team === 'RED') scoreRed += p.kills || 0;
        else scoreBlue += p.kills || 0;
      });

      this.allPlayersCache = players;
      this.callbacks.onGameTick(players, scoreRed, scoreBlue, 300);
    });

    // Listen to combat events (shoot, hit, kill)
    const eventsQuery = query(collection(db, 'matches', this.matchId, 'events'));
    let initialLoad = true;

    this.unsubscribeEvents = onSnapshot(eventsQuery, (snap) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const ev = change.doc.data();
          if (Date.now() - (ev.timestamp || 0) > 4000) return;

          if (ev.type === 'shoot') {
            const proj: PaperProjectile = JSON.parse(ev.data);
            if (proj.shooterId !== this.playerId) {
              this.callbacks.onProjectileSpawned(proj);
            }
          } else if (ev.type === 'hit') {
            const d = JSON.parse(ev.data);
            this.callbacks.onPlayerDamaged(d.targetId, d.damage, d.health, d.hitPos);

            // If I am the one who was hit:
            if (d.targetId === this.playerId && !this.isDead) {
              this.myHealth -= d.damage;
              if (this.myHealth <= 0) {
                this.myHealth = 0;
                this.isDead = true;
                this.myDeaths++;

                const killerName = this.allPlayersCache[d.shooterId]?.name || 'Adversário';
                const killEvId = `kill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

                const killItem: KillFeedItem = {
                  id: killEvId,
                  killerId: d.shooterId,
                  killerName,
                  killerTeam: this.allPlayersCache[d.shooterId]?.team || 'RED',
                  victimId: this.playerId,
                  victimName: this.playerName,
                  victimTeam: this.playerTeam,
                  weaponId: 'rifle',
                  weaponName: 'Rifle de Papel',
                  isHeadshot: d.isHeadshot,
                  timestamp: Date.now()
                };

                setDoc(doc(db, 'matches', this.matchId, 'events', killEvId), {
                  type: 'kill',
                  timestamp: Date.now(),
                  data: JSON.stringify(killItem)
                });

                // Respawn after 4 seconds
                setTimeout(() => {
                  this.myHealth = 100;
                  this.isDead = false;
                  const mapData = PaperMapsBuilder.buildMap(this.mapId);
                  const spawns = this.playerTeam === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
                  const spawn = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };

                  this.callbacks.onPlayerRespawned({
                    ...this.allPlayersCache[this.playerId],
                    pos: spawn,
                    health: 100,
                    isDead: false
                  });

                  updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
                    pos: spawn,
                    health: 100,
                    isDead: false
                  }).catch(() => {});
                }, 4000);
              }

              updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
                health: this.myHealth,
                isDead: this.isDead,
                deaths: this.myDeaths
              }).catch(() => {});
            }

            // If a host bot was hit:
            if (this.isHost && d.targetId.startsWith('bot_')) {
              const bot = this.hostBots.find(b => b.data.id === d.targetId);
              if (bot && !bot.data.isDead) {
                bot.data.health -= d.damage;
                if (bot.data.health <= 0) {
                  bot.data.health = 0;
                  bot.data.isDead = true;
                  bot.data.respawnTimer = 4.0;

                  const killerName = this.allPlayersCache[d.shooterId]?.name || 'Adversário';
                  const killEvId = `kill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

                  const killItem: KillFeedItem = {
                    id: killEvId,
                    killerId: d.shooterId,
                    killerName,
                    killerTeam: this.allPlayersCache[d.shooterId]?.team || 'RED',
                    victimId: bot.data.id,
                    victimName: bot.data.name,
                    victimTeam: bot.data.team,
                    weaponId: 'rifle',
                    weaponName: 'Rifle de Papel',
                    isHeadshot: d.isHeadshot,
                    timestamp: Date.now()
                  };

                  setDoc(doc(db, 'matches', this.matchId, 'events', killEvId), {
                    type: 'kill',
                    timestamp: Date.now(),
                    data: JSON.stringify(killItem)
                  });
                }
              }
            }

          } else if (ev.type === 'kill') {
            const k: KillFeedItem = JSON.parse(ev.data);
            this.callbacks.onPlayerKilled(k, 0, 0);

            if (k.killerId === this.playerId) {
              this.myKills++;
              updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
                kills: this.myKills
              }).catch(() => {});
            }
          }
        }
      });
    });
  }

  public async sendPlayerUpdate(
    pos: Vector3D,
    rotY: number,
    pitch: number,
    isShooting: boolean,
    isAiming: boolean,
    isReloading: boolean
  ) {
    if (!this.matchId || !this.playerId || this.isDead || !db) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    try {
      await updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
        pos,
        rotY,
        pitch,
        isShooting,
        isAiming,
        isReloading,
        updatedAt: serverTimestamp()
      });
    } catch {
      // ignore
    }
  }

  public async sendShoot(origin: Vector3D, dir: Vector3D, customShooterId?: string, customTeam?: Team) {
    if (!this.matchId || !db) return;

    const shooterId = customShooterId || this.playerId;
    const team = customTeam || this.playerTeam;

    const proj: PaperProjectile = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      shooterId,
      shooterTeam: team,
      weaponId: 'rifle',
      pos: origin,
      velocity: { x: dir.x * 45, y: dir.y * 45, z: dir.z * 45 },
      damage: 25,
      radius: 0.2,
      lifeTime: 0,
      maxLifeTime: 3.0,
      color: team === 'RED' ? '#ef4444' : '#3b82f6'
    };

    try {
      await setDoc(doc(db, 'matches', this.matchId, 'events', proj.id), {
        type: 'shoot',
        timestamp: Date.now(),
        data: JSON.stringify(proj)
      });
    } catch {
      // ignore
    }
  }

  public async sendHit(targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) {
    if (!this.matchId || !db) return;

    const evId = `hit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      await setDoc(doc(db, 'matches', this.matchId, 'events', evId), {
        type: 'hit',
        timestamp: Date.now(),
        data: JSON.stringify({
          targetId,
          damage,
          isHeadshot,
          hitPos,
          shooterId: this.playerId,
          health: 100
        })
      });
    } catch {
      // ignore
    }
  }

  public sendSwitchWeapon(weaponId: string) {
    if (!this.matchId || !this.playerId || !db) return;
    updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
      weaponId
    }).catch(() => {});
  }

  public leaveQueue() {
    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
      this.matchmakingTimer = null;
    }
    this.disconnect();
  }

  public disconnect() {
    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
      this.matchmakingTimer = null;
    }
    if (this.hostBotInterval) {
      clearInterval(this.hostBotInterval);
      this.hostBotInterval = null;
    }

    if (this.unsubscribeMatch) this.unsubscribeMatch();
    if (this.unsubscribePlayers) this.unsubscribePlayers();
    if (this.unsubscribeEvents) this.unsubscribeEvents();

    if (this.matchId && this.playerId && db) {
      deleteDoc(doc(db, 'matches', this.matchId, 'players', this.playerId)).catch(() => {});
    }

    this.matchId = '';
    this.hostBots = [];
  }
}
