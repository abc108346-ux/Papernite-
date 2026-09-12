export type Team = 'RED' | 'BLUE';

export type MapId = 'paper_city' | 'paper_factory' | 'paper_island';
export type MapSelectionId = MapId | 'random';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface MatchmakingQueueState {
  playersCount: number;
  maxPlayers: number;
  status: 'searching' | 'match_found' | 'countdown';
  countdown: number;
  estimatedSeconds: number;
  mapId?: MapId;
}

export interface WeaponDef {
  id: string;
  name: string;
  category: 'Pistol' | 'SMG' | 'Rifle' | 'Shotgun' | 'Sniper';
  damage: number;
  fireRate: number; // shots per minute
  ammoCapacity: number;
  reloadTime: number; // seconds
  spread: number;
  range: number;
  projectileSpeed: number;
  pellets: number; // 1 for single, 5 for shotgun
  zoomFov: number; // 50 for regular, 25 for sniper
  description: string;
  paperColor: string;
  accentColor: string;
}

export interface SkinDef {
  id: string;
  name: string;
  role: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  headwear: 'explorer_hat' | 'ninja_headband' | 'robot_antenna' | 'astronaut_helmet' | 'pirate_hat' | 'agent_hair';
  specialFold: string;
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  wins: number;
  matchesPlayed: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  skinId: string;
  weaponId: string;
  stats: PlayerStats;
  friends: string[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PlayerNetworkState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  skinId: string;
  weaponId: string;
  health: number;
  maxHealth: number;
  kills: number;
  deaths: number;
  ping: number;
  pos: Vector3D;
  rotY: number;
  pitch: number;
  isShooting: boolean;
  isAiming: boolean;
  isReloading: boolean;
  isDead: boolean;
  respawnTimer: number;
}

export interface PaperProjectile {
  id: string;
  shooterId: string;
  shooterTeam: Team;
  weaponId: string;
  pos: Vector3D;
  velocity: Vector3D;
  damage: number;
  radius: number;
  lifeTime: number;
  maxLifeTime: number;
  color: string;
}

export interface KillFeedItem {
  id: string;
  killerId?: string;
  killerName: string;
  killerTeam: Team;
  victimId?: string;
  victimName: string;
  victimTeam: Team;
  weaponId?: string;
  weaponName: string;
  isHeadshot?: boolean;
  timestamp: number;
}

export interface GameMatchState {
  matchId: string;
  mapId: MapId;
  status: 'waiting' | 'in_progress' | 'ended';
  timeRemaining: number;
  scoreRed: number;
  scoreBlue: number;
  maxScore: number;
  players: Record<string, PlayerNetworkState>;
  killFeed: KillFeedItem[];
  winnerTeam?: Team | 'DRAW';
}

export interface GraphicsSettings {
  preset: 'low' | 'medium' | 'high';
  renderScale: number;
  shadows: boolean;
  fov: number;
  renderDistance: number;
  particlesEnabled?: boolean;
  mouseSensitivity: number;
  touchSensitivity: number;
  touchButtonScale?: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

export interface AudioSettings {
  masterVol: number;
  musicVol: number;
  sfxVol: number;
}
