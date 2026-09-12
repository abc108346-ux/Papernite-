import { collection, doc, onSnapshot, setDoc, updateDoc, getDocs, query, where, serverTimestamp, deleteDoc, getFirestore } from 'firebase/firestore';
import { GameMatchState, KillFeedItem, MapId, MapSelectionId, PaperProjectile, PlayerNetworkState, Team, Vector3D, MatchmakingQueueState } from '../../types/game';
import { auth } from '../../firebase/authService';

let db: any = null;
try {
  const { getApp } = require('firebase/app');
  db = getFirestore(getApp());
} catch(e) {}

export interface NetworkCallbacks {
  onQueueUpdate?: (queueState: MatchmakingQueueState) => void;
  onMatchFound?: (data: { matchId: string; mapId: MapId; realPlayersCount: number; botsCount: number; team: Team }) => void;
  onMatchJoined: (matchId: string, playerId: string, team: 'RED' | 'BLUE', mapId: MapId, state: GameMatchState) => void;
  onGameTick: (players: Record<string, PlayerNetworkState>, scoreRed: number, scoreBlue: number, timeRemaining: number) => void;
  onProjectileSpawned: (projectile: PaperProjectile) => void;
  onPlayerDamaged: (targetId: string, damage: number, remainingHealth: number, hitPos?: Vector3D) => void;
  onPlayerKilled: (killItem: KillFeedItem, scoreRed: number, scoreBlue: number) => void;
  onPlayerRespawned: (player: PlayerNetworkState) => void;
  onMatchEnded: (winner: 'RED' | 'BLUE' | 'DRAW', state: GameMatchState) => void;
  onPingUpdate: (ping: number) => void;
}

export class NetworkClient {
  private callbacks: NetworkCallbacks;
  public playerId: string = '';
  public playerTeam: Team = 'RED';
  public matchId: string = '';
  public currentPing: number = 45;
  
  private unsubscribeMatch: any = null;
  private unsubscribePlayers: any = null;
  private unsubscribeEvents: any = null;

  private lastUpdate: number = 0;
  private updateInterval = 150; // Throttle updates
  
  public myHealth: number = 100;
  public myKills: number = 0;
  public myDeaths: number = 0;
  public isDead: boolean = false;
  private allPlayersCache: Record<string, PlayerNetworkState> = {};

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public async connect(): Promise<void> {
    if (!db || !auth.currentUser) throw new Error("Firebase not ready");
    this.playerId = auth.currentUser.uid;
    this.callbacks.onPingUpdate(this.currentPing);
  }

  public async joinMatchmaking(playerName: string, skinId: string, weaponId: string, mapId: MapId) {
    if (!db) return;
    
    // Find open match
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('status', '==', 'waiting'));
    const snapshot = await getDocs(q);
    
    let targetMatchId = '';
    let team: Team = 'RED';

    if (!snapshot.empty) {
      targetMatchId = snapshot.docs[0].id;
      team = Math.random() > 0.5 ? 'RED' : 'BLUE'; // Random team for prototype
    } else {
      targetMatchId = `match_${Date.now()}`;
      await setDoc(doc(db, 'matches', targetMatchId), {
        status: 'waiting',
        mapId,
        scoreRed: 0,
        scoreBlue: 0,
        timeRemaining: 300,
        createdAt: serverTimestamp(),
        hostId: this.playerId
      });
      team = 'RED';
    }

    this.matchId = targetMatchId;
    this.playerTeam = team;
    
    this.myHealth = 100;
    this.myKills = 0;
    this.myDeaths = 0;
    this.isDead = false;

    const playerRef = doc(db, 'matches', this.matchId, 'players', this.playerId);
    await setDoc(playerRef, {
      id: this.playerId,
      name: playerName,
      skinId,
      weaponId,
      team,
      pos: { x: (Math.random()-0.5)*10, y: 0.1, z: (Math.random()-0.5)*10 },
      rotY: 0,
      pitch: 0,
      isShooting: false,
      isAiming: false,
      isReloading: false,
      isDead: false,
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      updatedAt: serverTimestamp()
    });

    this.listenToMatch();

    const initialState: GameMatchState = {
      matchId: this.matchId,
      mapId,
      status: 'waiting',
      timeRemaining: 300,
      scoreRed: 0,
      scoreBlue: 0,
      maxScore: 50,
      players: {},
      killFeed: []
    };

    this.callbacks.onMatchJoined(this.matchId, this.playerId, team, mapId, initialState);
    
    setTimeout(() => {
       updateDoc(doc(db, 'matches', this.matchId), { status: 'playing' }).catch(()=>{});
    }, 5000);
  }

  private listenToMatch() {
    this.unsubscribeMatch = onSnapshot(doc(db, 'matches', this.matchId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
      }
    });

    this.unsubscribePlayers = onSnapshot(collection(db, 'matches', this.matchId, 'players'), (snap) => {
      const players: Record<string, PlayerNetworkState> = {};
      snap.forEach(d => {
        const p = d.data() as PlayerNetworkState;
        players[p.id] = p;
      });
      
      this.allPlayersCache = players;
      
      let sR = 0, sB = 0;
      Object.values(players).forEach(p => {
        if(p.team === 'RED') sR += p.kills || 0;
        else sB += p.kills || 0;
      });
      
      this.callbacks.onGameTick(players, sR, sB, 300);
    });

    const eventsQuery = query(collection(db, 'matches', this.matchId, 'events'));
    let firstLoad = true;
    this.unsubscribeEvents = onSnapshot(eventsQuery, (snap) => {
      if (firstLoad) { firstLoad = false; return; }
      
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const ev = change.doc.data();
          if (Date.now() - ev.timestamp > 3000) return;

          if (ev.type === 'shoot') {
             this.callbacks.onProjectileSpawned(JSON.parse(ev.data));
          } else if (ev.type === 'hit') {
             const d = JSON.parse(ev.data);
             this.callbacks.onPlayerDamaged(d.targetId, d.damage, d.health, d.hitPos);
             
             // If I was hit!
             if (d.targetId === this.playerId && !this.isDead) {
                this.myHealth -= d.damage;
                if (this.myHealth <= 0) {
                    this.myHealth = 0;
                    this.isDead = true;
                    this.myDeaths++;
                    
                    // Send kill event
                    const shooterName = this.allPlayersCache[d.shooterId]?.name || 'Unknown';
                    const myName = this.allPlayersCache[this.playerId]?.name || 'Unknown';
                    
                    const killEvId = `kill_${Date.now()}_${Math.random()}`;
                    setDoc(doc(db, 'matches', this.matchId, 'events', killEvId), {
                      type: 'kill',
                      timestamp: Date.now(),
                      data: JSON.stringify({
                          id: killEvId,
                          killerId: d.shooterId,
                          killerName: shooterName,
                          killerTeam: this.allPlayersCache[d.shooterId]?.team || 'RED',
                          victimId: this.playerId,
                          victimName: myName,
                          victimTeam: this.playerTeam,
                          weaponId: 'rifle',
                          isHeadshot: d.isHeadshot
                      })
                    });
                    
                    // Respawn after 3s
                    setTimeout(() => {
                        this.myHealth = 100;
                        this.isDead = false;
                        const spawnPos = { x: (Math.random()-0.5)*10, y: 0.1, z: (Math.random()-0.5)*10 };
                        this.callbacks.onPlayerRespawned({
                            ...this.allPlayersCache[this.playerId],
                            pos: spawnPos,
                            health: 100,
                            isDead: false
                        });
                    }, 3000);
                }
                
                // Update my player doc instantly
                updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
                    health: this.myHealth,
                    isDead: this.isDead,
                    deaths: this.myDeaths
                }).catch(()=>{});
             }
             
          } else if (ev.type === 'kill') {
             const k = JSON.parse(ev.data);
             this.callbacks.onPlayerKilled(k, 0, 0);
             // If I got the kill!
             if (k.killerId === this.playerId) {
                 this.myKills++;
                 updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
                     kills: this.myKills
                 }).catch(()=>{});
             }
          }
        }
      });
    });
  }

  public async sendPlayerUpdate(pos: Vector3D, rotY: number, pitch: number, isShooting: boolean, isAiming: boolean, isReloading: boolean) {
    if (!this.matchId || !this.playerId || this.isDead) return;
    
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    try {
      await updateDoc(doc(db, 'matches', this.matchId, 'players', this.playerId), {
        pos, rotY, pitch, isShooting, isAiming, isReloading,
        updatedAt: serverTimestamp()
      });
    } catch(e) {}
  }

  public async sendShoot(origin: Vector3D, dir: Vector3D) {
    if (!this.matchId || this.isDead) return;
    const proj: PaperProjectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      shooterId: this.playerId,
      shooterTeam: this.playerTeam,
      weaponId: 'rifle',
      pos: origin,
      velocity: { x: dir.x*40, y: dir.y*40, z: dir.z*40 },
      damage: 25
    };
    
    await setDoc(doc(db, 'matches', this.matchId, 'events', proj.id), {
      type: 'shoot',
      timestamp: Date.now(),
      data: JSON.stringify(proj)
    });
  }

  public async sendHit(targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) {
    if (!this.matchId) return;
    const evId = `hit_${Date.now()}_${Math.random()}`;
    await setDoc(doc(db, 'matches', this.matchId, 'events', evId), {
      type: 'hit',
      timestamp: Date.now(),
      data: JSON.stringify({ 
         targetId, 
         damage, 
         hitPos, 
         isHeadshot, 
         shooterId: this.playerId,
         health: 100 // Ignored by target, they track their own
      })
    });
  }

  public joinQueue(playerName: string, skinId: string, weaponId: string, mapPreference?: MapSelectionId) {
    this.callbacks.onQueueUpdate?.({
      playersCount: 1,
      maxPlayers: 12,
      status: 'searching',
      countdown: 3,
      estimatedSeconds: 3
    });
    
    setTimeout(() => {
       this.callbacks.onMatchFound?.({ matchId: 'firebase-match', mapId: (mapPreference as MapId) || 'paper_city', realPlayersCount: 1, botsCount: 5, team: 'RED' });
       this.joinMatchmaking(playerName, skinId, weaponId, (mapPreference as MapId) || 'paper_city');
    }, 2000);
  }

  public leaveQueue() {}
  public sendSwitchWeapon(weaponId: string) {}

  public disconnect() {
    if (this.unsubscribeMatch) this.unsubscribeMatch();
    if (this.unsubscribePlayers) this.unsubscribePlayers();
    if (this.unsubscribeEvents) this.unsubscribeEvents();
    
    if (this.matchId && this.playerId) {
      deleteDoc(doc(db, 'matches', this.matchId, 'players', this.playerId)).catch(()=>{});
    }
    this.matchId = '';
  }
}
