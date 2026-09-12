import { GameMatchState, MapId, PaperProjectile, PlayerNetworkState, Vector3D, KillFeedItem, MatchmakingQueueState, Team } from '../../types/game';

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
  private ws: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  public playerId: string = '';
  public matchId: string = '';
  public currentPing: number = 20;
  private pingInterval: any = null;
  private isConnecting = false;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'pong') {
            this.currentPing = Date.now() - msg.clientTime;
            this.callbacks.onPingUpdate(this.currentPing);
            return;
          }

          if (msg.type === 'queue_update') {
            this.callbacks.onQueueUpdate?.({
              playersCount: msg.playersCount,
              maxPlayers: msg.maxPlayers,
              countdown: msg.countdown,
              status: msg.status,
              estimatedSeconds: 10
            });
            return;
          }

          if (msg.type === 'match_found') {
            this.callbacks.onMatchFound?.({
              matchId: msg.matchId,
              mapId: msg.mapId,
              realPlayersCount: msg.realPlayersCount,
              botsCount: msg.botsCount,
              team: msg.team
            });
            return;
          }

          if (msg.type === 'match_joined') {
            this.matchId = msg.matchId;
            this.playerId = msg.playerId;
            this.callbacks.onMatchJoined(msg.matchId, msg.playerId, msg.team, msg.mapId, msg.state);
            return;
          }

          if (msg.type === 'game_tick') {
            this.callbacks.onGameTick(msg.players, msg.scoreRed, msg.scoreBlue, msg.timeRemaining);
            return;
          }

          if (msg.type === 'projectile_spawned') {
            this.callbacks.onProjectileSpawned(msg.projectile);
            return;
          }

          if (msg.type === 'player_damaged') {
            this.callbacks.onPlayerDamaged(msg.targetId, msg.damage, msg.remainingHealth, msg.hitPos);
            return;
          }

          if (msg.type === 'player_killed') {
            this.callbacks.onPlayerKilled(msg.killItem, msg.scoreRed, msg.scoreBlue);
            return;
          }

          if (msg.type === 'player_respawned') {
            this.callbacks.onPlayerRespawned(msg.player);
            return;
          }

          if (msg.type === 'match_ended') {
            this.callbacks.onMatchEnded(msg.winner, msg.state);
            return;
          }
        } catch (e) {
          console.error('Error handling ws message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        this.isConnecting = false;
        resolve();
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPing();
      };
    });
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      }
    }, 2000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public joinQueue(playerName: string, skinId: string, weaponId: string, mapPreference?: MapId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'join_queue',
      playerName,
      skinId,
      weaponId,
      mapPreference
    }));
  }

  public leaveQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'leave_queue'
    }));
  }

  public joinMatchmaking(playerName: string, skinId: string, weaponId: string, mapId: MapId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'join_matchmaking',
      playerName,
      skinId,
      weaponId,
      mapId
    }));
  }

  public sendPlayerUpdate(pos: Vector3D, rotY: number, pitch: number, isShooting: boolean, isAiming: boolean, isReloading: boolean) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'player_update',
      pos,
      rotY,
      pitch,
      isShooting,
      isAiming,
      isReloading,
      ping: this.currentPing
    }));
  }

  public sendShoot(origin: Vector3D, dir: Vector3D) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'player_shoot',
      origin,
      dir
    }));
  }

  public sendHit(targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'player_hit',
      targetId,
      damage,
      isHeadshot,
      hitPos
    }));
  }

  public sendSwitchWeapon(weaponId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'switch_weapon',
      weaponId
    }));
  }

  public disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
