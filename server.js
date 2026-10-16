const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const resolveDataDir = (dir) => {
  if (!dir) {
    return path.join(__dirname, 'data');
  }
  return path.isAbsolute(dir) ? dir : path.join(__dirname, dir);
};

const DATA_DIR = resolveDataDir(process.env.PIXEL_DATA_DIR);
fs.mkdirSync(DATA_DIR, { recursive: true });

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'pixeladmin';

const dataPath = (filename) => path.join(DATA_DIR, filename);
const CONFIG_PATH = dataPath('pixel-config.json');
const AGENTS_PATH = dataPath('agents.json');
const LOG_PATH = dataPath('pixel_actions.jsonl');
const MAP_PATH = dataPath('map.json');
const COLLISION_PATH = dataPath('pixel_collision.json');
const ROOMS_PATH = dataPath('pixel_rooms.json');
const agentMessagePath = (id) => dataPath(`agent_${id}_message.txt`);

const readJSONFile = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
};

const writeJSONFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const loadAgentsFromDisk = () => {
  const agentsData = readJSONFile(AGENTS_PATH);
  if (Array.isArray(agentsData) && agentsData.length) {
    return agentsData;
  }
  const legacyConfig = readJSONFile(CONFIG_PATH);
  if (legacyConfig && Array.isArray(legacyConfig.agents)) {
    return legacyConfig.agents;
  }
  return null;
};

const persistAgents = (agents) => {
  if (Array.isArray(agents)) {
    writeJSONFile(AGENTS_PATH, agents);
  }
};

const loadMapData = () => {
  const mapData = readJSONFile(MAP_PATH);
  if (mapData) {
    return mapData;
  }
  return {
    collision: readJSONFile(COLLISION_PATH),
    rooms: readJSONFile(ROOMS_PATH),
  };
};

const persistMapData = (updates = {}) => {
  const current = loadMapData() || {};
  const roomsChanged =
    updates.rooms !== undefined &&
    JSON.stringify(current.rooms) !== JSON.stringify(updates.rooms);
  const collisionChanged =
    updates.collision !== undefined &&
    JSON.stringify(current.collision) !== JSON.stringify(updates.collision);
  if (!roomsChanged && !collisionChanged && fs.existsSync(MAP_PATH)) {
    return current;
  }
  const merged = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeJSONFile(MAP_PATH, merged);
  if (merged.rooms && roomsChanged) {
    writeJSONFile(ROOMS_PATH, merged.rooms);
  }
  if (merged.collision && collisionChanged) {
    writeJSONFile(COLLISION_PATH, merged.collision);
  }
  return merged;
};

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 19001;

app.use(express.json());
app.use(
  express.static(path.join(__dirname), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html') || filePath.endsWith('.png')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  })
);

// TMF 台指期戰情室預設 6 角色與 6 房間
let config = {
  agents: [
    { id: 0, name: '數據領航員', role: 'Quote Hub', color: 0, x: 304, y: 400, state: 'patrol', active: true, room: '情報大廳', holdStill: false },
    { id: 1, name: '夜盤交易員', role: 'Night（待命）', color: 1, x: 80, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false },
    { id: 2, name: '首席交易官', role: 'Order Gateway', color: 2, x: 304, y: 208, state: 'patrol', active: true, room: '委託執行室', holdStill: false },
    { id: 3, name: '日盤交易員', role: 'Day（待命）', color: 3, x: 144, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false },
    { id: 4, name: 'WF分析師', role: 'WF（待命）', color: 4, x: 224, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false },
    { id: 5, name: '績效稽核師', role: 'Post（待命）', color: 5, x: 304, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false },
  ],
  rooms: [
    { id: 1, name: '休息房', x: 4, y: 20, tiles: [] },
    { id: 2, name: '情報大廳', x: 9, y: 12, tiles: [] },
    { id: 3, name: '夜盤房', x: 3, y: 4, tiles: [] },
    { id: 4, name: '委託執行室', x: 9, y: 4, tiles: [] },
    { id: 5, name: '日盤房', x: 16, y: 4, tiles: [] },
    { id: 6, name: '研究室', x: 16, y: 20, tiles: [] },
  ],
};

const defaultAgents = JSON.parse(JSON.stringify(config.agents));
const defaultRooms = JSON.parse(JSON.stringify(config.rooms));

try {
  const storedAgents = loadAgentsFromDisk();
  if (storedAgents) {
    config.agents = storedAgents;
    console.log('Loaded agents from disk');
  } else if (fs.existsSync(CONFIG_PATH)) {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (Array.isArray(savedConfig.agents)) {
      config.agents = savedConfig.agents;
    }
    if (Array.isArray(savedConfig.rooms)) {
      config.rooms = savedConfig.rooms;
    }
    persistAgents(config.agents);
  }
} catch (e) {
  console.log('Using default TMF agent configuration');
}

const initialMapData = loadMapData() || {};
if (Array.isArray(initialMapData.rooms) && initialMapData.rooms.length) {
  config.rooms = initialMapData.rooms;
} else if (!Array.isArray(initialMapData.rooms)) {
  initialMapData.rooms = defaultRooms;
}
if (!fs.existsSync(MAP_PATH)) {
  persistMapData({
    rooms: initialMapData.rooms,
    collision: initialMapData.collision || null,
  });
}

if (!fs.existsSync(AGENTS_PATH)) {
  persistAgents(config.agents);
}

app.get('/api/config', (req, res) => {
  const mapData = loadMapData();
  if (mapData && Array.isArray(mapData.rooms) && mapData.rooms.length) {
    config.rooms = mapData.rooms;
  }
  res.json({
    agents: config.agents,
    rooms: config.rooms,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!DASHBOARD_PASSWORD) {
    return res.json({ success: true });
  }
  if (password && password === DASHBOARD_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false });
});

app.post('/api/config', (req, res) => {
  const incoming = req.body || {};
  const incomingAgents = Array.isArray(incoming.agents) ? incoming.agents : defaultAgents;
  const currentMap = loadMapData() || {};
  const incomingRoomsHaveTiles =
    Array.isArray(incoming.rooms) &&
    incoming.rooms.some((r) => Array.isArray(r.tiles) && r.tiles.length > 0);
  const authoritativeRooms = incomingRoomsHaveTiles
    ? incoming.rooms
    : Array.isArray(currentMap.rooms) && currentMap.rooms.length
    ? currentMap.rooms
    : defaultRooms;

  config = {
    agents: incomingAgents,
    rooms: authoritativeRooms,
  };
  // 保護後端權威房間與終點座標，避免背景分頁舊快照覆蓋後端最新房間
  for (const agent of config.agents) {
    const auth = agentAuthoritativeRoom[agent.id];
    const q = agentCommandQueues[agent.id] || [];
    if (auth && (q.length > 0 || (auth.room && agent.room !== auth.room))) {
      agent.room = auth.room;
      agent.state = auth.state;
      agent.x = auth.x;
      agent.y = auth.y;
      agent.sitting = auth.sitting;
      agent.action = auth.action;
      agent.holdStill = false;
    }
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  persistAgents(config.agents);
  if (incomingRoomsHaveTiles) {
    persistMapData({ rooms: config.rooms });
  }
  res.json({ success: true, config });
});

app.post('/api/agent/:id/move', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { x, y, state } = req.body;
  const agent = config.agents.find((a) => a.id === id);
  if (agent) {
    if (x !== undefined) agent.x = x;
    if (y !== undefined) agent.y = y;
    if (state) agent.state = state;
    res.json({ success: true, agent });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.get('/api/log', (req, res) => {
  try {
    const logData = fs
      .readFileSync(LOG_PATH, 'utf8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .slice(-50);
    res.json(logData);
  } catch (e) {
    res.json([]);
  }
});

app.post('/api/log/clear', (req, res) => {
  try {
    fs.writeFileSync(LOG_PATH, '');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const agentCommandQueues = {};
const agentAuthoritativeRoom = {};
const COMMAND_TTL_MS = 120000;
const GRID_SIZE = 32;

app.get('/api/agent/:id/command', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const q = agentCommandQueues[id] || [];
  const now = Date.now();
  while (q.length > 1 && now - q[0].ts >= COMMAND_TTL_MS) {
    q.shift();
  }
  if (!q.length) {
    agentCommandQueues[id] = q;
    return res.json(null);
  }
  const item = q.shift();
  agentCommandQueues[id] = q;
  return res.json(item.cmd);
});

app.post('/api/agent/:id/arrived', (req, res) => {
  res.json({ success: true });
});

app.post('/api/agent/:id/command/ack', (req, res) => {
  res.json({ success: true });
});

app.post('/api/agent/:id/command', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cmd = req.body || {};
  if (cmd.action === 'move' && cmd.room) {
    const mapData = loadMapData() || {};
    const roomObj = (mapData.rooms || []).find((r) => r.name === cmd.room);
    if (roomObj && Array.isArray(roomObj.tiles) && roomObj.tiles.length > 0) {
      const tx = Number(cmd.tileX);
      const ty = Number(cmd.tileY);
      const inTargetRoom = roomObj.tiles.some((t) => t.x === tx && t.y === ty);
      if (!inTargetRoom) {
        const collision = mapData.collision;
        const walkable = roomObj.tiles.filter((t) => {
          const cell = collision?.[t.y]?.[t.x];
          return cmd.sitAfter ? cell === 3 || cell === 0 : cell === 0;
        });
        const pool = walkable.length ? walkable : roomObj.tiles;
        const avgX = pool.reduce((s, t) => s + t.x, 0) / pool.length;
        const avgY = pool.reduce((s, t) => s + t.y, 0) / pool.length;
        let best = pool[0];
        let bestDist = Infinity;
        for (const t of pool) {
          const d = Math.abs(t.x - avgX) + Math.abs(t.y - avgY);
          if (d < bestDist) {
            bestDist = d;
            best = t;
          }
        }
        cmd.tileX = best.x;
        cmd.tileY = best.y;
      }
    }
  }
  if (!agentCommandQueues[id]) agentCommandQueues[id] = [];

  if (cmd.room === '休息房') {
    agentCommandQueues[id] = [];
  }

  agentCommandQueues[id].push({ cmd, ts: Date.now() });
  if (agentCommandQueues[id].length > 30) {
    agentCommandQueues[id].shift();
  }

  if (cmd.action === 'move' && Array.isArray(config.agents)) {
    const agent = config.agents.find((a) => a.id === id);
    if (agent) {
      if (cmd.tileX !== undefined && cmd.tileY !== undefined) {
        agent.x = Number(cmd.tileX) * GRID_SIZE + GRID_SIZE / 2;
        agent.y = Number(cmd.tileY) * GRID_SIZE + GRID_SIZE / 2;
      }
      if (cmd.room) {
        agent.room = cmd.room;
        agent.state = cmd.room === '休息房' ? 'lounge' : 'patrol';
      }
      agent.sitting = !!cmd.sitAfter;
      agent.action = cmd.sitAfter ? 'sitting' : 'idle';
      agent.holdStill = false;
      agentAuthoritativeRoom[id] = {
        room: agent.room,
        state: agent.state,
        x: agent.x,
        y: agent.y,
        sitting: agent.sitting,
        action: agent.action,
      };
      try {
        persistAgents(config.agents);
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        const nowStr = new Date().toLocaleTimeString('zh-TW', {
          hour12: false,
          timeZone: 'Asia/Taipei',
        });
        const logEntry = {
          time: nowStr,
          agent: id,
          action: cmd.action,
          room: cmd.room || agent.room || '',
          msg: cmd.msg || `前往 ${cmd.room || agent.room || '目標位置'}`,
        };
        fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf8');
      } catch (e) {}
    }
  }

  console.log(`[Command] Agent ${id} (q=${agentCommandQueues[id].length}):`, cmd);
  res.json({ success: true, queued: agentCommandQueues[id].length });
});

app.get('/api/messages', (req, res) => {
  const messages = {};
  for (let i = 0; i < 6; i++) {
    try {
      messages[i] = fs.readFileSync(agentMessagePath(i), 'utf8');
    } catch (e) {
      messages[i] = '';
    }
  }
  res.json(messages);
});

app.post('/api/collision', (req, res) => {
  try {
    persistMapData({ collision: req.body });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rooms', (req, res) => {
  try {
    const updated = persistMapData({ rooms: req.body });
    if (Array.isArray(updated.rooms)) {
      config.rooms = updated.rooms;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/collision', (req, res) => {
  try {
    const mapData = loadMapData();
    if (!mapData || !mapData.collision) {
      throw new Error('Map collision data unavailable');
    }
    res.json(mapData.collision);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Map collision data unavailable' });
  }
});

app.get('/api/rooms', (req, res) => {
  try {
    const mapData = loadMapData();
    if (mapData && Array.isArray(mapData.rooms)) {
      return res.json(mapData.rooms);
    }
  } catch (e) {}
  res.json(config.rooms.map((r) => ({ name: r.name, x: r.x, y: r.y, tiles: [] })));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TMF Cyberpunk Pixel Office listening on http://0.0.0.0:${PORT}`);
});
