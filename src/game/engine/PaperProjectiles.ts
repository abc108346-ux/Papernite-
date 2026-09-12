import * as THREE from 'three';
import { PaperProjectile, Vector3D } from '../../types/game';
import { PaperWeaponsBuilder } from './PaperWeapons';

export interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class PaperProjectilesManager {
  private scene: THREE.Scene;
  private projectiles: Map<string, { data: PaperProjectile; mesh: THREE.Mesh }> = new Map();
  private particles: Particle[] = [];
  private ballGeom: THREE.BufferGeometry;
  private shredGeom: THREE.BufferGeometry;
  private confettiColors = ['#f43f5e', '#38bdf8', '#fbbf24', '#34d399', '#a855f7', '#f97316', '#f8fafc'];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Crumpled Paper Ball Geometry (faceted icosahedron)
    this.ballGeom = new THREE.IcosahedronGeometry(0.12, 1);
    // Perturb vertices slightly for authentic crumpled look
    const posAttr = this.ballGeom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = (Math.random() - 0.5) * 0.04;
      posAttr.setXYZ(i, vx + noise, vy + noise, vz + noise);
    }
    this.ballGeom.computeVertexNormals();

    // Shred / Confetti Geometry (small folded flat paper plane)
    this.shredGeom = new THREE.PlaneGeometry(0.12, 0.08);
  }

  public addProjectile(data: PaperProjectile) {
    const mat = PaperWeaponsBuilder.createPaperMaterial(data.color || '#f8fafc', 0.8);
    const mesh = new THREE.Mesh(this.ballGeom, mat);
    mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.projectiles.set(data.id, { data, mesh });
  }

  public removeProjectile(id: string) {
    const proj = this.projectiles.get(id);
    if (proj) {
      this.scene.remove(proj.mesh);
      this.projectiles.delete(id);
    }
  }

  // Spawn confetti & paper shreds puff upon impact
  public spawnPaperImpact(pos: Vector3D, count = 12) {
    for (let i = 0; i < count; i++) {
      const color = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
      const mat = PaperWeaponsBuilder.createPaperMaterial(color);
      const mesh = new THREE.Mesh(this.shredGeom, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const speed = 2 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.2) * Math.PI;

      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 1.5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      const rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );

      this.particles.push({
        mesh,
        vel,
        rotVel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5
      });
    }
  }

  public update(delta: number) {
    // Update active projectiles
    const toRemove: string[] = [];
    this.projectiles.forEach((item, id) => {
      item.data.lifeTime += delta;
      if (item.data.lifeTime >= item.data.maxLifeTime) {
        toRemove.push(id);
        return;
      }

      // Physics: velocity + slight gravity for paper ball arc
      item.data.velocity.y -= 9.8 * 0.4 * delta; // lighter gravity for paper ball
      item.data.pos.x += item.data.velocity.x * delta;
      item.data.pos.y += item.data.velocity.y * delta;
      item.data.pos.z += item.data.velocity.z * delta;

      item.mesh.position.set(item.data.pos.x, item.data.pos.y, item.data.pos.z);
      item.mesh.rotation.x += delta * 10;
      item.mesh.rotation.y += delta * 8;

      // Check ground collision
      if (item.data.pos.y <= 0.1) {
        this.spawnPaperImpact(item.data.pos, 8);
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.removeProjectile(id));

    // Update paper particles (fluttering downward)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      // Air resistance & paper flutter
      p.vel.y -= 5 * delta;
      p.vel.x *= 0.95;
      p.vel.z *= 0.95;

      p.mesh.position.addScaledVector(p.vel, delta);
      p.mesh.rotation.x += p.rotVel.x * delta;
      p.mesh.rotation.y += p.rotVel.y * delta;
      p.mesh.rotation.z += p.rotVel.z * delta;

      // Scale down near end of life
      const progress = p.life / p.maxLife;
      const scale = Math.max(0.01, 1 - progress);
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  public clearAll() {
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles.clear();
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
  }
}
