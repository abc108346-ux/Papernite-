import * as THREE from 'three';
import { PaperCharactersBuilder } from './PaperCharacters';
import { PaperWeaponsBuilder } from './PaperWeapons';

export class LobbyViewer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private characterGroup: THREE.Group | null = null;
  private isRunning = true;
  private currentSkinId = 'explorer';
  private currentWeaponId = 'rifle';
  private pedestal: THREE.Mesh;
  private isDragging = false;
  private previousMouseX = 0;
  private rotY = 0;

  constructor(container: HTMLElement, initialSkinId = 'explorer', initialWeaponId = 'rifle') {
    this.container = container;
    this.currentSkinId = initialSkinId;
    this.currentWeaponId = initialWeaponId;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1e293b');

    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, width / (height || 1), 0.1, 50);
    this.camera.position.set(0, 1.4, 3.8);
    this.camera.lookAt(0, 1.1, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Soft Cartoon Studio Lights
    const ambient = new THREE.AmbientLight('#ffffff', 0.9);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.5);
    dirLight.position.set(4, 6, 4);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.6);
    rimLight.position.set(-4, 3, -3);
    this.scene.add(rimLight);

    // Origami Cardboard Pedestal
    const pedMat = PaperWeaponsBuilder.createPaperMaterial('#d4a373', 0.85);
    const pedGeom = new THREE.CylinderGeometry(1.2, 1.3, 0.25, 8);
    this.pedestal = new THREE.Mesh(pedGeom, pedMat);
    this.pedestal.position.y = -0.12;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    this.updateCharacter(initialSkinId, initialWeaponId);

    // Mouse drag to rotate character
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouseX;
        this.rotY += deltaX * 0.012;
        this.previousMouseX = e.clientX;
      }
    });

    // Touch support for mobile character rotate
    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.previousMouseX;
        this.rotY += deltaX * 0.015;
        this.previousMouseX = e.touches[0].clientX;
      }
    });

    window.addEventListener('resize', this.onResize);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  public updateCharacter(skinId: string, weaponId: string) {
    this.currentSkinId = skinId;
    this.currentWeaponId = weaponId;

    if (this.characterGroup) {
      this.scene.remove(this.characterGroup);
    }

    this.characterGroup = PaperCharactersBuilder.buildCharacterModel(skinId, 'BLUE', weaponId);
    this.characterGroup.position.y = 0.02;
    this.scene.add(this.characterGroup);
  }

  private onResize = () => {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    if (!this.isDragging) {
      // Gentle auto-rotation
      this.rotY += 0.005;
    }

    if (this.characterGroup) {
      this.characterGroup.rotation.y = this.rotY;
      // Gentle breathing bob
      const time = performance.now() * 0.002;
      this.characterGroup.position.y = 0.02 + Math.sin(time) * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
