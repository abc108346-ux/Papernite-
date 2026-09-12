import { BotDifficulty, PlayerNetworkState, Team, Vector3D } from '../../types/game';
import { WEAPONS } from '../constants';
import { CollisionBox } from '../engine/PaperMaps';

export class PaperBotAI {
  public data: PlayerNetworkState;
  public difficulty: BotDifficulty;
  private waypoints: Vector3D[];
  private currentWaypointIdx = 0;
  private targetPlayerId: string | null = null;
  private targetLostTimer: number = 0;
  private reactionTimer: number = 0;
  private collisionBoxes: CollisionBox[];

  private shootCooldown = 0;
  private reloadCooldown = 0;
  private currentAmmo = 25;
  private strafeDir = 1;
  private strafeTimer = 0;
  private thinkTimer = 0;

  constructor(
    data: PlayerNetworkState,
    waypoints: Vector3D[],
    collisionBoxes: CollisionBox[],
    difficulty: BotDifficulty = 'medium'
  ) {
    this.data = data;
    this.waypoints = waypoints;
    this.collisionBoxes = collisionBoxes;
    this.difficulty = difficulty;
    this.currentWaypointIdx = Math.floor(Math.random() * Math.max(1, waypoints.length));
    const weapon = WEAPONS[data.weaponId] || WEAPONS.rifle;
    this.currentAmmo = weapon.ammoCapacity;
  }

  public update(
    delta: number,
    allPlayers: Record<string, PlayerNetworkState>,
    onShoot: (bot: PlayerNetworkState, origin: Vector3D, dir: Vector3D) => void
  ) {
    if (this.data.isDead) return;

    this.thinkTimer -= delta;
    this.shootCooldown -= delta;
    this.strafeTimer -= delta;
    if (this.reactionTimer > 0) this.reactionTimer -= delta;

    if (this.targetLostTimer > 0) {
      this.targetLostTimer -= delta;
      if (this.targetLostTimer <= 0) {
        this.targetPlayerId = null;
      }
    }

    // Reload management
    if (this.reloadCooldown > 0) {
      this.reloadCooldown -= delta;
      this.data.isReloading = true;
      if (this.reloadCooldown <= 0) {
        const weapon = WEAPONS[this.data.weaponId] || WEAPONS.rifle;
        this.currentAmmo = weapon.ammoCapacity;
        this.data.isReloading = false;
      }
    }

    // Periodic AI thinking / enemy search
    if (this.thinkTimer <= 0) {
      const scanInterval = this.difficulty === 'hard' ? 0.12 : this.difficulty === 'easy' ? 0.35 : 0.2;
      this.thinkTimer = scanInterval;
      this.findTarget(allPlayers);
    }

    const weapon = WEAPONS[this.data.weaponId] || WEAPONS.rifle;

    // ACTIVE COMBAT STATE
    if (this.targetPlayerId && allPlayers[this.targetPlayerId] && !allPlayers[this.targetPlayerId].isDead) {
      const target = allPlayers[this.targetPlayerId];
      const dx = target.pos.x - this.data.pos.x;
      const dz = target.pos.z - this.data.pos.z;
      const dist = Math.hypot(dx, dz);

      // Aim at target
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - this.data.rotY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const turnRate = this.difficulty === 'hard' ? 14 : this.difficulty === 'easy' ? 5 : 9;
      this.data.rotY += diff * Math.min(1, delta * turnRate);

      const dy = (target.pos.y + 0.8) - (this.data.pos.y + 1.2);
      this.data.pitch = Math.atan2(dy, Math.max(0.1, dist));

      // Strafe timer
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 1.0 + Math.random() * 1.5;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
      }

      // Movement: advance to weapon range or strafe
      const baseSpeed = this.difficulty === 'hard' ? 5.2 : this.difficulty === 'easy' ? 3.8 : 4.4;
      if (dist > 18) {
        // Advance towards target
        this.move(Math.sin(this.data.rotY) * baseSpeed * delta, Math.cos(this.data.rotY) * baseSpeed * delta);
      } else if (dist < 4) {
        // Back off slightly if too close
        this.move(-Math.sin(this.data.rotY) * baseSpeed * 0.5 * delta, -Math.cos(this.data.rotY) * baseSpeed * 0.5 * delta);
      } else {
        // Tactical strafe around target
        const strafeAngle = this.data.rotY + (Math.PI / 2) * this.strafeDir;
        this.move(Math.sin(strafeAngle) * baseSpeed * 0.65 * delta, Math.cos(strafeAngle) * baseSpeed * 0.65 * delta);
      }

      // Line of Sight & Shooting
      const hasLOS = this.hasLineOfSight(target.pos);
      if (hasLOS) {
        this.targetLostTimer = 2.5; // refresh sight
      }

      if (dist < weapon.range && hasLOS && this.reactionTimer <= 0 && this.shootCooldown <= 0 && this.reloadCooldown <= 0) {
        if (this.currentAmmo > 0) {
          // Calculate shot direction with realistic spread for medium difficulty
          const spreadMult = this.difficulty === 'hard' ? 0.5 : this.difficulty === 'easy' ? 1.8 : 1.0;
          const jitterX = (Math.random() - 0.5) * weapon.spread * spreadMult;
          const jitterY = (Math.random() - 0.5) * weapon.spread * spreadMult;
          const jitterZ = (Math.random() - 0.5) * weapon.spread * spreadMult;

          const totalDist = Math.hypot(dx, dy, dz);
          const dir: Vector3D = {
            x: (dx / totalDist) + jitterX,
            y: (dy / totalDist) + jitterY,
            z: (dz / totalDist) + jitterZ
          };
          const len = Math.hypot(dir.x, dir.y, dir.z);
          dir.x /= len;
          dir.y /= len;
          dir.z /= len;

          const origin: Vector3D = {
            x: this.data.pos.x,
            y: this.data.pos.y + 1.2,
            z: this.data.pos.z
          };

          onShoot(this.data, origin, dir);
          this.currentAmmo--;
          this.shootCooldown = 60 / weapon.fireRate;
          this.data.isShooting = true;
        } else {
          // Magazine empty: initiate reload
          this.reloadCooldown = weapon.reloadTime;
          this.data.isShooting = false;
        }
      } else {
        this.data.isShooting = false;
      }

    } else {
      // PATROL STATE: Move between waypoints
      this.data.isShooting = false;
      if (this.waypoints.length > 0) {
        const wp = this.waypoints[this.currentWaypointIdx];
        const dx = wp.x - this.data.pos.x;
        const dz = wp.z - this.data.pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.0) {
          this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
        } else {
          const targetAngle = Math.atan2(dx, dz);
          let diff = targetAngle - this.data.rotY;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          this.data.rotY += diff * Math.min(1, delta * 4);

          const speed = 3.6;
          this.move(Math.sin(this.data.rotY) * speed * delta, Math.cos(this.data.rotY) * speed * delta);
        }
      }
    }
  }

  private move(dx: number, dz: number) {
    const nextX = this.data.pos.x + dx;
    const nextZ = this.data.pos.z + dz;

    let canMoveX = true;
    let canMoveZ = true;
    const r = 0.5;

    for (const box of this.collisionBoxes) {
      if (
        nextX + r > box.min.x && nextX - r < box.max.x &&
        this.data.pos.z + r > box.min.z && this.data.pos.z - r < box.max.z &&
        this.data.pos.y + 1.8 > box.min.y && this.data.pos.y < box.max.y
      ) {
        canMoveX = false;
      }
      if (
        this.data.pos.x + r > box.min.x && this.data.pos.x - r < box.max.x &&
        nextZ + r > box.min.z && nextZ - r < box.max.z &&
        this.data.pos.y + 1.8 > box.min.y && this.data.pos.y < box.max.y
      ) {
        canMoveZ = false;
      }
    }

    if (canMoveX) this.data.pos.x = nextX;
    if (canMoveZ) this.data.pos.z = nextZ;
  }

  public hasLineOfSight(targetPos: Vector3D): boolean {
    const origin = { x: this.data.pos.x, y: this.data.pos.y + 1.2, z: this.data.pos.z };
    const target = { x: targetPos.x, y: targetPos.y + 0.8, z: targetPos.z };

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dz = target.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist <= 0.2) return true;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const dirZ = dz / dist;

    // Ray-AABB intersection test for each collision box
    for (const box of this.collisionBoxes) {
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

      // If we got here, ray intersects this obstacle between origin and target!
      return false;
    }

    return true;
  }

  private findTarget(allPlayers: Record<string, PlayerNetworkState>) {
    let bestTargetId: string | null = null;
    let closestDist = 42; // Vision range

    // Check existing target first
    if (this.targetPlayerId && allPlayers[this.targetPlayerId] && !allPlayers[this.targetPlayerId].isDead) {
      const p = allPlayers[this.targetPlayerId];
      const dx = p.pos.x - this.data.pos.x;
      const dz = p.pos.z - this.data.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < closestDist && this.hasLineOfSight(p.pos)) {
        bestTargetId = this.targetPlayerId;
        closestDist = dist;
      }
    }

    // Scan for all other enemy players/bots
    if (!bestTargetId) {
      for (const p of Object.values(allPlayers)) {
        if (p.id === this.data.id || p.team === this.data.team || p.isDead) continue;
        const dx = p.pos.x - this.data.pos.x;
        const dz = p.pos.z - this.data.pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < closestDist) {
          if (this.hasLineOfSight(p.pos)) {
            closestDist = dist;
            bestTargetId = p.id;
          }
        }
      }
    }

    if (bestTargetId && bestTargetId !== this.targetPlayerId) {
      this.targetPlayerId = bestTargetId;
      this.targetLostTimer = 3.0;
      this.reactionTimer = this.difficulty === 'hard' ? 0.15 : this.difficulty === 'easy' ? 0.45 : 0.28;
    }
  }
}
