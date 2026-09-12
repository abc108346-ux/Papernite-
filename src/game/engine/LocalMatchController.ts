import { BotDifficulty, GameMatchState, KillFeedItem, MapId, PaperProjectile, PlayerNetworkState, Team, Vector3D } from '../../types/game';
import { BOT_NAMES, SKINS, WEAPONS } from '../constants';
import { PaperMapsBuilder } from './PaperMaps';
import { PaperBotAI } from '../bots/PaperBotAI';
import { NetworkCallbacks } from '../network/NetworkClient';

export class LocalMatchController {
  public playerId: string;
  public matchId: string;
  public mapId: MapId;
  public difficulty: BotDifficulty;
  public currentPing: number = 0; // Offline = 0ms ping!

  private callbacks: NetworkCallbacks;
  private state: GameMatchState;
  private bots: PaperBotAI[] = [];
  private spawnsRed: Vector3D[];
  private spawnsBlue: Vector3D[];
  private loopInterval: any = null;
  private lastTickTime: number = Date.now();
  private isDestroyed = false;
  private collisionBoxes: any[];

  constructor(
    mapId: MapId,
    difficulty: BotDifficulty,
    playerInfo: { id: string; name: string; skinId: string; weaponId: string; team: Team },
    callbacks: NetworkCallbacks
  ) {
    this.mapId = mapId;
    this.difficulty = difficulty;
    this.playerId = playerInfo.id || 'local_hero';
    this.matchId = `offline_train_${Date.now()}`;
    this.callbacks = callbacks;

    const mapData = PaperMapsBuilder.buildMap(mapId);
    this.spawnsRed = mapData.spawnsRed;
    this.spawnsBlue = mapData.spawnsBlue;
    this.collisionBoxes = mapData.collisionBoxes;

    const initialSpawn = playerInfo.team === 'RED'
      ? this.spawnsRed[0] || { x: 0, y: 0.1, z: 0 }
      : this.spawnsBlue[0] || { x: 0, y: 0.1, z: 0 };

    this.state = {
      matchId: this.matchId,
      mapId,
      status: 'in_progress',
      timeRemaining: 300,
      scoreRed: 0,
      scoreBlue: 0,
      maxScore: 30,
      players: {},
      killFeed: []
    };

    // 1. Add Local Player
    const localPlayerState: PlayerNetworkState = {
      id: this.playerId,
      name: playerInfo.name || 'Você',
      team: playerInfo.team,
      isBot: false,
      skinId: playerInfo.skinId || 'explorer',
      weaponId: playerInfo.weaponId || 'rifle',
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      ping: 0,
      pos: { ...initialSpawn },
      rotY: 0,
      pitch: 0,
      isShooting: false,
      isAiming: false,
      isReloading: false,
      isDead: false,
      respawnTimer: 0
    };
    this.state.players[this.playerId] = localPlayerState;

    // 2. Add 11 Bots (5 allies on player's team, 6 enemies on opposite team)
    const weaponKeys = Object.keys(WEAPONS);
    const skinKeys = Object.keys(SKINS);
    const botNamesShuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());

    for (let i = 0; i < 11; i++) {
      // 5 allies, 6 enemies
      const isAlly = i < 5;
      const botTeam: Team = isAlly ? playerInfo.team : (playerInfo.team === 'BLUE' ? 'RED' : 'BLUE');
      const spawns = botTeam === 'RED' ? this.spawnsRed : this.spawnsBlue;
      const spawnPos = spawns[(i + 1) % spawns.length] || { x: 0, y: 0.1, z: 0 };

      const bId = `bot_train_${i + 1}`;
      const bName = botNamesShuffled[i] || `Bot ${i + 1}`;
      const skinId = skinKeys[i % skinKeys.length];
      const weaponId = weaponKeys[(i + 1) % weaponKeys.length];

      const bState: PlayerNetworkState = {
        id: bId,
        name: `${bName} [BOT]`,
        team: botTeam,
        isBot: true,
        skinId,
        weaponId,
        health: 100,
        maxHealth: 100,
        kills: 0,
        deaths: 0,
        ping: Math.floor(2 + Math.random() * 8),
        pos: { ...spawnPos },
        rotY: Math.random() * Math.PI * 2,
        pitch: 0,
        isShooting: false,
        isAiming: false,
        isReloading: false,
        isDead: false,
        respawnTimer: 0
      };

      this.state.players[bId] = bState;
      const botAI = new PaperBotAI(bState, mapData.waypoints, mapData.collisionBoxes, this.difficulty);
      this.bots.push(botAI);
    }
  }

  public start() {
    this.callbacks.onMatchJoined(
      this.matchId,
      this.playerId,
      this.state.players[this.playerId].team,
      this.mapId,
      this.state
    );

    this.lastTickTime = Date.now();
    this.loopInterval = setInterval(() => this.tick(), 50); // 20 updates / sec
  }

  private tick() {
    if (this.isDestroyed || this.state.status !== 'in_progress') return;
    const now = Date.now();
    const delta = Math.min(0.1, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;

    // Timer countdown
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - delta);
    if (this.state.timeRemaining <= 0) {
      this.state.status = 'ended';
      this.state.winnerTeam = this.state.scoreRed > this.state.scoreBlue ? 'RED' : this.state.scoreBlue > this.state.scoreRed ? 'BLUE' : 'DRAW';
      this.callbacks.onMatchEnded(this.state.winnerTeam, this.state.scoreRed, this.state.scoreBlue);
      return;
    }

    // Respawn update
    for (const p of Object.values(this.state.players)) {
      if (p.isDead) {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.isDead = false;
          p.health = p.maxHealth;
          const spawns = p.team === 'RED' ? this.spawnsRed : this.spawnsBlue;
          const spawn = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };
          p.pos = { ...spawn };
          this.callbacks.onPlayerRespawned(p);
        }
      }
    }

    // Update Bot AI
    for (const bot of this.bots) {
      bot.update(delta, this.state.players, (shooter, origin, dir) => {
        const weapon = WEAPONS[shooter.weaponId] || WEAPONS.rifle;
        const projectile: PaperProjectile = {
          id: `proj_local_${Math.random().toString(36).substring(2, 9)}`,
          shooterId: shooter.id,
          shooterTeam: shooter.team,
          weaponId: shooter.weaponId,
          pos: origin,
          velocity: {
            x: dir.x * weapon.projectileSpeed,
            y: dir.y * weapon.projectileSpeed,
            z: dir.z * weapon.projectileSpeed
          },
          damage: weapon.damage,
          radius: 0.25,
          lifeTime: 0,
          maxLifeTime: 2.5,
          color: shooter.team === 'RED' ? '#fca5a5' : '#93c5fd'
        };

        this.callbacks.onProjectileSpawned(projectile);

        // Offline bot hit check against local player or enemy bots
        this.processBotHitRaycast(shooter, origin, dir, weapon);
      });
    }

    // Emit tick update
    this.callbacks.onGameTick(
      this.state.players,
      this.state.scoreRed,
      this.state.scoreBlue,
      Math.floor(this.state.timeRemaining)
    );
  }

  private hasLineOfSight(origin: Vector3D, targetPos: Vector3D, collisionBoxes: any[]): boolean {
    const dx = targetPos.x - origin.x;
    const dy = targetPos.y - origin.y;
    const dz = targetPos.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist <= 0.2) return true;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const dirZ = dz / dist;

    for (const box of collisionBoxes) {
      let tMin = 0.0001;
      let tMax = dist - 0.2;

      // X
      if (Math.abs(dirX) < 1e-6) {
        if (origin.x < box.min.x || origin.x > box.max.x) continue;
      } else {
        const invD = 1.0 / dirX;
        let t0 = (box.min.x - origin.x) * invD;
        let t1 = (box.max.x - origin.x) * invD;
        if (invD < 0.0) { const temp = t0; t0 = t1; t1 = temp; }
        tMin = Math.max(tMin, t0);
        tMax = Math.min(tMax, t1);
        if (tMax <= tMin) continue;
      }

      // Y
      if (Math.abs(dirY) < 1e-6) {
        if (origin.y < box.min.y || origin.y > box.max.y) continue;
      } else {
        const invD = 1.0 / dirY;
        let t0 = (box.min.y - origin.y) * invD;
        let t1 = (box.max.y - origin.y) * invD;
        if (invD < 0.0) { const temp = t0; t0 = t1; t1 = temp; }
        tMin = Math.max(tMin, t0);
        tMax = Math.min(tMax, t1);
        if (tMax <= tMin) continue;
      }

      // Z
      if (Math.abs(dirZ) < 1e-6) {
        if (origin.z < box.min.z || origin.z > box.max.z) continue;
      } else {
        const invD = 1.0 / dirZ;
        let t0 = (box.min.z - origin.z) * invD;
        let t1 = (box.max.z - origin.z) * invD;
        if (invD < 0.0) { const temp = t0; t0 = t1; t1 = temp; }
        tMin = Math.max(tMin, t0);
        tMax = Math.min(tMax, t1);
        if (tMax <= tMin) continue;
      }

      // Blocked by this box!
      return false;
    }

    return true;
  }

  private processBotHitRaycast(shooter: PlayerNetworkState, origin: Vector3D, dir: Vector3D, weapon: any) {
    for (const target of Object.values(this.state.players)) {
      if (target.id === shooter.id || target.team === shooter.team || target.isDead) continue;

      const dx = target.pos.x - origin.x;
      const dy = (target.pos.y + 0.8) - origin.y;
      const dz = target.pos.z - origin.z;
      const dist = Math.hypot(dx, dz);

      if (dist > weapon.range) continue;

      // Check alignment with shot direction
      const dirNorm = Math.hypot(dir.x, dir.y, dir.z);
      const dot = (dx * dir.x + dy * dir.y + dz * dir.z) / (Math.hypot(dx, dy, dz) * dirNorm);

      // Hit threshold
      if (dot > 0.985) {
        // Line of sight check
        const targetCenter = { x: target.pos.x, y: target.pos.y + 0.8, z: target.pos.z };
        if (!this.hasLineOfSight(origin, targetCenter, this.collisionBoxes)) {
           continue; // blocked by wall
        }

        const isHeadshot = dy > 1.2;
        const damage = isHeadshot ? Math.round(weapon.damage * 1.5) : weapon.damage;
        this.applyDamage(shooter.id, target.id, damage, isHeadshot, { x: target.pos.x, y: target.pos.y + 1, z: target.pos.z });
        break;
      }
    }
  }

  public sendPlayerUpdate(pos: Vector3D, rotY: number, pitch: number, isShooting: boolean, isAiming: boolean, isReloading: boolean) {
    const p = this.state.players[this.playerId];
    if (p) {
      p.pos = pos;
      p.rotY = rotY;
      p.pitch = pitch;
      p.isShooting = isShooting;
      p.isAiming = isAiming;
      p.isReloading = isReloading;
    }
  }

  public sendShoot(origin: Vector3D, dir: Vector3D) {
    const player = this.state.players[this.playerId];
    if (!player) return;
    const weapon = WEAPONS[player.weaponId] || WEAPONS.rifle;

    const pellets = weapon.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = weapon.spread;
      const jx = (Math.random() - 0.5) * spread;
      const jy = (Math.random() - 0.5) * spread;
      const jz = (Math.random() - 0.5) * spread;

      const d: Vector3D = {
        x: dir.x + jx,
        y: dir.y + jy,
        z: dir.z + jz
      };
      const len = Math.hypot(d.x, d.y, d.z);
      d.x /= len;
      d.y /= len;
      d.z /= len;

      const projectile: PaperProjectile = {
        id: `proj_local_${Math.random().toString(36).substring(2, 9)}`,
        shooterId: this.playerId,
        shooterTeam: player.team,
        weaponId: player.weaponId,
        pos: origin,
        velocity: {
          x: d.x * weapon.projectileSpeed,
          y: d.y * weapon.projectileSpeed,
          z: d.z * weapon.projectileSpeed
        },
        damage: weapon.damage,
        radius: 0.25,
        lifeTime: 0,
        maxLifeTime: 2.5,
        color: player.team === 'RED' ? '#fca5a5' : '#93c5fd'
      };

      this.callbacks.onProjectileSpawned(projectile);
    }
  }

  public sendHit(targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) {
    this.applyDamage(this.playerId, targetId, damage, isHeadshot, hitPos);
  }

  private applyDamage(shooterId: string, targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) {
    const victim = this.state.players[targetId];
    const shooter = this.state.players[shooterId];
    if (!victim || !shooter || victim.team === shooter.team || victim.isDead) return;

    victim.health = Math.max(0, victim.health - damage);
    this.callbacks.onPlayerDamaged(victim.id, damage, victim.health, hitPos);

    if (victim.health <= 0) {
      victim.isDead = true;
      victim.deaths++;
      victim.respawnTimer = 4;

      shooter.kills++;
      if (shooter.team === 'RED') this.state.scoreRed++;
      else this.state.scoreBlue++;

      const killItem: KillFeedItem = {
        id: `kf_${Date.now()}_${Math.random()}`,
        killerName: shooter.name,
        killerTeam: shooter.team,
        victimName: victim.name,
        victimTeam: victim.team,
        weaponName: WEAPONS[shooter.weaponId]?.name || 'Arma de Papel',
        isHeadshot,
        timestamp: Date.now()
      };

      this.state.killFeed.unshift(killItem);
      if (this.state.killFeed.length > 5) this.state.killFeed.pop();

      this.callbacks.onPlayerKilled(killItem, this.state.scoreRed, this.state.scoreBlue);

      // Check victory condition
      if (this.state.scoreRed >= this.state.maxScore || this.state.scoreBlue >= this.state.maxScore) {
        this.state.status = 'ended';
        this.state.winnerTeam = this.state.scoreRed >= this.state.maxScore ? 'RED' : 'BLUE';
        this.callbacks.onMatchEnded(this.state.winnerTeam, this.state.scoreRed, this.state.scoreBlue);
      }
    }
  }

  public sendSwitchWeapon(weaponId: string) {
    if (this.state.players[this.playerId]) {
      this.state.players[this.playerId].weaponId = weaponId;
    }
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
}
