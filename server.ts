import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GameMatchState, PlayerNetworkState, Team, MapId, Vector3D, PaperProjectile, KillFeedItem } from './src/types/game';
import { BOT_NAMES, WEAPONS, SKINS } from './src/game/constants';
import { PaperMapsBuilder } from './src/game/engine/PaperMaps';
import { PaperBotAI } from './src/game/bots/PaperBotAI';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Basic API health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'PAPERNITE', time: Date.now() });
});

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  matchId: string | null;
  lastPing: number;
}

const clients = new Map<WebSocket, ConnectedClient>();

// Matchmaking Queue
interface QueuedPlayer {
  ws: WebSocket;
  playerId: string;
  playerName: string;
  skinId: string;
  weaponId: string;
  mapPreference?: MapId;
  joinedAt: number;
}

const matchmakingQueue = new Map<WebSocket, QueuedPlayer>();
let queueCountdown: number | null = null;
let queueInterval: NodeJS.Timeout | null = null;

function broadcastQueueState() {
  const payload = JSON.stringify({
    type: 'queue_update',
    playersCount: matchmakingQueue.size,
    maxPlayers: 12,
    countdown: queueCountdown !== null ? queueCountdown : 6,
    status: queueCountdown !== null ? 'countdown' : 'searching'
  });

  for (const [ws] of matchmakingQueue.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function processMatchmakingQueue() {
  if (matchmakingQueue.size === 0) {
    if (queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }
    queueCountdown = null;
    return;
  }

  // If 12 players queued, start immediately!
  if (matchmakingQueue.size >= 12) {
    finalizeQueueMatch();
    return;
  }

  // If countdown not active, start 6-second timer to give other players time to join
  if (queueCountdown === null) {
    queueCountdown = 6;
    broadcastQueueState();

    if (queueInterval) clearInterval(queueInterval);
    queueInterval = setInterval(() => {
      if (queueCountdown !== null && queueCountdown > 0) {
        queueCountdown--;
        broadcastQueueState();

        if (queueCountdown <= 0) {
          finalizeQueueMatch();
        }
      }
    }, 1000);
  }
}

function finalizeQueueMatch() {
  if (queueInterval) {
    clearInterval(queueInterval);
    queueInterval = null;
  }
  queueCountdown = null;

  const queuedList = Array.from(matchmakingQueue.values());
  if (queuedList.length === 0) return;

  // Clear queue
  matchmakingQueue.clear();

  // Pick map
  const allMaps: MapId[] = ['paper_city', 'paper_factory', 'paper_island'];
  const preferredMap = queuedList.find(p => p.mapPreference)?.mapPreference;
  const mapId: MapId = preferredMap || allMaps[Math.floor(Math.random() * allMaps.length)];

  const matchId = `match_${Math.random().toString(36).substring(2, 8)}`;
  const room = createMatchRoom(matchId, mapId);

  // Split real players across RED and BLUE
  let currentTeam: Team = 'BLUE';
  const realPlayersCount = queuedList.length;
  const botsCount = Math.max(0, 12 - realPlayersCount);

  // If we have real players, remove existing placeholder bots so total is exactly 12
  const botKeys = Object.keys(room.state.players).filter(k => room.state.players[k].isBot);
  for (let i = 0; i < realPlayersCount && i < botKeys.length; i++) {
    const bId = botKeys[i];
    delete room.state.players[bId];
    room.bots = room.bots.filter(b => b.data.id !== bId);
  }

  queuedList.forEach((qp, idx) => {
    const client = clients.get(qp.ws);
    if (client) {
      client.matchId = matchId;
    }

    const assignedTeam: Team = idx % 2 === 0 ? 'BLUE' : 'RED';
    const spawns = assignedTeam === 'RED' ? room.spawnsRed : room.spawnsBlue;
    const spawnPos = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };

    const playerState: PlayerNetworkState = {
      id: qp.playerId,
      name: qp.playerName || 'Guerreiro de Papel',
      team: assignedTeam,
      isBot: false,
      skinId: qp.skinId || 'explorer',
      weaponId: qp.weaponId || 'rifle',
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      ping: 15,
      pos: { ...spawnPos },
      rotY: 0,
      pitch: 0,
      isShooting: false,
      isAiming: false,
      isReloading: false,
      isDead: false,
      respawnTimer: 0
    };

    room.state.players[qp.playerId] = playerState;

    // Send match found notification first
    if (qp.ws.readyState === WebSocket.OPEN) {
      qp.ws.send(JSON.stringify({
        type: 'match_found',
        matchId,
        mapId,
        realPlayersCount,
        botsCount,
        team: assignedTeam
      }));

      // Then send match joined
      setTimeout(() => {
        if (qp.ws.readyState === WebSocket.OPEN) {
          qp.ws.send(JSON.stringify({
            type: 'match_joined',
            matchId,
            playerId: qp.playerId,
            team: assignedTeam,
            mapId,
            state: room.state
          }));
        }
      }, 700);
    }
  });

  // Ensure balance of bots up to 12 total
  fillWithBots(room, 12);
}

// Active Match Rooms
interface MatchRoom {
  state: GameMatchState;
  bots: PaperBotAI[];
  spawnsRed: Vector3D[];
  spawnsBlue: Vector3D[];
  lastTick: number;
  timerInterval?: any;
}

const matches = new Map<string, MatchRoom>();

function createMatchRoom(matchId: string, mapId: MapId): MatchRoom {
  const mapData = PaperMapsBuilder.buildMap(mapId);

  const room: MatchRoom = {
    state: {
      matchId,
      mapId,
      status: 'in_progress',
      timeRemaining: 300, // 5 minutes
      scoreRed: 0,
      scoreBlue: 0,
      maxScore: 30,
      players: {},
      killFeed: []
    },
    bots: [],
    spawnsRed: mapData.spawnsRed,
    spawnsBlue: mapData.spawnsBlue,
    lastTick: Date.now()
  };

  // Populate initial 11 bots (so 1 real player + 11 bots = 12 players, or more real players replace bots)
  fillWithBots(room, 12);

  matches.set(matchId, room);
  return room;
}

function fillWithBots(room: MatchRoom, targetTotal: number) {
  const currentCount = Object.keys(room.state.players).length;
  const needed = targetTotal - currentCount;
  if (needed <= 0) return;

  const weaponKeys = Object.keys(WEAPONS);
  const skinKeys = Object.keys(SKINS);
  const mapData = PaperMapsBuilder.buildMap(room.state.mapId);

  for (let i = 0; i < needed; i++) {
    // Count teams
    let redCount = 0;
    let blueCount = 0;
    for (const p of Object.values(room.state.players)) {
      if (p.team === 'RED') redCount++;
      else blueCount++;
    }
    const team: Team = redCount <= blueCount ? 'RED' : 'BLUE';
    const spawns = team === 'RED' ? room.spawnsRed : room.spawnsBlue;
    const spawnPos = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };

    const botId = `bot_${Math.random().toString(36).substring(2, 9)}`;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const skinId = skinKeys[Math.floor(Math.random() * skinKeys.length)];
    const weaponId = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];

    const botState: PlayerNetworkState = {
      id: botId,
      name: `${botName} [BOT]`,
      team,
      isBot: true,
      skinId,
      weaponId,
      health: 100,
      maxHealth: 100,
      kills: 0,
      deaths: 0,
      ping: Math.floor(10 + Math.random() * 25),
      pos: { ...spawnPos },
      rotY: Math.random() * Math.PI * 2,
      pitch: 0,
      isShooting: false,
      isAiming: false,
      isReloading: false,
      isDead: false,
      respawnTimer: 0
    };

    room.state.players[botId] = botState;
    const botAI = new PaperBotAI(botState, mapData.waypoints, mapData.collisionBoxes);
    room.bots.push(botAI);
  }
}

// Broadcast message to all connected clients in a match
function broadcastToRoom(matchId: string, message: any) {
  const payload = JSON.stringify(message);
  for (const [ws, client] of clients.entries()) {
    if (client.matchId === matchId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Server Tick Loop (Runs 20 times per second for smooth network updates)
setInterval(() => {
  const now = Date.now();

  for (const [matchId, room] of matches.entries()) {
    if (room.state.status !== 'in_progress') continue;

    const delta = Math.min(0.1, (now - room.lastTick) / 1000);
    room.lastTick = now;

    // Decrement match timer
    room.state.timeRemaining = Math.max(0, room.state.timeRemaining - delta);
    if (room.state.timeRemaining <= 0) {
      room.state.status = 'ended';
      room.state.winnerTeam = room.state.scoreRed > room.state.scoreBlue ? 'RED' : room.state.scoreBlue > room.state.scoreRed ? 'BLUE' : 'DRAW';
      broadcastToRoom(matchId, { type: 'match_ended', winner: room.state.winnerTeam, state: room.state });
      continue;
    }

    // Update Respawn timers
    for (const player of Object.values(room.state.players)) {
      if (player.isDead) {
        player.respawnTimer -= delta;
        if (player.respawnTimer <= 0) {
          player.isDead = false;
          player.health = player.maxHealth;
          const spawns = player.team === 'RED' ? room.spawnsRed : room.spawnsBlue;
          const spawn = spawns[Math.floor(Math.random() * spawns.length)] || { x: 0, y: 0.1, z: 0 };
          player.pos = { ...spawn };
          broadcastToRoom(matchId, { type: 'player_respawned', player });
        }
      }
    }

    // Update Bots
    for (const bot of room.bots) {
      bot.update(delta, room.state.players, (shooter, origin, dir) => {
        // Bot shot a paper ball
        const weapon = WEAPONS[shooter.weaponId] || WEAPONS.rifle;
        const projectile: PaperProjectile = {
          id: `proj_${Math.random().toString(36).substring(2, 9)}`,
          shooterId: shooter.id,
          shooterTeam: shooter.team,
          weaponId: shooter.weaponId,
          pos: origin,
          velocity: {
            x: dir.x * weapon.projectileSpeed,
            y: dir.y * weapon.projectileSpeed,
            z: dir.z * weapon.projectileSpeed
          },
          damage: weapon.damage,
          radius: 0.25,
          lifeTime: 0,
          maxLifeTime: 2.5,
          color: shooter.team === 'RED' ? '#fca5a5' : '#93c5fd'
        };

        broadcastToRoom(matchId, { type: 'projectile_spawned', projectile });
      });
    }

    // Broadcast sync state
    broadcastToRoom(matchId, {
      type: 'game_tick',
      players: room.state.players,
      scoreRed: room.state.scoreRed,
      scoreBlue: room.state.scoreBlue,
      timeRemaining: Math.floor(room.state.timeRemaining)
    });
  }
}, 50);

// WebSocket Connections
wss.on('connection', (ws) => {
  const client: ConnectedClient = {
    ws,
    playerId: `player_${Math.random().toString(36).substring(2, 9)}`,
    matchId: null,
    lastPing: Date.now()
  };
  clients.set(ws, client);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', clientTime: msg.time, serverTime: Date.now() }));
        return;
      }

      if (msg.type === 'join_queue') {
        const { playerName, skinId, weaponId, mapPreference } = msg;
        matchmakingQueue.set(ws, {
          ws,
          playerId: client.playerId,
          playerName: playerName || 'Guerreiro de Papel',
          skinId: skinId || 'explorer',
          weaponId: weaponId || 'rifle',
          mapPreference,
          joinedAt: Date.now()
        });

        broadcastQueueState();
        processMatchmakingQueue();
        return;
      }

      if (msg.type === 'leave_queue') {
        if (matchmakingQueue.has(ws)) {
          matchmakingQueue.delete(ws);
          broadcastQueueState();
          processMatchmakingQueue();
        }
        return;
      }

      if (msg.type === 'join_matchmaking') {
        // Direct queue fallback
        const { playerName, skinId, weaponId, mapId } = msg;
        matchmakingQueue.set(ws, {
          ws,
          playerId: client.playerId,
          playerName: playerName || 'Guerreiro de Papel',
          skinId: skinId || 'explorer',
          weaponId: weaponId || 'rifle',
          mapPreference: mapId,
          joinedAt: Date.now()
        });

        broadcastQueueState();
        processMatchmakingQueue();
        return;
      }

      if (msg.type === 'player_update' && client.matchId) {
        const room = matches.get(client.matchId);
        if (room && room.state.players[client.playerId]) {
          const p = room.state.players[client.playerId];
          p.pos = msg.pos;
          p.rotY = msg.rotY;
          p.pitch = msg.pitch;
          p.isShooting = !!msg.isShooting;
          p.isAiming = !!msg.isAiming;
          p.isReloading = !!msg.isReloading;
          p.ping = msg.ping || 20;
        }
        return;
      }

      if (msg.type === 'player_shoot' && client.matchId) {
        const room = matches.get(client.matchId);
        if (room && room.state.players[client.playerId]) {
          const player = room.state.players[client.playerId];
          const weapon = WEAPONS[player.weaponId] || WEAPONS.rifle;

          const pellets = weapon.pellets || 1;
          for (let i = 0; i < pellets; i++) {
            const spread = weapon.spread;
            const jx = (Math.random() - 0.5) * spread;
            const jy = (Math.random() - 0.5) * spread;
            const jz = (Math.random() - 0.5) * spread;

            const dir: Vector3D = {
              x: msg.dir.x + jx,
              y: msg.dir.y + jy,
              z: msg.dir.z + jz
            };
            const len = Math.hypot(dir.x, dir.y, dir.z);
            dir.x /= len;
            dir.y /= len;
            dir.z /= len;

            const projectile: PaperProjectile = {
              id: `proj_${Math.random().toString(36).substring(2, 9)}`,
              shooterId: client.playerId,
              shooterTeam: player.team,
              weaponId: player.weaponId,
              pos: msg.origin,
              velocity: {
                x: dir.x * weapon.projectileSpeed,
                y: dir.y * weapon.projectileSpeed,
                z: dir.z * weapon.projectileSpeed
              },
              damage: weapon.damage,
              radius: 0.25,
              lifeTime: 0,
              maxLifeTime: 2.5,
              color: player.team === 'RED' ? '#fca5a5' : '#93c5fd'
            };

            broadcastToRoom(client.matchId, { type: 'projectile_spawned', projectile });
          }
        }
        return;
      }

      if (msg.type === 'player_hit' && client.matchId) {
        const room = matches.get(client.matchId);
        if (!room) return;

        const victim = room.state.players[msg.targetId];
        const shooter = room.state.players[client.playerId];

        if (victim && shooter && victim.team !== shooter.team && !victim.isDead) {
          const damage = msg.damage || 25;
          victim.health = Math.max(0, victim.health - damage);

          broadcastToRoom(client.matchId, {
            type: 'player_damaged',
            targetId: victim.id,
            damage,
            remainingHealth: victim.health,
            hitPos: msg.hitPos
          });

          if (victim.health <= 0) {
            victim.isDead = true;
            victim.deaths++;
            victim.respawnTimer = 4; // 4 seconds respawn

            shooter.kills++;
            if (shooter.team === 'RED') room.state.scoreRed++;
            else room.state.scoreBlue++;

            const killItem: KillFeedItem = {
              id: `kf_${Date.now()}`,
              killerName: shooter.name,
              killerTeam: shooter.team,
              victimName: victim.name,
              victimTeam: victim.team,
              weaponName: WEAPONS[shooter.weaponId]?.name || 'Arma de Papel',
              isHeadshot: !!msg.isHeadshot,
              timestamp: Date.now()
            };

            room.state.killFeed.unshift(killItem);
            if (room.state.killFeed.length > 5) room.state.killFeed.pop();

            broadcastToRoom(client.matchId, {
              type: 'player_killed',
              killItem,
              scoreRed: room.state.scoreRed,
              scoreBlue: room.state.scoreBlue
            });

            // Check victory condition
            if (room.state.scoreRed >= room.state.maxScore || room.state.scoreBlue >= room.state.maxScore) {
              room.state.status = 'ended';
              room.state.winnerTeam = room.state.scoreRed >= room.state.maxScore ? 'RED' : 'BLUE';
              broadcastToRoom(client.matchId, {
                type: 'match_ended',
                winner: room.state.winnerTeam,
                state: room.state
              });
            }
          }
        }
        return;
      }

      if (msg.type === 'switch_weapon' && client.matchId) {
        const room = matches.get(client.matchId);
        if (room && room.state.players[client.playerId]) {
          room.state.players[client.playerId].weaponId = msg.weaponId;
          broadcastToRoom(client.matchId, {
            type: 'weapon_switched',
            playerId: client.playerId,
            weaponId: msg.weaponId
          });
        }
        return;
      }

    } catch (err) {
      console.error('Error processing ws message:', err);
    }
  });

  ws.on('close', () => {
    if (matchmakingQueue.has(ws)) {
      matchmakingQueue.delete(ws);
      broadcastQueueState();
      processMatchmakingQueue();
    }

    if (client.matchId) {
      const room = matches.get(client.matchId);
      if (room) {
        delete room.state.players[client.playerId];
        broadcastToRoom(client.matchId, {
          type: 'player_left',
          playerId: client.playerId
        });
        // Refill with bot if match is still running
        if (room.state.status === 'in_progress') {
          fillWithBots(room, 12);
        }
      }
    }
    clients.delete(ws);
  });
});

// Vite / static middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PAPERNITE] Server + WebSockets running on port ${PORT}`);
  });
}

startServer();
