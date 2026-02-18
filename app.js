const SPECIES = [
  { name: "Solar", color: "#ff8f48" },
  { name: "Aqua", color: "#5ecbff" },
  { name: "Bloom", color: "#79f28f" },
  { name: "Pulse", color: "#f675d8" },
];

const DEFAULT_MATRIX = [
  [0.4, 0.9, -0.6, 0.2],
  [-0.6, 0.3, 0.85, -0.5],
  [0.55, -0.8, 0.25, 0.8],
  [-0.35, 0.7, -0.9, 0.45],
];

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const ui = {
  count: document.getElementById("count"),
  radius: document.getElementById("radius"),
  strength: document.getElementById("strength"),
  drag: document.getElementById("drag"),
  speed: document.getElementById("speed"),
  trails: document.getElementById("trails"),
  wrap: document.getElementById("wrap"),
  toggleSim: document.getElementById("toggleSim"),
  randomizeWorld: document.getElementById("randomizeWorld"),
  randomizeRules: document.getElementById("randomizeRules"),
  stats: document.getElementById("stats"),
  matrix: document.getElementById("matrix"),
  countValue: document.getElementById("countValue"),
  radiusValue: document.getElementById("radiusValue"),
  strengthValue: document.getElementById("strengthValue"),
  dragValue: document.getElementById("dragValue"),
  speedValue: document.getElementById("speedValue"),
  seedInput: document.getElementById("seedInput"),
  cohesionInput: document.getElementById("cohesionInput"),
  rivalryInput: document.getElementById("rivalryInput"),
  chaosInput: document.getElementById("chaosInput"),
  swirlInput: document.getElementById("swirlInput"),
  clusterInput: document.getElementById("clusterInput"),
  generateUnique: document.getElementById("generateUnique"),
  profileTag: document.getElementById("profileTag"),
};

const state = {
  particles: [],
  matrix: DEFAULT_MATRIX.map((row) => [...row]),
  paused: false,
  tick: 0,
  controls: {
    count: Number(ui.count.value),
    radius: Number(ui.radius.value),
    strength: Number(ui.strength.value),
    drag: Number(ui.drag.value),
    speed: Number(ui.speed.value),
    trails: ui.trails.checked,
    wrap: ui.wrap.checked,
  },
  profile: {
    seedText: "nebula-01",
    seed: 1,
    cohesion: 0.45,
    rivalry: 0.5,
    chaos: 0.7,
    swirl: 0.35,
    cluster: 0.55,
    phaseX: 0,
    phaseY: 0,
    signature: "",
  },
};

function fitCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

function randWith(rng, min = 0, max = 1) {
  return rng() * (max - min) + min;
}

function hashSeed(text) {
  const source = String(text).trim() || "seed";
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readNumberInput(input, min, max, fallback) {
  const parsed = Number(input.value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function updateProfileInputs(profile) {
  ui.seedInput.value = profile.seedText;
  ui.cohesionInput.value = profile.cohesion.toFixed(2);
  ui.rivalryInput.value = profile.rivalry.toFixed(2);
  ui.chaosInput.value = profile.chaos.toFixed(2);
  ui.swirlInput.value = profile.swirl.toFixed(2);
  ui.clusterInput.value = profile.cluster.toFixed(2);
}

function buildProfileFromInputs() {
  const seedText = String(ui.seedInput.value || "seed").trim() || "seed";
  const seed = hashSeed(seedText);
  const cohesion = readNumberInput(ui.cohesionInput, -1, 1, 0.45);
  const rivalry = readNumberInput(ui.rivalryInput, -1, 1, 0.5);
  const chaos = readNumberInput(ui.chaosInput, 0, 2.5, 0.7);
  const swirl = readNumberInput(ui.swirlInput, -1, 1, 0.35);
  const cluster = readNumberInput(ui.clusterInput, 0, 1, 0.55);

  return {
    seedText,
    seed,
    cohesion,
    rivalry,
    chaos,
    swirl,
    cluster,
    phaseX: ((seed % 6283) / 1000) * 2,
    phaseY: ((((seed >>> 1) % 6283) / 1000) * 2) + 0.6,
    signature: "",
  };
}

function buildMatrixFromProfile(profile) {
  const rng = createRng(profile.seed ^ 0xa341316c);
  const matrix = [];

  for (let r = 0; r < SPECIES.length; r += 1) {
    matrix[r] = [];
    for (let c = 0; c < SPECIES.length; c += 1) {
      let value = randWith(rng, -0.75, 0.75);

      if (r === c) {
        value += profile.cohesion * 0.9;
      } else {
        value -= profile.rivalry * 0.9;
      }

      value += ((r - c) / SPECIES.length) * profile.swirl * 0.25;
      matrix[r][c] = Number(clamp(value, -1, 1).toFixed(2));
    }
  }

  return matrix;
}

function spawnParticle(width, height, rng, anchors, type = Math.floor(randWith(rng, 0, SPECIES.length))) {
  const angle = randWith(rng, 0, Math.PI * 2);
  const speed = randWith(rng, 0.2, state.controls.speed);
  const clusterChance = state.profile.cluster;

  let x;
  let y;

  if (randWith(rng, 0, 1) < clusterChance) {
    const anchor = anchors[type];
    const spread = (1 - clusterChance) * 120 + 40;
    x = anchor.x + randWith(rng, -spread, spread);
    y = anchor.y + randWith(rng, -spread, spread);
  } else {
    x = randWith(rng, 0, width);
    y = randWith(rng, 0, height);
  }

  x = clamp(x, 0, width);
  y = clamp(y, 0, height);

  return {
    type,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    mass: randWith(rng, 0.8, 1.4),
  };
}

function buildAnchors(width, height, rng) {
  return SPECIES.map(() => ({
    x: randWith(rng, width * 0.15, width * 0.85),
    y: randWith(rng, height * 0.15, height * 0.85),
  }));
}

function refillParticles(rng = Math.random) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const anchors = buildAnchors(width, height, rng);
  state.particles = Array.from({ length: state.controls.count }, () =>
    spawnParticle(width, height, rng, anchors),
  );
  state.tick = 0;
}

function randomizeWorld() {
  refillParticles(Math.random);
}

function randomizeRules() {
  for (let r = 0; r < SPECIES.length; r += 1) {
    for (let c = 0; c < SPECIES.length; c += 1) {
      state.matrix[r][c] = Number(rand(-1, 1).toFixed(2));
    }
  }

  state.profile.signature = "Manual matrix";
  ui.profileTag.textContent = "Manual matrix mode";
  renderMatrixEditor();
}

function applyGeneratedProfile() {
  const profile = buildProfileFromInputs();
  state.profile = profile;
  state.matrix = buildMatrixFromProfile(profile);
  state.profile.signature = `${profile.seedText}::${profile.seed.toString(16).slice(0, 8)}`;

  updateProfileInputs(profile);
  renderMatrixEditor();
  refillParticles(createRng(profile.seed ^ 0x9e3779b9));
  ui.profileTag.textContent = `Profile ${state.profile.signature}`;
}

function wrapDelta(delta, size) {
  if (!state.controls.wrap) {
    return delta;
  }
  if (delta > size / 2) {
    return delta - size;
  }
  if (delta < -size / 2) {
    return delta + size;
  }
  return delta;
}

function applyForces() {
  const radius = state.controls.radius;
  const radiusSq = radius * radius;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  for (let i = 0; i < state.particles.length; i += 1) {
    const a = state.particles[i];

    for (let j = i + 1; j < state.particles.length; j += 1) {
      const b = state.particles[j];
      const dx = wrapDelta(b.x - a.x, width);
      const dy = wrapDelta(b.y - a.y, height);
      const distSq = dx * dx + dy * dy;

      if (distSq <= 0.0001 || distSq > radiusSq) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const falloff = 1 - dist / radius;
      const scale = 0.06 * state.controls.strength;

      const pullA = state.matrix[a.type][b.type] * falloff * scale;
      const pullB = state.matrix[b.type][a.type] * falloff * scale;

      a.vx += (nx * pullA) / a.mass;
      a.vy += (ny * pullA) / a.mass;
      b.vx -= (nx * pullB) / b.mass;
      b.vy -= (ny * pullB) / b.mass;

      const swirl = state.profile.swirl * falloff * scale * 0.65;
      a.vx += (-ny * swirl) / a.mass;
      a.vy += (nx * swirl) / a.mass;
      b.vx -= (-ny * swirl) / b.mass;
      b.vy -= (nx * swirl) / b.mass;

      // Keep particles from collapsing into singular points.
      const minDist = 10;
      if (dist < minDist) {
        const repel = ((minDist - dist) / minDist) * 0.18;
        a.vx -= nx * repel;
        a.vy -= ny * repel;
        b.vx += nx * repel;
        b.vy += ny * repel;
      }
    }
  }
}

function applyChaosField() {
  const chaos = state.profile.chaos;
  if (chaos <= 0.001) {
    return;
  }

  const t = state.tick * 0.015;
  const phaseX = state.profile.phaseX;
  const phaseY = state.profile.phaseY;
  const scale = chaos * 0.012;

  for (const p of state.particles) {
    const fx = Math.sin(p.y * 0.018 + phaseX + t) + Math.cos(p.y * 0.008 - phaseY * 0.7);
    const fy = Math.cos(p.x * 0.018 + phaseY + t) + Math.sin(p.x * 0.008 + phaseX * 0.7);
    p.vx += fx * scale;
    p.vy += fy * scale;
  }
}

function integrate() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const drag = state.controls.drag;
  const maxSpeed = state.controls.speed;

  for (const p of state.particles) {
    p.vx *= drag;
    p.vy *= drag;

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      const factor = maxSpeed / speed;
      p.vx *= factor;
      p.vy *= factor;
    }

    p.x += p.vx;
    p.y += p.vy;

    if (state.controls.wrap) {
      if (p.x < 0) p.x += width;
      if (p.x >= width) p.x -= width;
      if (p.y < 0) p.y += height;
      if (p.y >= height) p.y -= height;
    } else {
      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
        p.y = Math.max(0, Math.min(height, p.y));
      }
    }
  }
}

function drawParticle(p) {
  const species = SPECIES[p.type];
  const r = 3.2 + p.mass * 1.8;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = species.color;
  ctx.shadowColor = species.color;
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  const heading = Math.atan2(p.vy, p.vx);
  const streak = 8;
  ctx.strokeStyle = species.color;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-Math.cos(heading) * streak, -Math.sin(heading) * streak);
  ctx.stroke();

  ctx.restore();
}

function paint() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!state.controls.trails) {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.fillStyle = state.controls.trails ? "rgba(3, 8, 18, 0.16)" : "rgba(3, 8, 18, 1)";
  ctx.fillRect(0, 0, width, height);

  for (const p of state.particles) {
    drawParticle(p);
  }
}

function computeStats() {
  let kinetic = 0;
  const byType = new Array(SPECIES.length).fill(0);

  for (const p of state.particles) {
    byType[p.type] += 1;
    kinetic += Math.hypot(p.vx, p.vy);
  }

  const averageSpeed = state.particles.length ? kinetic / state.particles.length : 0;
  const counts = byType.map((n, i) => `${SPECIES[i].name}: ${n}`).join(" | ");

  ui.stats.textContent =
    `Avg speed ${averageSpeed.toFixed(2)} | Radius ${state.controls.radius} | ` +
    `Chaos ${state.profile.chaos.toFixed(2)} | ${counts}`;
}

function frame() {
  if (!state.paused) {
    applyForces();
    applyChaosField();
    integrate();
    state.tick += 1;
  }

  paint();
  computeStats();
  requestAnimationFrame(frame);
}

function updateControlValues() {
  ui.countValue.textContent = String(state.controls.count);
  ui.radiusValue.textContent = String(state.controls.radius);
  ui.strengthValue.textContent = state.controls.strength.toFixed(2);
  ui.dragValue.textContent = state.controls.drag.toFixed(3);
  ui.speedValue.textContent = state.controls.speed.toFixed(2);
}

function setupControls() {
  ui.count.addEventListener("input", (event) => {
    state.controls.count = Number(event.target.value);
    updateControlValues();
  });

  ui.count.addEventListener("change", () => {
    refillParticles();
  });

  ui.radius.addEventListener("input", (event) => {
    state.controls.radius = Number(event.target.value);
    updateControlValues();
  });

  ui.strength.addEventListener("input", (event) => {
    state.controls.strength = Number(event.target.value);
    updateControlValues();
  });

  ui.drag.addEventListener("input", (event) => {
    state.controls.drag = Number(event.target.value);
    updateControlValues();
  });

  ui.speed.addEventListener("input", (event) => {
    state.controls.speed = Number(event.target.value);
    updateControlValues();
  });

  ui.trails.addEventListener("change", (event) => {
    state.controls.trails = event.target.checked;
  });

  ui.wrap.addEventListener("change", (event) => {
    state.controls.wrap = event.target.checked;
  });

  ui.toggleSim.addEventListener("click", () => {
    state.paused = !state.paused;
    ui.toggleSim.textContent = state.paused ? "Resume" : "Pause";
  });

  ui.randomizeWorld.addEventListener("click", randomizeWorld);
  ui.randomizeRules.addEventListener("click", randomizeRules);
  ui.generateUnique.addEventListener("click", applyGeneratedProfile);

  ui.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyGeneratedProfile();
    }
  });
}

function renderMatrixEditor() {
  const table = document.createElement("table");
  table.className = "matrix-table";

  const header = document.createElement("tr");
  header.appendChild(document.createElement("th"));

  for (const s of SPECIES) {
    const th = document.createElement("th");
    th.textContent = s.name;
    th.style.color = s.color;
    header.appendChild(th);
  }
  table.appendChild(header);

  for (let r = 0; r < SPECIES.length; r += 1) {
    const row = document.createElement("tr");

    const head = document.createElement("th");
    head.textContent = SPECIES[r].name;
    head.style.color = SPECIES[r].color;
    row.appendChild(head);

    for (let c = 0; c < SPECIES.length; c += 1) {
      const td = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.className = "matrix-cell";

      const output = document.createElement("output");
      output.textContent = state.matrix[r][c].toFixed(2);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "-1";
      slider.max = "1";
      slider.step = "0.05";
      slider.value = String(state.matrix[r][c]);
      slider.setAttribute("aria-label", `${SPECIES[r].name} toward ${SPECIES[c].name}`);

      slider.addEventListener("input", (event) => {
        const value = Number(event.target.value);
        state.matrix[r][c] = value;
        output.textContent = value.toFixed(2);
        ui.profileTag.textContent = `Edited matrix | Profile ${state.profile.signature}`;
      });

      wrap.appendChild(output);
      wrap.appendChild(slider);
      td.appendChild(wrap);
      row.appendChild(td);
    }

    table.appendChild(row);
  }

  ui.matrix.innerHTML = "";
  ui.matrix.appendChild(table);
}

window.addEventListener("resize", () => {
  fitCanvas();
  refillParticles();
});

fitCanvas();
setupControls();
updateControlValues();
applyGeneratedProfile();
frame();
