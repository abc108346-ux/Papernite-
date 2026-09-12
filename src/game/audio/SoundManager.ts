import { AudioSettings } from '../../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMusicPlaying = false;
  private musicInterval: any = null;
  private settings: AudioSettings = {
    masterVol: 0.8,
    musicVol: 0.5,
    sfxVol: 0.9
  };

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.masterGain.gain.value = this.settings.masterVol;
        this.musicGain.gain.value = this.settings.musicVol;
        this.sfxGain.gain.value = this.settings.sfxVol;

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSettings(settings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...settings };
    if (this.masterGain) this.masterGain.gain.value = this.settings.masterVol;
    if (this.musicGain) this.musicGain.gain.value = this.settings.musicVol;
    if (this.sfxGain) this.sfxGain.gain.value = this.settings.sfxVol;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public init() {
    this.initCtx();
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.setSettings({ masterVol: master, sfxVol: sfx, musicVol: music });
  }

  public playButtonClick() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.05);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playKill() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // Create paper noise buffer for crinkle / paper impact sounds
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playShoot(weaponId: string) {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;

    const now = this.ctx.currentTime;

    if (weaponId === 'shotgun') {
      // Powerful paper pop + rustle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);

      // Paper flutter noise
      const noise = this.createNoiseBuffer(0.2);
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.6, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        src.start(now);
      }
    } else if (weaponId === 'sniper') {
      // Piercing paper whip crack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);

      // Noise whip
      const noise = this.createNoiseBuffer(0.25);
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2400;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.sfxGain);
        src.start(now);
      }
    } else if (weaponId === 'smg') {
      // Quick light papery snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (weaponId === 'rifle') {
      // Solid cardboard thwack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } else {
      // Pistol default: light paper pop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    }
  }

  public playPaperHit() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;

    // Soft crumpled paper impact rustle
    const noise = this.createNoiseBuffer(0.12);
    if (noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
    }
  }

  public playHitmarker() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playFootstep() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const noise = this.createNoiseBuffer(0.05);
    if (noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
    }
  }

  public playReload() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;

    // Paper sliding out
    const noise = this.createNoiseBuffer(0.18);
    if (noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = noise;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(now);
    }

    // Fold click snap at +0.4s
    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const clickNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, clickNow);
      osc.frequency.exponentialRampToValueAtTime(200, clickNow + 0.05);
      gain.gain.setValueAtTime(0.3, clickNow);
      gain.gain.exponentialRampToValueAtTime(0.01, clickNow + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(clickNow);
      osc.stop(clickNow + 0.05);
    }, 400);
  }

  public playJump() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playWeaponSwitch() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain || this.settings.sfxVol <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playVictory() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.35);
      }, idx * 120);
    });
  }

  public playDefeat() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;
    const chords = [440, 392, 349.23, 293.66]; // A G F D
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);
      }, idx * 150);
    });
  }

  // Cheerful Cartoon Paper Melody for Lobby
  public startLobbyMusic() {
    if (this.isMusicPlaying) return;
    this.initCtx();
    if (!this.ctx || !this.musicGain) return;
    this.isMusicPlaying = true;

    const melody = [
      329.63, 392.00, 440.00, 392.00,
      329.63, 293.66, 261.63, 293.66,
      329.63, 329.63, 329.63, 392.00,
      440.00, 523.25, 440.00, 392.00
    ];
    let noteIdx = 0;

    this.musicInterval = setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isMusicPlaying || this.settings.musicVol <= 0) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Soft paper marimba tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(melody[noteIdx], now);
      filter.type = 'lowpass';
      filter.frequency.value = 1800;

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.25);

      noteIdx = (noteIdx + 1) % melody.length;
    }, 280);
  }

  public stopLobbyMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundManager = new SoundManager();
