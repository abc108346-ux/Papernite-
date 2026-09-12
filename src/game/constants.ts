import { WeaponDef, SkinDef, MapId, MapSelectionId, GraphicsSettings } from '../types/game';

export const DEFAULT_SETTINGS: GraphicsSettings = {
  preset: 'medium',
  shadows: true,
  renderScale: 1.0,
  renderDistance: 120,
  fov: 75,
  mouseSensitivity: 0.0022,
  touchSensitivity: 0.0035,
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5
};

export const WEAPONS: Record<string, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: 'Pistola de Papel',
    category: 'Pistol',
    damage: 24,
    fireRate: 350,
    ammoCapacity: 12,
    reloadTime: 1.2,
    spread: 0.02,
    range: 45,
    projectileSpeed: 55,
    pellets: 1,
    zoomFov: 60,
    description: 'Leve, rápida e confiável. Feita com folha A4 dobrada em origami com culatra móvel.',
    paperColor: '#f1f5f9',
    accentColor: '#38bdf8'
  },
  smg: {
    id: 'smg',
    name: 'SMG de Papel',
    category: 'SMG',
    damage: 17,
    fireRate: 680,
    ammoCapacity: 30,
    reloadTime: 1.6,
    spread: 0.045,
    range: 35,
    projectileSpeed: 58,
    pellets: 1,
    zoomFov: 58,
    description: 'Alta cadência com pente cilíndrico de rolo de papel higiênico. Lança rajadas de papel velozes.',
    paperColor: '#fed7aa',
    accentColor: '#ea580c'
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle de Papel',
    category: 'Rifle',
    damage: 32,
    fireRate: 460,
    ammoCapacity: 25,
    reloadTime: 2.0,
    spread: 0.022,
    range: 70,
    projectileSpeed: 70,
    pellets: 1,
    zoomFov: 52,
    description: 'Arma equilibrada em cartolina reforçada. Excelente precisão e impacto a média e longa distância.',
    paperColor: '#bbf7d0',
    accentColor: '#16a34a'
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun de Papel',
    category: 'Shotgun',
    damage: 16, // 16 * 5 = 80 per blast!
    fireRate: 75,
    ammoCapacity: 6,
    reloadTime: 2.4,
    spread: 0.09,
    range: 22,
    projectileSpeed: 45,
    pellets: 5,
    zoomFov: 65,
    description: 'Dispara 5 bolinhas de papel amassado simultâneas. Devastadora no combate corpo a corpo!',
    paperColor: '#fecdd3',
    accentColor: '#e11d48'
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper de Papel',
    category: 'Sniper',
    damage: 95,
    fireRate: 45,
    ammoCapacity: 4,
    reloadTime: 2.8,
    spread: 0.005,
    range: 120,
    projectileSpeed: 95,
    pellets: 1,
    zoomFov: 26,
    description: 'Mira telescópica feita com rolo de papel craft e cano longo dobrado. Elimina alvos à distância!',
    paperColor: '#e9d5ff',
    accentColor: '#9333ea'
  }
};

export const SKINS: Record<string, SkinDef> = {
  explorer: {
    id: 'explorer',
    name: 'Explorador de Papel',
    role: 'Aventureiro',
    description: 'Munido de chapéu safari de dobradura e binóculo de papelão, pronto para qualquer mapa.',
    primaryColor: '#e0c08b',
    secondaryColor: '#4f772d',
    headwear: 'explorer_hat',
    specialFold: 'Chapéu Safari Pith'
  },
  ninja: {
    id: 'ninja',
    name: 'Ninja de Papel',
    role: 'Guerreiro das Sombras',
    description: 'Dobrado em origami negro e faixa escarlate, silencioso como uma folha ao vento.',
    primaryColor: '#334155',
    secondaryColor: '#ef4444',
    headwear: 'ninja_headband',
    specialFold: 'Faixa Origami e Máscara'
  },
  robot: {
    id: 'robot',
    name: 'Robô de Papel',
    role: 'Androide de Caixa',
    description: 'Construído com caixas de encomendas recicladas, com antena de palito e visores de papel metalizado.',
    primaryColor: '#94a3b8',
    secondaryColor: '#0ea5e9',
    headwear: 'robot_antenna',
    specialFold: 'Antena de Papelão e Medidor'
  },
  astronaut: {
    id: 'astronaut',
    name: 'Astronauta de Papel',
    role: 'Cosmonauta',
    description: 'Traje estelar feito em celulose ultrarresistente e capacete em dobradura esférica geométrica.',
    primaryColor: '#f8fafc',
    secondaryColor: '#f59e0b',
    headwear: 'astronaut_helmet',
    specialFold: 'Visor Solar de Origami'
  },
  pirate: {
    id: 'pirate',
    name: 'Pirata de Papel',
    role: 'Capitão dos Mares',
    description: 'Tapa-olho de papel vegetal e clássico chapéu bicorne dobrado com camisa listrada.',
    primaryColor: '#b91c1c',
    secondaryColor: '#1e293b',
    headwear: 'pirate_hat',
    specialFold: 'Chapéu Bicorne e Tapa-Olho'
  },
  agent: {
    id: 'agent',
    name: 'Agente Cartolina',
    role: 'Espião Secreto',
    description: 'Terno impecável com dobras vincadas a ferro, gravata preta e óculos escuros de acetato de papel.',
    primaryColor: '#18181b',
    secondaryColor: '#3b82f6',
    headwear: 'agent_hair',
    specialFold: 'Terno Origami Slim'
  }
};

export interface MapInfo {
  id: MapId;
  name: string;
  subtitle: string;
  theme: string;
  description: string;
  ambientColor: string;
  skyColor: string;
  groundColor: string;
  accentColor: string;
  gridSize: number;
}

export const MAPS: Record<MapId, MapInfo> = {
  paper_city: {
    id: 'paper_city',
    name: 'Paper City',
    subtitle: 'Metrópole de Cartolina',
    theme: 'Urbano Cartoon',
    description: 'Ruas com faixas desenhadas, casinhas de papel colorido, carros de caixinha e esquinas táticas.',
    ambientColor: '#fef08a',
    skyColor: '#bae6fd',
    groundColor: '#cbd5e1',
    accentColor: '#3b82f6',
    gridSize: 70
  },
  paper_factory: {
    id: 'paper_factory',
    name: 'Paper Factory',
    subtitle: 'Fábrica Abandonada',
    theme: 'Industrial Craft',
    description: 'Rolos gigantes de papel, esteiras rolantes, plataformas elevadas e rotas internas com cobertura.',
    ambientColor: '#fed7aa',
    skyColor: '#cbd5e1',
    groundColor: '#78716c',
    accentColor: '#f97316',
    gridSize: 80
  },
  paper_island: {
    id: 'paper_island',
    name: 'Paper Island',
    subtitle: 'Ilha Tropical Origami',
    theme: 'Praia & Aventura',
    description: 'Coqueiros de cartolina verde, praia de papel craft, pontes de madeira dobrada e mar azul origami.',
    ambientColor: '#fef9c3',
    skyColor: '#7dd3fc',
    groundColor: '#fde68a',
    accentColor: '#10b981',
    gridSize: 85
  }
};

export interface MapOptionInfo {
  id: MapSelectionId;
  name: string;
  subtitle: string;
  theme: string;
  shortDescription: string;
  description: string;
  tacticalTip: string;
  ambientColor: string;
  accentColor: string;
  badge: string;
}

export const MAP_OPTIONS: Record<MapSelectionId, MapOptionInfo> = {
  paper_city: {
    id: 'paper_city',
    name: 'Paper City',
    subtitle: 'Metrópole de Cartolina',
    theme: 'Urbano Cartoon',
    shortDescription: 'Ruas com faixas desenhadas, casinhas de papel colorido, carros de caixinha e esquinas táticas.',
    description: 'Bairro residencial feito de cartolina colorida dobrada. Oferece combate equilibrado com esquinas de caixas de papelão e telhados para franco-atiradores.',
    tacticalTip: 'Use as esquinas das casas dobradas para emboscadas de curta e média distância.',
    ambientColor: '#fef08a',
    accentColor: '#3b82f6',
    badge: 'Popular'
  },
  paper_factory: {
    id: 'paper_factory',
    name: 'Paper Factory',
    subtitle: 'Fábrica Abandonada',
    theme: 'Industrial Craft',
    shortDescription: 'Rolos gigantes de celulose, esteiras de papelão, plataformas elevadas e corredores de alta rotação.',
    description: 'Complexo industrial feito de papel kraft e papelão ondulado. Possui esteiras transportadoras, passarelas altas e coberturas estreitas.',
    tacticalTip: 'Aproveite as passarelas superiores para dominar o campo de visão dos corredores.',
    ambientColor: '#fed7aa',
    accentColor: '#f97316',
    badge: 'Vertical'
  },
  paper_island: {
    id: 'paper_island',
    name: 'Paper Island',
    subtitle: 'Ilha Tropical Origami',
    theme: 'Praia & Aventura',
    shortDescription: 'Coqueiros de cartolina verde, praia de papel craft, pontes de madeira dobrada e mar azul origami.',
    description: 'Arquipélago tropical de papel cartão recortado. Ilhas conectadas por pontes estreitas de madeira dobrada sob um céu ensolarado.',
    tacticalTip: 'Controle as pontes centrais e aproveite a linha de visão ampla para rifles e snipers.',
    ambientColor: '#fef9c3',
    accentColor: '#10b981',
    badge: 'Campo Aberto'
  },
  random: {
    id: 'random',
    name: 'Aleatório',
    subtitle: 'Sorteio Imprevisível',
    theme: 'Seleção Automática',
    shortDescription: 'Deixe o sistema sortear aleatoriamente entre Paper City, Paper Factory e Paper Island na hora da partida.',
    description: 'Modo para jogadores versáteis que dominam qualquer arena. O servidor sorteia o mapa ideal antes do início do confronto.',
    tacticalTip: 'Esteja preparado para qualquer estilo de combate e equipe uma arma flexível como o Fuzil de Cartolina.',
    ambientColor: '#e0e7ff',
    accentColor: '#8b5cf6',
    badge: 'Surpresa'
  }
};

export const BOT_NAMES = [
  'Origami_Sniper',
  'Paper_Samurai',
  'Cardboard_Rex',
  'Papel_Machê',
  'Dobradura_Pro',
  'Folha_Veloz',
  'Recicla_Bot',
  'Celulose_Gun',
  'Guilhotina_X',
  'Mestre_Cartolina',
  'Vincador_99',
  'Origami_Shadow'
];

export const LOADING_TIPS = [
  'Dica: Tiros na cabeça de papel causam dano crítico!',
  'Dica: Use o botão direito do mouse ou o botão de mira no celular para ativar a mira precisa (ADS).',
  'Dica: Caixas de papelão e postes de papel oferecem excelente cobertura contra rajadas.',
  'Dica: A Shotgun de Papel dispara 5 bolinhas ao mesmo tempo — devastadora à queima-roupa.',
  'Dica: A Sniper de Papel elimina adversários à longa distância com zoom potente.',
  'Dica: Bots de papel se comunicam e tentam flanquear seus inimigos pela lateral.',
  'Dica: Bolinhas de papel sofrem leve curvatura de gravidade em longas distâncias!'
];
