import * as THREE from 'three';
import { GameMatchState, GraphicsSettings, MapId, PaperProjectile, PlayerNetworkState, Team, Vector3D } from '../../types/game';
import { WEAPONS } from '../constants';
import { PaperMapsBuilder, CollisionBox } from './PaperMaps';
import { PaperFPSView } from './PaperFPSView';
import { PaperCharactersBuilder } from './PaperCharacters';
import { PaperProjectilesManager } from './PaperProjectiles';
import { InputManager } from '../controls/InputManager';
import { soundManager } from '../audio/SoundManager';

export interface IMatchNetworkBridge {
  playerId: string;
  sendPlayerUpdate: (pos: Vector3D, rotY: number, pitch: number, isShooting: boolean, isAiming: boolean, isReloading: boolean) => void;
  sendShoot: (origin: Vector3D, dir: Vector3D) => void;
  sendHit: (targetId: string, damage: number, isHeadshot: boolean, hitPos: Vector3D) => void;
  sendSwitchWeapon: (weaponId: string) => void;
}

export interface HUDData {
  health: number;
  maxHealth: number;
  currentAmmo: number;
  maxAmmo: number;
  weaponId: string;
  isAiming: boolean;
  isReloading: boolean;
  team: Team;
  scoreRed: number;
  scoreBlue: number;
  timeRemaining: number;
  showHitmarker: boolean;
  isDead: boolean;
  respawnCountdown: number;
  killFeed: any[];
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private fpsView: PaperFPSView;
  private projectilesManager: PaperProjectilesManager;
  public inputManager: InputManager;
  private networkClient: IMatchNetworkBridge;

  // Map & Environment
  private mapId: MapId;
  private collisionBoxes: CollisionBox[] = [];
  private currentMapGroup: THREE.Group | null = null;
  private dirLight: THREE.DirectionalLight | null = null;

  // Local Player Physics & Combat
  public localPlayerId: string = '';
  public localTeam: Team = 'BLUE';
  public localWeaponId: string = 'rifle';
  public localSkinId: string = 'explorer';

  public health = 100;
  public maxHealth = 100;
  public currentAmmo = 25;
  public isReloading = false;
  public isDead = false;
  public respawnCountdown = 0;

  private position = new THREE.Vector3(0, 1.6, 0);
  private velocity = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private pitch = 0;
  private isGrounded = true;

  private shootCooldown = 0;
  private footstepTimer = 0;
  private hitmarkerTimer = 0;
  private networkSendTimer = 0;

  // Remote Players (Meshes)
  private remotePlayerMeshes: Map<string, { mesh: THREE.Group; targetPos: THREE.Vector3; targetYaw: number }> = new Map();

  // Settings
  private settings: GraphicsSettings;
  private isRunning = false;
  private lastFrameTime = performance.now();
  private onHUDUpdate?: (hud: HUDData) => void;

  constructor(
    container: HTMLElement,
    mapId: MapId,
    networkClient: IMatchNetworkBridge,
    settings: GraphicsSettings,
    onHUDUpdate?: (hud: HUDData) => void
  ) {
    this.container = container;
    this.mapId = mapId;
    this.networkClient = networkClient;
    this.settings = settings;
    this.onHUDUpdate = onHUDUpdate;

    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bae6fd');
    this.scene.fog = new THREE.FogExp2('#bae6fd', 0.012);

    // 2. Camera Setup (Eye Level)
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(settings.fov || 75, aspect, 0.1, settings.renderDistance || 120);
    this.scene.add(this.camera);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: settings.preset !== 'low', powerPreference: 'high-performance' });
    this.applyGraphicsSettings(settings);
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Build Map
    this.loadMap(mapId);

    // 6. First Person Rig
    this.fpsView = new PaperFPSView(this.camera, this.localWeaponId);

    // 7. Projectiles Manager
    this.projectilesManager = new PaperProjectilesManager(this.scene);

    // 8. Input Manager
    this.inputManager = new InputManager(this.renderer.domElement);
    this.inputManager.mouseSensitivity = settings.mouseSensitivity;
    this.inputManager.touchSensitivity = settings.touchSensitivity;

    this.inputManager.setCallbacks({
      onWeaponSwitch: (slot) => this.handleWeaponSwitch(slot)
    });

    const currentWep = WEAPONS[this.localWeaponId] || WEAPONS.rifle;
    this.currentAmmo = currentWep.ammoCapacity;

    // Window Resize Observer
    window.addEventListener('resize', this.onResize);

    this.isRunning = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private applyGraphicsSettings(settings: GraphicsSettings) {
    this.settings = settings;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const scale = settings.renderScale || 1.0;
    this.renderer.setSize(width * scale, height * scale, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.setPixelRatio(settings.preset === 'low' ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

    this.renderer.shadowMap.enabled = settings.shadows;
    if (settings.shadows) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (this.camera) {
      this.camera.fov = settings.fov || 75;
      this.camera.far = settings.renderDistance || 120;
      this.camera.updateProjectionMatrix();
    }
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight('#ffffff', 0.85);
    this.scene.add(ambient);

    this.dirLight = new THREE.DirectionalLight('#fffbeb', 1.2);
    this.dirLight.position.set(30, 45, 20);
    this.dirLight.castShadow = this.settings.shadows;
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 100;
      const d = 40;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
    }
    this.scene.add(this.dirLight);
  }

  public loadMap(mapId: MapId) {
    if (this.currentMapGroup) {
      this.scene.remove(this.currentMapGroup);
    }
    this.mapId = mapId;
    const mapData = PaperMapsBuilder.buildMap(mapId);
    this.currentMapGroup = mapData.sceneGroup;
    this.collisionBoxes = mapData.collisionBoxes;
    this.scene.add(this.currentMapGroup);

    // Initial Spawn
    const spawns = this.localTeam === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
    const spawn = spawns[0] || { x: 0, y: 0.1, z: 0 };
    this.respawnAt(spawn);
  }

  public setLocalPlayerInfo(id: string, team: Team, skinId: string, weaponId: string) {
    this.localPlayerId = id;
    this.localTeam = team;
    this.localSkinId = skinId;
    this.localWeaponId = weaponId;

    this.fpsView.setWeapon(weaponId);
    const wep = WEAPONS[weaponId] || WEAPONS.rifle;
    this.currentAmmo = wep.ammoCapacity;

    const mapData = PaperMapsBuilder.buildMap(this.mapId);
    const spawns = team === 'RED' ? mapData.spawnsRed : mapData.spawnsBlue;
    const spawn = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };
    this.respawnAt(spawn);
  }

  public respawnAt(pos: Vector3D) {
    this.position.set(pos.x, 1.6, pos.z);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.isDead = false;
    this.respawnCountdown = 0;
    const wep = WEAPONS[this.localWeaponId] || WEAPONS.rifle;
    this.currentAmmo = wep.ammoCapacity;
    this.isReloading = false;
  }

  public handleWeaponSwitch(slotOrDelta: number) {
    const keys = Object.keys(WEAPONS);
    let newIdx = keys.indexOf(this.localWeaponId);

    if (slotOrDelta === 99) {
      newIdx = (newIdx + 1) % keys.length;
    } else if (slotOrDelta === -99 || slotOrDelta === -1) {
      newIdx = (newIdx - 1 + keys.length) % keys.length;
    } else if (slotOrDelta >= 0 && slotOrDelta < keys.length) {
      newIdx = slotOrDelta;
    }

    const nextWepId = keys[newIdx];
    if (nextWepId !== this.localWeaponId) {
      this.localWeaponId = nextWepId;
      this.fpsView.setWeapon(nextWepId);
      const wep = WEAPONS[nextWepId];
      this.currentAmmo = wep.ammoCapacity;
      this.isReloading = false;
      soundManager.playWeaponSwitch();
      this.networkClient.sendSwitchWeapon(nextWepId);
    }
  }

  public triggerLocalShoot() {
    if (this.isDead || this.isReloading) return;
    const weapon = WEAPONS[this.localWeaponId] || WEAPONS.rifle;

    if (this.currentAmmo <= 0) {
      this.startReload();
      return;
    }

    this.currentAmmo--;
    this.shootCooldown = 60 / weapon.fireRate;

    // Sound and FPS view recoil
    soundManager.playShoot(this.localWeaponId);
    this.fpsView.addRecoil();

    // Calculate shoot direction from camera center
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const origin: Vector3D = {
      x: this.position.x,
      y: this.position.y - 0.1,
      z: this.position.z
    };

    // Broadcast shoot to network
    this.networkClient.sendShoot(origin, { x: dir.x, y: dir.y, z: dir.z });

    // Local raycast against enemy players / bots for responsive zero-latency hit registration!
    this.checkHitRaycast(origin, dir, weapon);
  }

  private checkHitRaycast(origin: Vector3D, dir: THREE.Vector3, weapon: any) {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      dir,
      0.1,
      weapon.range
    );

    const enemyMeshes: THREE.Object3D[] = [];
    const meshToId: Map<THREE.Object3D, string> = new Map();

    this.remotePlayerMeshes.forEach((item, id) => {
      // Find character root
      enemyMeshes.push(item.mesh);
      meshToId.set(item.mesh, id);
    });

    const intersects = raycaster.intersectObjects(enemyMeshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      // Walk up to find root group
      let curr: THREE.Object3D | null = hit.object;
      let targetId: string | null = null;
      while (curr) {
        if (meshToId.has(curr)) {
          targetId = meshToId.get(curr)!;
          break;
        }
        curr = curr.parent;
      }

      if (targetId) {
        // Headshot detection
        const isHeadshot = hit.point.y > (hit.object.position.y + 1.4);
        const damage = isHeadshot ? Math.round(weapon.damage * 1.5) : weapon.damage;

        this.hitmarkerTimer = 0.2;
        soundManager.playHitmarker();
        soundManager.playPaperHit();

        this.projectilesManager.spawnPaperImpact({
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z
        }, 12);

        this.networkClient.sendHit(targetId, damage, isHeadshot, {
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z
        });
      }
    }
  }

  public startReload() {
    if (this.isReloading || this.isDead) return;
    const weapon = WEAPONS[this.localWeaponId] || WEAPONS.rifle;
    if (this.currentAmmo >= weapon.ammoCapacity) return;

    this.isReloading = true;
    soundManager.playReload();
    this.fpsView.playReloadAnim();

    setTimeout(() => {
      this.currentAmmo = weapon.ammoCapacity;
      this.isReloading = false;
    }, weapon.reloadTime * 1000);
  }

  // Network sync: spawn remote paper projectile
  public onProjectileSpawned(data: PaperProjectile) {
    this.projectilesManager.addProjectile(data);
    soundManager.playPaperHit();
  }

  // Network sync: update remote players & bots
  public updateRemotePlayers(players: Record<string, PlayerNetworkState>) {
    const activeIds = new Set<string>();

    for (const p of Object.values(players)) {
      if (p.id === this.localPlayerId) {
        // Sync my own health if damaged
        this.health = p.health;
        this.isDead = p.isDead;
        this.respawnCountdown = p.respawnTimer;
        continue;
      }

      activeIds.add(p.id);

      let item = this.remotePlayerMeshes.get(p.id);
      if (!item) {
        // Create 3D paper character for remote player/bot
        const mesh = PaperCharactersBuilder.buildCharacterModel(p.skinId || 'explorer', p.team, p.weaponId || 'rifle');
        mesh.position.set(p.pos.x, p.pos.y, p.pos.z);
        this.scene.add(mesh);
        item = {
          mesh,
          targetPos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
          targetYaw: p.rotY
        };
        this.remotePlayerMeshes.set(p.id, item);
      }

      item.targetPos.set(p.pos.x, p.pos.y, p.pos.z);
      item.targetYaw = p.rotY;

      // Animate walking / idle / death
      const speed = item.mesh.position.distanceTo(item.targetPos);
      PaperCharactersBuilder.updateAnimation(item.mesh, speed > 0.1, speed, 0.05, p.isDead);
    }

    // Remove disconnected players
    for (const [id, item] of this.remotePlayerMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(item.mesh);
        this.remotePlayerMeshes.delete(id);
      }
    }
  }

  private animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min(0.08, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    // 1. Process Local Player Input & Physics
    if (!this.isDead) {
      this.updateLocalPlayer(delta);
    } else {
      // Death camera slowly looking at defeat ground
      this.camera.position.set(this.position.x, 0.5, this.position.z);
    }

    // 2. Update First Person View (Sway, ADS, Bob)
    const isMoving = this.velocity.lengthSq() > 0.5;
    const isRunning = this.velocity.lengthSq() > 30;
    this.fpsView.update(delta, isMoving, isRunning);

    // 3. Update Projectiles & Confetti
    this.projectilesManager.update(delta);

    // 4. Smooth Remote Players Interpolation
    this.remotePlayerMeshes.forEach(item => {
      item.mesh.position.lerp(item.targetPos, delta * 12);
      // Smooth yaw
      let diff = item.targetYaw - item.mesh.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      item.mesh.rotation.y += diff * Math.min(1, delta * 12);
    });

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);

    // 6. Hitmarker decay
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
    }

    // 7. Update HUD
    const wep = WEAPONS[this.localWeaponId] || WEAPONS.rifle;
    this.onHUDUpdate?.({
      health: this.health,
      maxHealth: this.maxHealth,
      currentAmmo: this.currentAmmo,
      maxAmmo: wep.ammoCapacity,
      weaponId: this.localWeaponId,
      isAiming: this.fpsView['isAiming'],
      isReloading: this.isReloading,
      team: this.localTeam,
      scoreRed: 0,
      scoreBlue: 0,
      timeRemaining: 0,
      showHitmarker: this.hitmarkerTimer > 0,
      isDead: this.isDead,
      respawnCountdown: Math.ceil(this.respawnCountdown),
      killFeed: []
    });
  }

  private updateLocalPlayer(delta: number) {
    const input = this.inputManager.getInput();

    // Mouse / Touch Look
    this.yaw += input.yawDelta;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.pitchDelta, -Math.PI / 2.2, Math.PI / 2.2);

    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Mouse Sway on FPS view
    if (input.yawDelta !== 0 || input.pitchDelta !== 0) {
      this.fpsView.addMouseSway(input.yawDelta * 1000, input.pitchDelta * 1000);
    }

    // ADS
    this.fpsView.setAiming(input.aim);

    // Shoot
    this.shootCooldown -= delta;
    if (input.shoot && this.shootCooldown <= 0) {
      this.triggerLocalShoot();
    }

    // Reload
    if (input.reload) {
      this.startReload();
    }

    // Movement Direction
    const moveDir = new THREE.Vector3();
    if (input.moveForward) moveDir.z -= 1;
    if (input.moveBackward) moveDir.z += 1;
    if (input.moveLeft) moveDir.x -= 1;
    if (input.moveRight) moveDir.x += 1;
    moveDir.normalize();

    // Transform by camera yaw
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const speed = input.sprint ? 9.0 : 6.0;
    const targetVelX = moveDir.x * speed;
    const targetVelZ = moveDir.z * speed;

    this.velocity.x += (targetVelX - this.velocity.x) * (delta * 12);
    this.velocity.z += (targetVelZ - this.velocity.z) * (delta * 12);

    // Jump & Gravity
    if (input.jump && this.isGrounded) {
      this.velocity.y = 7.0;
      this.isGrounded = false;
      soundManager.playJump();
    }

    this.velocity.y -= 22 * delta; // gravity

    // Apply Velocity with AABB Collision
    const nextX = this.position.x + this.velocity.x * delta;
    const nextY = this.position.y + this.velocity.y * delta;
    const nextZ = this.position.z + this.velocity.z * delta;

    // Obstacle collisions
    let canX = true;
    let canZ = true;
    const r = 0.45;

    for (const box of this.collisionBoxes) {
      if (
        nextX + r > box.min.x && nextX - r < box.max.x &&
        this.position.z + r > box.min.z && this.position.z - r < box.max.z &&
        this.position.y > box.min.y && this.position.y - 1.6 < box.max.y
      ) {
        canX = false;
      }
      if (
        this.position.x + r > box.min.x && this.position.x - r < box.max.x &&
        nextZ + r > box.min.z && nextZ - r < box.max.z &&
        this.position.y > box.min.y && this.position.y - 1.6 < box.max.y
      ) {
        canZ = false;
      }
    }

    if (canX) this.position.x = nextX;
    if (canZ) this.position.z = nextZ;

    // Ground check
    if (nextY <= 1.6) {
      this.position.y = 1.6;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
      this.isGrounded = false;
    }

    // Update Camera Position
    this.camera.position.copy(this.position);

    // Footsteps
    if (this.isGrounded && (Math.abs(this.velocity.x) > 0.5 || Math.abs(this.velocity.z) > 0.5)) {
      this.footstepTimer += delta * (input.sprint ? 14 : 9);
      if (this.footstepTimer > 3.0) {
        soundManager.playFootstep();
        this.footstepTimer = 0;
      }
    }

    // Send transform to network (20 times per sec)
    this.networkSendTimer += delta;
    if (this.networkSendTimer >= 0.05) {
      this.networkSendTimer = 0;
      this.networkClient.sendPlayerUpdate(
        { x: this.position.x, y: this.position.y - 1.6, z: this.position.z },
        this.yaw,
        this.pitch,
        input.shoot,
        input.aim,
        this.isReloading
      );
    }
  }

  private onResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();

    const scale = this.settings.renderScale || 1.0;
    this.renderer.setSize(width * scale, height * scale, false);
  };

  public destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onResize);
    this.projectilesManager.clearAll();
    this.fpsView.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
