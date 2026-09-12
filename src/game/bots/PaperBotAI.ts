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
  private collisionBoxes: CollisionBox[];

  private shootCooldown = 0;
  private reloadCooldown = 0;
  private currentAmmo = 20;
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
    this.currentWaypointIdx = Math.floor(Math.random() * (waypoints.length || 1));
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
    if (this.targetLostTimer > 0) {
      this.targetLostTimer -= delta;
      if (this.targetLostTimer <= 0) {
        this.targetPlayerId = null;
      }
    }

    if (this.reloadCooldown > 0) {
      this.reloadCooldown -= delta;
      this.data.isReloading = true;
      if (this.reloadCooldown <= 0) {
        const weapon = WEAPONS[this.data.weaponId] || WEAPONS.rifle;
        this.currentAmmo = weapon.ammoCapacity;
        this.data.isReloading = false;
      }
    }

    // Periodic AI thinking (scan for enemy) based on difficulty
    if (this.thinkTimer <= 0) {
      const scanInterval = this.difficulty === 'hard' ? 0.12 : this.difficulty === 'easy' ? 0.45 : 0.22;
      this.thinkTimer = scanInterval + Math.random() * 0.1;
      this.findTarget(allPlayers);
    }

    const weapon = WEAPONS[this.data.weaponId] || WEAPONS.rifle;

    // If has target
    if (this.targetPlayerId && allPlayers[this.targetPlayerId] && !allPlayers[this.targetPlayerId].isDead) {
      const target = allPlayers[this.targetPlayerId];
      const dx = target.pos.x - this.data.pos.x;
      const dz = target.pos.z - this.data.pos.z;
      const dist = Math.hypot(dx, dz);

      // Aim at target
      const targetAngle = Math.atan2(dx, dz);
      // Smoothly rotate yaw toward target with difficulty scaling
      let diff = targetAngle - this.data.rotY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const turnRate = this.difficulty === 'hard' ? 12 : this.difficulty === 'easy' ? 4 : 8;
      this.data.rotY += diff * Math.min(1, delta * turnRate);

      const dy = target.pos.y - this.data.pos.y;
      this.data.pitch = Math.atan2(dy, dist);

      // Strafe behavior during combat
      if (this.strafeTimer <= 0) {
        this.strafeTimer = this.difficulty === 'hard' ? (0.6 + Math.random() * 0.8) : (1.0 + Math.random() * 1.5);
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
      }

      // Move toward target if far, or strafe if in range
      const baseSpeed = this.difficulty === 'hard' ? 4.8 : this.difficulty === 'easy' ? 3.6 : 4.2;
      if (dist > 18) {
        // Walk closer
        this.move(Math.sin(this.data.rotY) * baseSpeed * delta, Math.cos(this.data.rotY) * baseSpeed * delta);
      } else if (dist < 6) {
        // Back off slightly
        this.move(-Math.sin(this.data.rotY) * baseSpeed * 0.6 * delta, -Math.cos(this.data.rotY) * baseSpeed * 0.6 * delta);
      } else {
        // Strafe
        const strafeAngle = this.data.rotY + (Math.PI / 2) * this.strafeDir;
        this.move(Math.sin(strafeAngle) * baseSpeed * 0.7 * delta, Math.cos(strafeAngle) * baseSpeed * 0.7 * delta);
      }

      // Shooting logic
      if (dist < weapon.range && this.shootCooldown <= 0 && this.reloadCooldown <= 0 && this.hasLineOfSight(target.pos)) {
        if (this.currentAmmo > 0) {
          // Add human-like aim imperfection based on difficulty
          const spreadMult = this.difficulty === 'hard' ? 0.6 : this.difficulty === 'easy' ? 2.4 : 1.2;
          const jitterX = (Math.random() - 0.5) * weapon.spread * spreadMult;
          const jitterY = (Math.random() - 0.5) * weapon.spread * spreadMult;
          const jitterZ = (Math.random() - 0.5) * weapon.spread * spreadMult;

          const dir: Vector3D = {
            x: (dx / dist) + jitterX,
            y: (dy / dist) + jitterY,
            z: (dz / dist) + jitterZ
          };
          const len = Math.hypot(dir.x, dir.y, dir.z);
          dir.x /= len;
          dir.y /= len;
          dir.z /= len;

          const origin: Vector3D = {
            x: this.data.pos.x,
            y: this.data.pos.y + 1.5,
            z: this.data.pos.z
          };

          onShoot(this.data, origin, dir);
          this.currentAmmo--;
          this.shootCooldown = 60 / weapon.fireRate;
          this.data.isShooting = true;
        } else {
          // Reload
          this.reloadCooldown = weapon.reloadTime;
          this.data.isShooting = false;
        }
      } else {
        this.data.isShooting = false;
      }

    } else {
      // No target: Patrol waypoints
      this.data.isShooting = false;
      if (this.waypoints.length > 0) {
        const wp = this.waypoints[this.currentWaypointIdx];
        const dx = wp.x - this.data.pos.x;
        const dz = wp.z - this.data.pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.0) {
          // Reached waypoint, pick next
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

    // Simple AABB obstacle collision check
    let canMoveX = true;
    let canMoveZ = true;
    const r = 0.4;

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

  private hasLineOfSight(targetPos: Vector3D): boolean {
    const origin = { x: this.data.pos.x, y: this.data.pos.y + 1.2, z: this.data.pos.z };
    const target = { x: targetPos.x, y: targetPos.y + 0.8, z: targetPos.z };
    
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dz = target.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist === 0) return true;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const dirZ = dz / dist;

    for (const box of this.collisionBoxes) {
      const t1 = (box.min.x - origin.x) / (dirX || 0.00001);
      const t2 = (box.max.x - origin.x) / (dirX || 0.00001);
      const t3 = (box.min.y - origin.y) / (dirY || 0.00001);
      const t4 = (box.max.y - origin.y) / (dirY || 0.00001);
      const t5 = (box.min.z - origin.z) / (dirZ || 0.00001);
      const t6 = (box.max.z - origin.z) / (dirZ || 0.00001);

      const tMin = Math.max(
        Math.max(Math.min(t1, t2), Math.min(t3, t4)),
        Math.min(t5, t6)
      );
      const tMax = Math.min(
        Math.min(Math.max(t1, t2), Math.max(t3, t4)),
        Math.max(t5, t6)
      );

      if (tMax >= 0 && tMin <= tMax) {
        if (tMin < dist && tMin > 0.1) {
          return false;
        }
      }
    }
    return true;
  }

  private findTarget(allPlayers: Record<string, PlayerNetworkState>) {
    let closestId: string | null = null;
    let closestDist = 38; // Max vision range

    // Also check current target first to keep focus if still visible
    if (this.targetPlayerId && allPlayers[this.targetPlayerId] && !allPlayers[this.targetPlayerId].isDead) {
      const p = allPlayers[this.targetPlayerId];
      const dx = p.pos.x - this.data.pos.x;
      const dz = p.pos.z - this.data.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < closestDist && this.hasLineOfSight(p.pos)) {
        closestId = this.targetPlayerId;
        closestDist = dist;
      }
    }

    // Only scan others if current target is lost or null
    if (!closestId) {
      for (const p of Object.values(allPlayers)) {
        if (p.id === this.data.id || p.team === this.data.team || p.isDead) continue;
        const dx = p.pos.x - this.data.pos.x;
        const dz = p.pos.z - this.data.pos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < closestDist) {
          if (this.hasLineOfSight(p.pos)) {
            closestDist = dist;
            closestId = p.id;
          }
        }
      }
    }

    if (closestId) {
      this.targetPlayerId = closestId;
      this.targetLostTimer = 3.0; // remember for 3 seconds
    }
  }
}
