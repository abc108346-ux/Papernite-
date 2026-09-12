export interface PlayerInputState {
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  sprint: boolean;
  shoot: boolean;
  aim: boolean;
  reload: boolean;
  yawDelta: number;
  pitchDelta: number;
  weaponSlotRequested?: number;
}

export class InputManager {
  private domElement: HTMLElement;
  private isPointerLocked = false;
  private isMobileDevice = false;

  public mouseSensitivity = 0.0022;
  public touchSensitivity = 0.0035;

  private keys: Record<string, boolean> = {};
  private pendingYaw = 0;
  private pendingPitch = 0;
  private isMouseDown = false;
  private isRightMouseDown = false;
  private isAimToggle = false;
  private isSprintToggle = false;

  // Touch state
  public touchJoystick = { active: false, x: 0, y: 0 }; // -1 to 1
  public touchLookActive = false;
  public touchShoot = false;
  public touchAim = false;
  public touchJump = false;
  public touchReload = false;
  public touchSprint = false;

  private onPointerLockChangeCallback?: (isLocked: boolean) => void;
  private onWeaponSwitchCallback?: (slot: number) => void;
  private onPauseCallback?: () => void;
  private onScoreboardCallback?: (show: boolean) => void;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.isMobileDevice = this.detectMobile();

    this.setupKeyboard();
    this.setupMouse();
  }

  public detectMobile(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
    );
  }

  public isMobile(): boolean {
    return this.isMobileDevice;
  }

  public setCallbacks(callbacks: {
    onPointerLockChange?: (isLocked: boolean) => void;
    onWeaponSwitch?: (slot: number) => void;
    onPause?: () => void;
    onScoreboard?: (show: boolean) => void;
  }) {
    this.onPointerLockChangeCallback = callbacks.onPointerLockChange;
    this.onWeaponSwitchCallback = callbacks.onWeaponSwitch;
    this.onPauseCallback = callbacks.onPause;
    this.onScoreboardCallback = callbacks.onScoreboard;
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.touchReload = true;
      }
      if (e.code === 'KeyQ') {
        // Quick switch
        this.onWeaponSwitchCallback?.(-1);
      }
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const slot = parseInt(e.code.replace('Digit', ''), 10) - 1;
        this.onWeaponSwitchCallback?.(slot);
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        this.onScoreboardCallback?.(true);
      }
      if (e.code === 'Escape') {
        this.onPauseCallback?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Tab') {
        this.onScoreboardCallback?.(false);
      }
    });
  }

  private setupMouse() {
    this.domElement.addEventListener('click', () => {
      if (!this.isMobileDevice && !this.isPointerLocked) {
        this.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
      this.onPointerLockChangeCallback?.(this.isPointerLocked);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.pendingYaw -= e.movementX * this.mouseSensitivity;
        this.pendingPitch -= e.movementY * this.mouseSensitivity;
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.isAimToggle = !this.isAimToggle;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;
      if (e.deltaY > 0) {
        this.onWeaponSwitchCallback?.(99); // next
      } else if (e.deltaY < 0) {
        this.onWeaponSwitchCallback?.(-99); // prev
      }
    });
  }

  public requestPointerLock() {
    try {
      this.domElement.requestPointerLock();
    } catch {
      // ignore
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // ignore
    }
  }

  public addTouchLookDelta(dx: number, dy: number) {
    this.pendingYaw -= dx * this.touchSensitivity;
    this.pendingPitch -= dy * this.touchSensitivity;
  }

  public getInput(): PlayerInputState {
    // Combine keyboard + mobile joystick
    let forward = !!this.keys['KeyW'] || !!this.keys['ArrowUp'];
    let backward = !!this.keys['KeyS'] || !!this.keys['ArrowDown'];
    let left = !!this.keys['KeyA'] || !!this.keys['ArrowLeft'];
    let right = !!this.keys['KeyD'] || !!this.keys['ArrowRight'];

    if (this.touchJoystick.active) {
      if (this.touchJoystick.y < -0.2) forward = true;
      if (this.touchJoystick.y > 0.2) backward = true;
      if (this.touchJoystick.x < -0.2) left = true;
      if (this.touchJoystick.x > 0.2) right = true;
    }

    const jump = !!this.keys['Space'] || this.touchJump;
    const sprint = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'] || this.touchSprint || this.isSprintToggle;
    const shoot = this.isMouseDown || this.touchShoot;
    const aim = this.isRightMouseDown || this.isAimToggle || this.touchAim;
    const reload = this.touchReload;

    // Reset single triggers
    this.touchJump = false;
    this.touchReload = false;

    const yaw = this.pendingYaw;
    const pitch = this.pendingPitch;
    this.pendingYaw = 0;
    this.pendingPitch = 0;

    return {
      moveForward: forward,
      moveBackward: backward,
      moveLeft: left,
      moveRight: right,
      jump,
      sprint,
      shoot,
      aim,
      reload,
      yawDelta: yaw,
      pitchDelta: pitch
    };
  }
}
