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
const SAMPLE_DIR = path.join(__dirname, 'sample-data');

// 預設場景 Preset 為微台指期貨（tmf，亦相容別名 quant-trading），可透過 PRESET 環境變數或 API 切換擴充
const PRESET_ALIASES = {
  'quant-trading': 'tmf',
  'micro-taiwan-futures': 'tmf',
};

const resolvePresetName = (rawPreset) => {
  const requested = String(rawPreset || process.env.PRESET || process.env.PIXEL_PRESET || 'tmf')
    .trim()
    .toLowerCase();
  const directAgents = path.join(SAMPLE_DIR, `agents.${requested}.json`);
  if (fs.existsSync(directAgents)) {
    return requested;
  }
  const aliased = PRESET_ALIASES[requested];
  if (aliased && fs.existsSync(path.join(SAMPLE_DIR, `agents.${aliased}.json`))) {
    return aliased;
  }
  return 'tmf';
};

let activePreset = resolvePresetName(process.env.PRESET || process.env.PIXEL_PRESET || 'tmf');
const FORCE_PRESET = ['1', 'true', 'yes'].includes(
  String(process.env.FORCE_PRESET || '').trim().toLowerCase()
);

const getPresetPaths = (presetName) => {
  const resolved = resolvePresetName(presetName);
  const mapCandidate = path.join(SAMPLE_DIR, `map.${resolved}.json`);
  const agentsCandidate = path.join(SAMPLE_DIR, `agents.${resolved}.json`);
  return {
    preset: resolved,
    mapPath: fs.existsSync(mapCandidate)
      ? mapCandidate
      : path.join(SAMPLE_DIR, 'map.tmf.json'),
    agentsPath: fs.existsSync(agentsCandidate)
      ? agentsCandidate
      : path.join(SAMPLE_DIR, 'agents.tmf.json'),
  };
};

const listAvailablePresets = () => {
  try {
    const files = fs.readdirSync(SAMPLE_DIR);
    const presets = new Set();
    for (const f of files) {
      const m = /^agents\.([a-z0-9_-]+)\.json$/i.exec(f);
      if (m) presets.add(m[1]);
    }
    return Array.from(presets);
  } catch (e) {
    return ['tmf'];
  }
};

const dataPath = (filename) => path.join(DATA_DIR, filename);
const CONFIG_PATH = dataPath('pixel-config.json');
const AGENTS_PATH = dataPath('agents.json');
const LOG_PATH = dataPath('pixel_actions.jsonl');
const MAP_PATH = dataPath('map.json');
const COLLISION_PATH = dataPath('pixel_collision.json');
const ROOMS_PATH = dataPath('pixel_rooms.json');
const agentMessagePath = (id) => dataPath(`agent_${id}_message.txt`);

const initialPresetPaths = getPresetPaths(activePreset);

// 首次掛載空 Volume 或指定 FORCE_PRESET=1 時，自動從 sample-data 複製對應 Preset 的地圖與角色設定
if ((FORCE_PRESET || !fs.existsSync(MAP_PATH)) && fs.existsSync(initialPresetPaths.mapPath)) {
  fs.copyFileSync(initialPresetPaths.mapPath, MAP_PATH);
  console.log(
    `Seeded data/map.json from sample-data/${path.basename(initialPresetPaths.mapPath)} (PRESET=${activePreset})`
  );
}
if ((FORCE_PRESET || !fs.existsSync(AGENTS_PATH)) && fs.existsSync(initialPresetPaths.agentsPath)) {
  fs.copyFileSync(initialPresetPaths.agentsPath, AGENTS_PATH);
  console.log(
    `Seeded data/agents.json from sample-data/${path.basename(initialPresetPaths.agentsPath)} (PRESET=${activePreset})`
  );
}

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

const loadPresetDefaults = (presetName = activePreset) => {
  const paths = getPresetPaths(presetName);
  const seedAgents = readJSONFile(paths.agentsPath) || [
    { id: 0, name: '數據領航員', role: 'Quote Hub', homeRoom: '情報大廳', color: 0, themeColor: '#38bdf8', badge: 'bg-sky-950/80 text-sky-300 border-sky-500/40', x: 304, y: 400, state: 'patrol', active: true, room: '情報大廳', holdStill: false, idleLines: { post: ['數據串流穩定📡'], rest: ['暫時離線喘口氣☕'] } },
    { id: 1, name: '夜盤交易員', role: 'Night（待命）', homeRoom: '夜盤房', color: 1, themeColor: '#d946ef', badge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40', x: 80, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false, idleLines: { post: ['緊盯夜間動能突破⚡'], rest: ['養精蓄銳等夜盤開戰🌙'] } },
    { id: 2, name: '首席交易官', role: 'Order Gateway', homeRoom: '委託執行室', color: 2, themeColor: '#f97316', badge: 'bg-orange-950/80 text-orange-300 border-orange-500/40', x: 304, y: 208, state: 'patrol', active: true, room: '委託執行室', holdStill: false, idleLines: { post: ['風控佇列待命中🛡️'], rest: ['通道上鎖，喝杯熱茶🍵'] } },
    { id: 3, name: '日盤交易員', role: 'Day（待命）', homeRoom: '日盤房', color: 3, themeColor: '#facc15', badge: 'bg-amber-950/80 text-amber-300 border-amber-500/40', x: 144, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false, idleLines: { post: ['鎖定開盤關鍵區間☀️'], rest: ['早盤收工後特別輕鬆☕'] } },
    { id: 4, name: 'WF分析師', role: 'WF（待命）', homeRoom: '研究室', color: 4, themeColor: '#10b981', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40', x: 224, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false, idleLines: { post: ['檢驗樣本外穩健度📐'], rest: ['等待下一輪滾動尋優📊'] } },
    { id: 5, name: '績效稽核師', role: 'Post（待命）', homeRoom: '研究室', color: 5, themeColor: '#ec4899', badge: 'bg-pink-950/80 text-pink-300 border-pink-500/40', x: 304, y: 592, state: 'lounge', active: true, room: '休息房', holdStill: false, idleLines: { post: ['交叉比對成交與歷史明細🔍'], rest: ['帳目一筆不差，舒服📒'] } },
  ];
  const seedMap = readJSONFile(paths.mapPath) || {};
  const seedRooms = Array.isArray(seedMap.rooms) && seedMap.rooms.length
    ? seedMap.rooms
    : [
        { id: 1, name: '休息房', x: 4, y: 20, isRestRoom: true, tiles: [] },
        { id: 2, name: '情報大廳', x: 9, y: 12, handoffSeat: { x: 6, y: 12 }, handoffWalkaway: { x: 9, y: 12 }, tiles: [] },
        { id: 3, name: '夜盤房', x: 3, y: 4, handoffSeat: { x: 3, y: 2 }, handoffWalkaway: { x: 2, y: 6 }, tiles: [] },
        { id: 4, name: '委託執行室', x: 9, y: 4, handoffSeat: { x: 8, y: 4 }, handoffWalkaway: { x: 11, y: 2 }, dwellMs: 4000, tiles: [] },
        { id: 5, name: '日盤房', x: 16, y: 4, handoffSeat: { x: 16, y: 2 }, handoffWalkaway: { x: 17, y: 6 }, tiles: [] },
        { id: 6, name: '研究室', x: 16, y: 20, handoffSeat: { x: 16, y: 22 }, handoffWalkaway: { x: 15, y: 19 }, tiles: [] },
      ];
  const seedScene = seedMap.scene || {
    title: '微台戰情室 · TMF Cyberpunk Pixel Office',
    dashboardTitle: '微台戰情室控制台',
    panelSubtitle: '6 位微台 AI 代理即時動態',
    restRoom: '休息房',
  };
  return { seedAgents, seedRooms, seedScene, seedMap };
};

const enrichAgentsWithSeed = (agents, seedAgents) => {
  if (!Array.isArray(agents)) return seedAgents;
  return agents.map((agent) => {
    const seed = (seedAgents || []).find((s) => s.id === agent.id) || {};
    return {
      ...seed,
      ...agent,
      homeRoom: agent.homeRoom !== undefined ? agent.homeRoom : seed.homeRoom,
      themeColor: agent.themeColor !== undefined ? agent.themeColor : seed.themeColor,
      badge: agent.badge !== undefined ? agent.badge : seed.badge,
      idleLines: agent.idleLines !== undefined ? agent.idleLines : seed.idleLines,
    };
  });
};

const loadAgentsFromDisk = (seedAgents) => {
  const agentsData = readJSONFile(AGENTS_PATH);
  if (Array.isArray(agentsData) && agentsData.length) {
    return enrichAgentsWithSeed(agentsData, seedAgents);
  }
  const legacyConfig = readJSONFile(CONFIG_PATH);
  if (legacyConfig && Array.isArray(legacyConfig.agents)) {
    return enrichAgentsWithSeed(legacyConfig.agents, seedAgents);
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
  const sceneChanged =
    updates.scene !== undefined &&
    JSON.stringify(current.scene) !== JSON.stringify(updates.scene);
  if (!roomsChanged && !collisionChanged && !sceneChanged && fs.existsSync(MAP_PATH)) {
    return current;
  }
  const merged = {
    ...current,
    ...updates,
    preset: updates.preset || current.preset || activePreset,
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

const {
  seedAgents: defaultAgents,
  seedRooms: defaultRooms,
  seedScene: defaultScene,
} = loadPresetDefaults(activePreset);

let config = {
  preset: activePreset,
  scene: JSON.parse(JSON.stringify(defaultScene)),
  agents: JSON.parse(JSON.stringify(defaultAgents)),
  rooms: JSON.parse(JSON.stringify(defaultRooms)),
};

try {
  const storedAgents = loadAgentsFromDisk(defaultAgents);
  if (storedAgents) {
    config.agents = storedAgents;
    persistAgents(config.agents);
    console.log(`Loaded agents from disk (preset=${activePreset})`);
  } else if (fs.existsSync(CONFIG_PATH)) {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (Array.isArray(savedConfig.agents)) {
      config.agents = enrichAgentsWithSeed(savedConfig.agents, defaultAgents);
    }
    if (Array.isArray(savedConfig.rooms)) {
      config.rooms = savedConfig.rooms;
    }
    persistAgents(config.agents);
  }
} catch (e) {
  console.log(`Using default preset (${activePreset}) agent configuration`);
}

const initialMapData = loadMapData() || {};
if (initialMapData.scene) {
  config.scene = { ...defaultScene, ...initialMapData.scene };
}
if (Array.isArray(initialMapData.rooms) && initialMapData.rooms.length) {
  config.rooms = initialMapData.rooms;
} else if (!Array.isArray(initialMapData.rooms)) {
  initialMapData.rooms = defaultRooms;
}
if (!fs.existsSync(MAP_PATH) || !initialMapData.scene) {
  persistMapData({
    preset: initialMapData.preset || activePreset,
    scene: config.scene,
    rooms: initialMapData.rooms,
    collision: initialMapData.collision || null,
  });
}

if (!fs.existsSync(AGENTS_PATH)) {
  persistAgents(config.agents);
}

const getRestRoomName = () => {
  const mapData = loadMapData() || {};
  if (mapData.scene && mapData.scene.restRoom) {
    return mapData.scene.restRoom;
  }
  const restRoomObj = (mapData.rooms || config.rooms || []).find((r) => r.isRestRoom);
  if (restRoomObj && restRoomObj.name) {
    return restRoomObj.name;
  }
  return config.scene?.restRoom || '休息房';
};

app.get('/api/config', (req, res) => {
  const mapData = loadMapData();
  if (mapData && Array.isArray(mapData.rooms) && mapData.rooms.length) {
    config.rooms = mapData.rooms;
  }
  if (mapData && mapData.scene) {
    config.scene = { ...defaultScene, ...mapData.scene };
  }
  res.json({
    preset: mapData?.preset || config.preset || activePreset,
    scene: config.scene,
    agents: config.agents,
    rooms: config.rooms,
  });
});

app.get('/api/presets', (req, res) => {
  res.json({
    activePreset: config.preset || activePreset,
    availablePresets: listAvailablePresets(),
    aliases: PRESET_ALIASES,
    scene: config.scene,
  });
});

app.post('/api/preset', (req, res) => {
  const { preset } = req.body || {};
  if (!preset) {
    return res.status(400).json({ error: 'Missing preset name' });
  }
  const paths = getPresetPaths(preset);
  activePreset = paths.preset;
  const { seedAgents, seedRooms, seedScene, seedMap } = loadPresetDefaults(activePreset);
  config = {
    preset: activePreset,
    scene: seedScene,
    agents: seedAgents,
    rooms: seedRooms,
  };
  Object.keys(agentAuthoritativeRoom).forEach((k) => delete agentAuthoritativeRoom[k]);
  Object.keys(agentCommandQueues).forEach((k) => delete agentCommandQueues[k]);
  persistAgents(config.agents);
  persistMapData({
    preset: activePreset,
    scene: seedScene,
    rooms: seedRooms,
    collision: seedMap.collision || loadMapData()?.collision || null,
  });
  writeJSONFile(CONFIG_PATH, config);
  console.log(`[Preset] Switched active preset to: ${activePreset}`);
  res.json({ success: true, preset: activePreset, config });
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
  const currentAgentsById = new Map((config.agents || []).map((a) => [a.id, a]));
  const rawIncomingAgents = Array.isArray(incoming.agents) ? incoming.agents : defaultAgents;
  const incomingAgents = rawIncomingAgents.map((a) => {
    const prev = currentAgentsById.get(a.id) || defaultAgents.find((d) => d.id === a.id) || {};
    return {
      ...prev,
      ...a,
      homeRoom: a.homeRoom !== undefined ? a.homeRoom : prev.homeRoom,
      themeColor: a.themeColor !== undefined ? a.themeColor : prev.themeColor,
      badge: a.badge !== undefined ? a.badge : prev.badge,
      idleLines: a.idleLines !== undefined ? a.idleLines : prev.idleLines,
    };
  });

  const currentMap = loadMapData() || {};
  const incomingRoomsHaveTiles =
    Array.isArray(incoming.rooms) &&
    incoming.rooms.some((r) => Array.isArray(r.tiles) && r.tiles.length > 0);
  const authoritativeRooms = incomingRoomsHaveTiles
    ? incoming.rooms.map((r) => {
        const prevRoom = (currentMap.rooms || []).find((pr) => pr.id === r.id || pr.name === r.name) || {};
        return {
          ...prevRoom,
          ...r,
        };
      })
    : Array.isArray(currentMap.rooms) && currentMap.rooms.length
    ? currentMap.rooms
    : defaultRooms;

  const updatedScene = incoming.scene
    ? { ...config.scene, ...incoming.scene }
    : config.scene;

  config = {
    preset: config.preset || activePreset,
    scene: updatedScene,
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
  if (incomingRoomsHaveTiles || incoming.scene) {
    persistMapData({ rooms: config.rooms, scene: config.scene });
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
  const rawCmd = req.body || {};
  const cmd = { ...rawCmd };

  // 相容通用 Webhook 欄位格式 (x/y, state: "sit", message) 與既有欄位格式 (tileX/tileY, sitAfter, msg)
  if (cmd.tileX === undefined && cmd.x !== undefined) {
    const numX = Number(cmd.x);
    cmd.tileX = numX >= 32 ? Math.floor(numX / GRID_SIZE) : numX;
  }
  if (cmd.tileY === undefined && cmd.y !== undefined) {
    const numY = Number(cmd.y);
    cmd.tileY = numY >= 32 ? Math.floor(numY / GRID_SIZE) : numY;
  }
  if (cmd.sitAfter === undefined && cmd.state !== undefined) {
    cmd.sitAfter = cmd.state === 'sit' || cmd.state === 'sitting';
  }
  if (!cmd.msg && cmd.message) {
    cmd.msg = cmd.message;
  }

  const restRoomName = getRestRoomName();

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

  if (cmd.room === restRoomName) {
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
        agent.state = cmd.room === restRoomName ? 'lounge' : 'patrol';
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
  const count = Array.isArray(config.agents) && config.agents.length ? config.agents.length : 6;
  for (let i = 0; i < count; i++) {
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
    const currentMap = loadMapData() || {};
    const mergedRooms = Array.isArray(req.body)
      ? req.body.map((r) => {
          const prev = (currentMap.rooms || []).find((pr) => pr.id === r.id || pr.name === r.name) || {};
          return { ...prev, ...r };
        })
      : req.body;
    const updated = persistMapData({ rooms: mergedRooms });
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
  console.log(`Cyberpunk Pixel Office [PRESET=${activePreset}] listening on http://0.0.0.0:${PORT}`);
});
