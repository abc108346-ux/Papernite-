import * as THREE from 'three';
import { PaperWeaponsBuilder } from './PaperWeapons';
import { WEAPONS } from '../constants';

export class PaperFPSView {
  public camera: THREE.PerspectiveCamera;
  public weaponRig: THREE.Group;
  public weaponMesh: THREE.Group;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;

  // Animation states
  private currentWeaponId = 'rifle';
  private defaultPos = new THREE.Vector3(0.18, -0.18, -0.42);
  private adsPos = new THREE.Vector3(0, -0.13, -0.32);
  private currentPos = new THREE.Vector3(0.18, -0.18, -0.42);
  private targetPos = new THREE.Vector3(0.18, -0.18, -0.42);

  private defaultFov = 75;
  private currentFov = 75;
  private targetFov = 75;

  private isAiming = false;
  private recoilOffset = new THREE.Vector3();
  private recoilRot = new THREE.Euler();
  private walkTime = 0;
  private sway = new THREE.Vector2();

  // Muzzle puff paper star
  private muzzlePuff: THREE.Mesh;
  private puffTimer = 0;

  constructor(camera: THREE.PerspectiveCamera, initialWeaponId = 'rifle') {
    this.camera = camera;
    this.currentWeaponId = initialWeaponId;

    const { rig, weaponMesh, leftArm, rightArm } = PaperWeaponsBuilder.buildFirstPersonRig(initialWeaponId);
    this.weaponRig = rig;
    this.weaponMesh = weaponMesh;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    this.weaponRig.position.copy(this.defaultPos);
    this.camera.add(this.weaponRig);

    // Muzzle flash / paper puff
    const puffGeom = new THREE.DodecahedronGeometry(0.08, 0);
    const puffMat = PaperWeaponsBuilder.createPaperMaterial('#fef08a', 0.5);
    this.muzzlePuff = new THREE.Mesh(puffGeom, puffMat);
    this.muzzlePuff.visible = false;
    this.weaponMesh.add(this.muzzlePuff);
  }

  public setWeapon(weaponId: string) {
    if (this.currentWeaponId === weaponId) return;
    this.currentWeaponId = weaponId;

    this.camera.remove(this.weaponRig);

    const { rig, weaponMesh, leftArm, rightArm } = PaperWeaponsBuilder.buildFirstPersonRig(weaponId);
    this.weaponRig = rig;
    this.weaponMesh = weaponMesh;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    this.muzzlePuff = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08, 0),
      PaperWeaponsBuilder.createPaperMaterial('#fef08a', 0.5)
    );
    this.muzzlePuff.visible = false;
    this.weaponMesh.add(this.muzzlePuff);

    this.weaponRig.position.copy(this.defaultPos);
    this.camera.add(this.weaponRig);

    // Weapon switch quick drop & raise animation
    this.recoilOffset.y = -0.15;
  }

  public setAiming(aiming: boolean) {
    this.isAiming = aiming;
    const weapon = WEAPONS[this.currentWeaponId] || WEAPONS.rifle;
    if (aiming) {
      this.targetPos.copy(this.adsPos);
      this.targetFov = weapon.zoomFov;
    } else {
      this.targetPos.copy(this.defaultPos);
      this.targetFov = this.defaultFov;
    }
  }

  public addRecoil() {
    const weapon = WEAPONS[this.currentWeaponId] || WEAPONS.rifle;
    const kick = weapon.id === 'shotgun' ? 0.08 : weapon.id === 'sniper' ? 0.12 : 0.04;
    this.recoilOffset.z += kick;
    this.recoilOffset.y += kick * 0.4;
    this.recoilRot.x += kick * 3.5;

    // Show muzzle paper puff
    this.muzzlePuff.visible = true;
    this.muzzlePuff.scale.set(1 + Math.random(), 1 + Math.random(), 1 + Math.random());
    this.muzzlePuff.position.set(0, 0.04, -0.4);
    this.puffTimer = 0.06;
  }

  public addMouseSway(deltaX: number, deltaY: number) {
    // Weapon lags slightly behind mouse
    this.sway.x -= deltaX * 0.0003;
    this.sway.y += deltaY * 0.0003;
    this.sway.x = THREE.MathUtils.clamp(this.sway.x, -0.04, 0.04);
    this.sway.y = THREE.MathUtils.clamp(this.sway.y, -0.04, 0.04);
  }

  public playReloadAnim() {
    this.recoilOffset.y = -0.22;
    this.recoilRot.z = 0.3;
    this.recoilRot.x = -0.2;
  }

  public update(delta: number, isMoving: boolean, isRunning: boolean) {
    // Smooth FOV interpolation (ADS zoom)
    this.currentFov += (this.targetFov - this.currentFov) * (delta * 12);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();

    // Smooth position interpolation
    this.currentPos.lerp(this.targetPos, delta * 14);

    // Idle & Walk bobbing
    let bobX = 0;
    let bobY = 0;
    if (isMoving) {
      const freq = isRunning ? 16 : 10;
      const amp = this.isAiming ? 0.004 : (isRunning ? 0.035 : 0.018);
      this.walkTime += delta * freq;
      bobX = Math.sin(this.walkTime * 0.5) * amp;
      bobY = Math.abs(Math.cos(this.walkTime)) * amp * 0.8;
    } else {
      // Gentle breathing idle
      this.walkTime += delta * 2;
      bobY = Math.sin(this.walkTime) * 0.003;
    }

    // Sway recovery
    this.sway.x *= 0.85;
    this.sway.y *= 0.85;

    // Recoil recovery
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 12);
    this.recoilRot.x *= 0.82;
    this.recoilRot.y *= 0.82;
    this.recoilRot.z *= 0.82;

    // Apply combined transformation to weapon rig
    this.weaponRig.position.set(
      this.currentPos.x + bobX + this.sway.x + this.recoilOffset.x,
      this.currentPos.y - bobY + this.sway.y + this.recoilOffset.y,
      this.currentPos.z + this.recoilOffset.z
    );

    this.weaponRig.rotation.set(
      this.recoilRot.x - this.sway.y * 2,
      this.recoilRot.y - this.sway.x * 2,
      this.recoilRot.z + bobX * 0.5
    );

    // Muzzle puff timer
    if (this.puffTimer > 0) {
      this.puffTimer -= delta;
      if (this.puffTimer <= 0) {
        this.muzzlePuff.visible = false;
      }
    }
  }

  public dispose() {
    this.camera.remove(this.weaponRig);
  }
}
