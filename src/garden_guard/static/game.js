const LEVELS = [
  {
    id: "training-patch",
    name: "Training Patch",
    goal: "Clear all 4 waves",
    seeds: 7,
    width: 5,
    height: 5,
    spawns: [1, 3],
    gates: [1, 3],
    waves: [
      [{ row: 1, type: "sock" }],
      [{ row: 3, type: "sock" }],
      [{ row: 1, type: "bucket" }, { row: 3, type: "sock" }],
      [{ row: 1, type: "sock" }, { row: 3, type: "bucket" }],
    ],
  },
  {
    id: "sprinkler-hill",
    name: "Sprinkler Hill",
    goal: "Clear all 4 waves",
    seeds: 9,
    width: 5,
    height: 5,
    spawns: [0, 2, 4],
    gates: [0, 2, 4],
    waves: [
      [{ row: 2, type: "sock" }],
      [{ row: 0, type: "bucket" }, { row: 4, type: "sock" }],
      [{ row: 2, type: "windup" }, { row: 4, type: "sock" }],
      [{ row: 0, type: "bucket" }, { row: 2, type: "windup" }],
    ],
  },
];

const UNITS = {
  pea: {
    name: "Pea Cadet",
    icon: "assets/pea-cadet.svg",
    cost: 2,
    hp: 3,
    damage: 1,
    range: 3,
    text: "Shoots down its row.",
  },
  medic: {
    name: "Sun Medic",
    icon: "assets/sun-medic.svg",
    cost: 2,
    hp: 2,
    damage: 0,
    range: 0,
    text: "Heals nearby friends.",
  },
  bunker: {
    name: "Tater Bunker",
    icon: "assets/tater-bunker.svg",
    cost: 1,
    hp: 6,
    damage: 0,
    range: 0,
    text: "Blocks a lane.",
  },
  tank: {
    name: "Sprout Tank",
    icon: "assets/sprout-tank.svg",
    cost: 3,
    hp: 4,
    damage: 2,
    range: 2,
    text: "Big close shot.",
  },
};

const ENEMIES = {
  sock: { name: "Sock Zombie", icon: "assets/sock-zombie.svg", hp: 2, damage: 1, speed: 1 },
  bucket: { name: "Bucket Bot", icon: "assets/bucket-bot.svg", hp: 4, damage: 1, speed: 1 },
  windup: { name: "Wind-Up Raider", icon: "assets/windup-raider.svg", hp: 3, damage: 2, speed: 1 },
};

const state = {
  sessionId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  levelIndex: 0,
  selectedUnit: "pea",
  turn: 1,
  seeds: 0,
  defenders: [],
  enemies: [],
  placements: [],
  waveIndex: 0,
  stopped: 0,
  damageToGate: 0,
  gameOver: false,
  resolving: false,
};

const audio = {
  enabled: localStorage.getItem("gardenGuardSound") !== "off",
  context: null,
};

const board = document.querySelector("#board");
const unitCards = document.querySelector("#unitCards");
const message = document.querySelector("#message");
const turnBadge = document.querySelector("#turnBadge");
const seedBadge = document.querySelector("#seedBadge");
const gateBadge = document.querySelector("#gateBadge");
const goalBadge = document.querySelector("#goalBadge");
const levelText = document.querySelector("#levelText");
const nextTurnBtn = document.querySelector("#nextTurnBtn");
const soundBtn = document.querySelector("#soundBtn");
const undoBtn = document.querySelector("#undoBtn");
const hintBtn = document.querySelector("#hintBtn");
const restartBtn = document.querySelector("#restartBtn");
const telemetrySummary = document.querySelector("#telemetrySummary");
const eventList = document.querySelector("#eventList");
const enemyPlan = document.querySelector("#enemyPlan");

function level() {
  return LEVELS[state.levelIndex];
}

function beginLevel(index = 0) {
  const chosen = LEVELS[index];
  state.levelIndex = index;
  state.turn = 1;
  state.seeds = chosen.seeds;
  state.defenders = [];
  state.enemies = [];
  state.placements = [];
  state.waveIndex = 0;
  state.stopped = 0;
  state.damageToGate = 0;
  state.gameOver = false;
  state.selectedUnit = "pea";
  spawnWave();
  track("level_start", { levelId: chosen.id });
  showMessage("Mission: stop every wave. Bad guys are on the blue right edge and move left after End Turn.");
  render();
}

function track(type, payload = {}) {
  fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, session_id: state.sessionId, payload }),
  })
    .then(() => refreshTelemetry())
    .catch(() => {});
}

function refreshTelemetry() {
  fetch("/api/telemetry/summary")
    .then((response) => response.json())
    .then((summary) => {
      telemetrySummary.textContent =
        `${summary.eventCount} events. ` +
        `${summary.byType.level_complete || 0} wins, ` +
        `${summary.byType.level_failed || 0} losses.`;
      eventList.innerHTML = "";
      summary.recent
        .slice()
        .reverse()
        .slice(0, 8)
        .forEach((event) => {
          const item = document.createElement("div");
          item.className = "event-item";
          item.textContent = `${event.type} ${event.payload.levelId || ""}`;
          eventList.appendChild(item);
        });
    })
    .catch(() => {});
}

function showMessage(text) {
  message.textContent = text;
}

function render() {
  renderCards();
  renderBoard();
  const chosen = level();
  levelText.textContent = chosen.name;
  turnBadge.textContent = `Turn ${state.turn}`;
  seedBadge.textContent = `Seeds ${state.seeds}`;
  gateBadge.textContent = `Gate hits ${state.damageToGate}/3`;
  goalBadge.textContent = `${chosen.goal} | Wave ${Math.min(state.waveIndex, chosen.waves.length)}/${chosen.waves.length}`;
  renderEnemyPlan();
  undoBtn.disabled = state.resolving || state.placements.length === 0 || state.gameOver;
  hintBtn.disabled = state.resolving || state.gameOver;
  restartBtn.disabled = state.resolving;
  nextTurnBtn.disabled = state.resolving || state.gameOver;
  nextTurnBtn.textContent = state.resolving ? "Resolving..." : state.gameOver ? "Level Done" : "End Turn";
  soundBtn.textContent = audio.enabled ? "Sound On" : "Sound Off";
  soundBtn.classList.toggle("muted", !audio.enabled);
}

function renderCards() {
  unitCards.innerHTML = "";
  Object.entries(UNITS).forEach(([key, unit]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `unit-card ${state.selectedUnit === key ? "selected" : ""}`;
    card.disabled = state.resolving || state.gameOver || state.seeds < unit.cost;
    card.innerHTML = `
      <span class="unit-icon"><img src="${unit.icon}" alt="" /></span>
      <span>
        <span class="unit-name">${unit.name}</span>
        <span class="unit-meta">${unit.cost} seed | ${unit.text}</span>
      </span>`;
    card.addEventListener("click", () => {
      playSound("select");
      state.selectedUnit = key;
      showMessage(`${unit.name} selected. Choose an empty garden square.`);
      render();
    });
    unitCards.appendChild(card);
  });
}

function renderBoard() {
  const chosen = level();
  board.innerHTML = "";
  for (let row = 0; row < chosen.height; row += 1) {
    for (let col = 0; col < chosen.width; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      if (chosen.spawns.includes(row) && col === chosen.width - 1) cell.classList.add("spawn");
      if (chosen.gates.includes(row) && col === 0) cell.classList.add("gate");
      if (chosen.spawns.includes(row)) cell.classList.add("path");
      const label = boardLabel(chosen, row, col);
      if (label) {
        const marker = document.createElement("span");
        marker.className = "cell-label";
        marker.textContent = label;
        cell.appendChild(marker);
      }
      const intent = enemyIntentAt(row, col);
      if (intent) {
        const arrow = document.createElement("span");
        arrow.className = "move-arrow";
        arrow.textContent = intent;
        cell.appendChild(arrow);
      }
      const defender = state.defenders.find((item) => item.row === row && item.col === col);
      const enemy = state.enemies.find((item) => item.row === row && item.col === col);
      if (!defender && !enemy && col < chosen.width - 1) {
        cell.classList.add("placeable");
      }
      cell.addEventListener("click", () => placeDefender(row, col));
      if (defender) cell.appendChild(piece(defender, "defender"));
      if (enemy) cell.appendChild(piece(enemy, "enemy"));
      board.appendChild(cell);
    }
  }
}

function boardLabel(chosen, row, col) {
  if (chosen.gates.includes(row) && col === 0) return "GATE";
  if (chosen.spawns.includes(row) && col === chosen.width - 1) return "START";
  if (col === 0) return `ROW ${row + 1}`;
  return "";
}

function enemyIntentAt(row, col) {
  const enemy = state.enemies.find((item) => item.row === row && item.col === col);
  if (!enemy) return "";
  const blocker = state.defenders.find(
    (defender) => defender.row === enemy.row && defender.col === enemy.col - 1,
  );
  if (blocker) return "ATTACK";
  if (enemy.col === 0) return "GATE!";
  return "<- MOVE";
}

function renderEnemyPlan() {
  if (state.gameOver) {
    enemyPlan.innerHTML = "<strong>Level finished.</strong><p>Restart any time to try a new plan.</p>";
    return;
  }
  if (!state.enemies.length) {
    enemyPlan.innerHTML =
      "<strong>No bad guys on the board.</strong><p>Press End Turn to bring in the next wave.</p>";
    return;
  }
  const plans = state.enemies.map((enemy) => describeEnemyIntent(enemy));
  enemyPlan.innerHTML = `<strong>Bad Guys Next Move</strong><p>${plans.join(" ")}</p>`;
}

function describeEnemyIntent(enemy) {
  const name = ENEMIES[enemy.type].name;
  const blocker = state.defenders.find(
    (defender) => defender.row === enemy.row && defender.col === enemy.col - 1,
  );
  if (blocker) {
    return `${name} in row ${enemy.row + 1} will attack the blocker.`;
  }
  if (enemy.col === 0) {
    return `${name} in row ${enemy.row + 1} will hit the gate.`;
  }
  return `${name} in row ${enemy.row + 1} will move left.`;
}

function piece(item, side) {
  const wrap = document.createElement("div");
  wrap.className = `piece ${side}`;
  wrap.dataset.pieceId = item.id;
  const catalog = side === "enemy" ? ENEMIES[item.type] : UNITS[item.type];
  wrap.innerHTML = `<img src="${catalog.icon}" alt="" /><span class="hp">${item.hp}</span>`;
  wrap.title = `${catalog.name}, ${item.hp} health`;
  return wrap;
}

function placeDefender(row, col) {
  if (state.resolving || state.gameOver) return;
  const chosen = level();
  const unit = UNITS[state.selectedUnit];
  if (col === chosen.width - 1) {
    showMessage("That blue edge is where raiders arrive. Plant closer to the gate.");
    return;
  }
  if (state.seeds < unit.cost) {
    showMessage(`Need ${unit.cost} seeds for ${unit.name}.`);
    return;
  }
  if (state.defenders.some((item) => item.row === row && item.col === col)) {
    showMessage("That square already has a helper.");
    return;
  }
  if (state.enemies.some((item) => item.row === row && item.col === col)) {
    showMessage("A raider is standing there.");
    return;
  }
  const defender = {
    id: `d-${Date.now()}-${Math.random()}`,
    type: state.selectedUnit,
    row,
    col,
    hp: unit.hp,
  };
  state.defenders.push(defender);
  state.placements.push(defender.id);
  state.seeds -= unit.cost;
  playSound("place");
  track("unit_placed", { levelId: chosen.id, unit: state.selectedUnit, row, col });
  showMessage(`${unit.name} is ready. End the turn when you are comfortable.`);
  render();
}

function undoPlacement() {
  if (state.resolving || !state.placements.length || state.gameOver) return;
  const id = state.placements.pop();
  const index = state.defenders.findIndex((item) => item.id === id);
  if (index === -1) return;
  const [removed] = state.defenders.splice(index, 1);
  state.seeds += UNITS[removed.type].cost;
  playSound("undo");
  track("undo_used", { levelId: level().id, unit: removed.type });
  showMessage("Last placement undone. Try another idea.");
  render();
}

function hint() {
  if (state.resolving || state.gameOver) return;
  playSound("hint");
  const danger = state.enemies.find(
    (enemy) =>
      enemy.col <= 2 &&
      !state.defenders.some((defender) => defender.row === enemy.row && defender.col === enemy.col - 1),
  );
  if (danger) {
    track("hint_used", { levelId: level().id, turn: state.turn });
    showMessage(`Hint: row ${danger.row + 1} needs a blocker directly left of the bad guy.`);
    return;
  }
  const lanes = level().spawns.filter((row) => !state.defenders.some((item) => item.row === row));
  const text = lanes.length
    ? `Hint: row ${lanes[0] + 1} is open. A Tater Bunker buys lots of time.`
    : "Hint: Pea Cadets behind Bunkers make a strong team.";
  track("hint_used", { levelId: level().id, turn: state.turn });
  showMessage(text);
}

async function endTurn() {
  if (state.resolving || state.gameOver) return;
  playSound("turn");
  state.resolving = true;
  state.placements = [];
  render();
  showMessage("Resolving turn: helpers act first, then bad guys move.");
  await sleep(250);
  await defendersActAnimated();
  removeDefeatedEnemies();
  render();
  await sleep(220);
  await medicsHealAnimated();
  render();
  await sleep(220);
  await enemiesActAnimated();
  cleanupAfterEnemies();
  track("turn_resolved", {
    levelId: level().id,
    turn: state.turn,
    defenders: state.defenders.length,
    enemies: state.enemies.length,
    stopped: state.stopped,
    gateDamage: state.damageToGate,
  });
  state.resolving = false;
  if (!checkOutcome()) {
    state.turn += 1;
    state.seeds += 2;
    state.placements = [];
    spawnWave();
    showMessage("Turn complete. Bad guys moved left or attacked. You earned 2 seeds.");
  }
  render();
}

function spawnWave() {
  const chosen = level();
  const wave = chosen.waves[state.waveIndex] || [];
  wave.forEach((enemy) => {
    const type = ENEMIES[enemy.type];
    if (!state.enemies.some((item) => item.row === enemy.row && item.col === chosen.width - 1)) {
      state.enemies.push({
        id: `e-${state.turn}-${enemy.row}-${enemy.type}`,
        type: enemy.type,
        row: enemy.row,
        col: chosen.width - 1,
        hp: type.hp,
      });
    }
  });
  if (state.waveIndex < chosen.waves.length) state.waveIndex += 1;
}

async function defendersActAnimated() {
  let acted = false;
  for (const defender of state.defenders) {
    const unit = UNITS[defender.type];
    if (!unit.damage) continue;
    const targets = state.enemies
      .filter((enemy) => enemy.hp > 0 && enemy.row === defender.row && enemy.col > defender.col)
      .filter((enemy) => enemy.col - defender.col <= unit.range)
      .sort((a, b) => a.col - b.col);
    if (targets[0]) {
      acted = true;
      showMessage(`${unit.name} shoots ${ENEMIES[targets[0].type].name}!`);
      playSound(unit.type === "tank" ? "tankShot" : "shot");
      await animateShot(defender, targets[0], unit.damage);
      targets[0].hp -= unit.damage;
      render();
      await sleep(220);
    }
  }
  if (!acted) await sleep(180);
}

async function medicsHealAnimated() {
  let healed = false;
  for (const medic of state.defenders.filter((defender) => defender.type === "medic")) {
    const friend = state.defenders.find((defender) => {
      const near = Math.abs(defender.row - medic.row) + Math.abs(defender.col - medic.col);
      return defender.id !== medic.id && near <= 1 && defender.hp < UNITS[defender.type].hp;
    });
    if (friend) {
      healed = true;
      showMessage("Sun Medic heals a helper.");
      playSound("heal");
      await animateHeal(medic, friend);
      friend.hp += 1;
      render();
      await sleep(220);
    }
  }
  if (!healed) await sleep(120);
}

async function enemiesActAnimated() {
  for (const enemy of state.enemies.slice().sort((a, b) => a.col - b.col)) {
    if (enemy.hp <= 0 || enemy.escaped) continue;
    const type = ENEMIES[enemy.type];
    const blocker = state.defenders.find(
      (defender) => defender.row === enemy.row && defender.col === enemy.col - 1,
    );
    if (blocker) {
      showMessage(`${type.name} attacks the blocker instead of moving.`);
      playSound("attack");
      await animateAttack(enemy, blocker);
      blocker.hp -= type.damage;
      render();
      await sleep(240);
      continue;
    }
    const from = { row: enemy.row, col: enemy.col };
    const to = { row: enemy.row, col: enemy.col - type.speed };
    showMessage(to.col < 0 ? `${type.name} reaches the gate!` : `${type.name} moves left.`);
    playSound(to.col < 0 ? "gate" : "move");
    await animateMove(enemy, from, to);
    enemy.col = to.col;
    if (enemy.col < 0) {
      enemy.escaped = true;
      state.damageToGate += 1;
    }
    render();
    await sleep(180);
  }
}

function removeDefeatedEnemies() {
  const defeatedEnemies = state.enemies.filter((enemy) => enemy.hp <= 0).length;
  state.stopped += defeatedEnemies;
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

function cleanupAfterEnemies() {
  removeDefeatedEnemies();
  state.enemies = state.enemies.filter((enemy) => !enemy.escaped);
  state.defenders = state.defenders.filter((defender) => defender.hp > 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cellAt(row, col) {
  return board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function cellCenter(row, col) {
  const cell = cellAt(row, col);
  const boardRect = board.getBoundingClientRect();
  const rect = cell.getBoundingClientRect();
  return {
    x: rect.left - boardRect.left + rect.width / 2,
    y: rect.top - boardRect.top + rect.height / 2,
  };
}

function animateShot(defender, target, damage) {
  const start = cellCenter(defender.row, defender.col);
  const end = cellCenter(target.row, target.col);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const beam = document.createElement("div");
  beam.className = "shot-beam";
  beam.style.left = `${start.x}px`;
  beam.style.top = `${start.y - 4}px`;
  beam.style.width = `${Math.hypot(dx, dy)}px`;
  beam.style.setProperty("--beam-angle", `${Math.atan2(dy, dx)}rad`);
  board.appendChild(beam);
  const burst = cellAt(target.row, target.col).appendChild(document.createElement("span"));
  burst.className = "damage-pop";
  burst.textContent = `-${damage}`;
  return sleep(420).then(() => {
    beam.remove();
    burst.remove();
  });
}

function animateHeal(medic, friend) {
  const start = cellCenter(medic.row, medic.col);
  const end = cellCenter(friend.row, friend.col);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const beam = document.createElement("div");
  beam.className = "heal-beam";
  beam.style.left = `${start.x}px`;
  beam.style.top = `${start.y - 4}px`;
  beam.style.width = `${Math.hypot(dx, dy)}px`;
  beam.style.setProperty("--beam-angle", `${Math.atan2(dy, dx)}rad`);
  board.appendChild(beam);
  const ring = cellAt(friend.row, friend.col).appendChild(document.createElement("span"));
  ring.className = "heal-ring";
  ring.textContent = "+1";
  return sleep(460).then(() => {
    beam.remove();
    ring.remove();
  });
}

function animateAttack(enemy, blocker) {
  const attacker = board.querySelector(`[data-piece-id="${enemy.id}"]`);
  const targetCell = cellAt(blocker.row, blocker.col);
  if (attacker) attacker.classList.add("bump-left");
  const burst = targetCell.appendChild(document.createElement("span"));
  burst.className = "damage-pop";
  burst.textContent = `-${ENEMIES[enemy.type].damage}`;
  return sleep(420).then(() => {
    if (attacker) attacker.classList.remove("bump-left");
    burst.remove();
  });
}

function animateMove(enemy, from, to) {
  const fromCell = cellAt(from.row, from.col);
  const pieceNode = board.querySelector(`[data-piece-id="${enemy.id}"]`);
  const fromRect = fromCell.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const targetCell = to.col >= 0 ? cellAt(to.row, to.col) : cellAt(to.row, 0);
  const targetRect = targetCell.getBoundingClientRect();
  if (pieceNode) pieceNode.classList.add("ghost-source");
  const ghost = document.createElement("div");
  ghost.className = "move-ghost piece enemy";
  ghost.innerHTML = `<img src="${ENEMIES[enemy.type].icon}" alt="" /><span class="hp">${enemy.hp}</span>`;
  ghost.style.left = `${fromRect.left - boardRect.left + 6}px`;
  ghost.style.top = `${fromRect.top - boardRect.top + 6}px`;
  ghost.style.width = `${fromRect.width - 12}px`;
  ghost.style.height = `${fromRect.height - 12}px`;
  board.appendChild(ghost);
  const dx = targetRect.left - fromRect.left;
  const dy = targetRect.top - fromRect.top;
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  return sleep(520).then(() => {
    ghost.remove();
    if (pieceNode) pieceNode.classList.remove("ghost-source");
  });
}

function checkOutcome() {
  const chosen = level();
  if (state.damageToGate >= 3) {
    state.gameOver = true;
    track("level_failed", { levelId: chosen.id, turns: state.turn, gateDamage: state.damageToGate });
    playSound("loss");
    showMessage("The snack gate got bonked three times. Restart and try more blockers.");
    return true;
  }
  const wavesDone = state.waveIndex >= chosen.waves.length;
  if (wavesDone && state.enemies.length === 0) {
    state.gameOver = true;
    track("level_complete", { levelId: chosen.id, turns: state.turn, stopped: state.stopped });
    playSound("win");
    if (state.levelIndex < LEVELS.length - 1) {
      showMessage("Garden saved. Starting the next mission.");
      setTimeout(() => beginLevel(state.levelIndex + 1), 1200);
    } else {
      showMessage("Victory garden secured. Excellent planning.");
    }
    return true;
  }
  return false;
}

function restart() {
  playSound("restart");
  track("restart_level", { levelId: level().id, turn: state.turn });
  beginLevel(state.levelIndex);
}

function toggleSound() {
  audio.enabled = !audio.enabled;
  localStorage.setItem("gardenGuardSound", audio.enabled ? "on" : "off");
  if (audio.enabled) playSound("toggle");
  render();
}

function ensureAudio() {
  if (!audio.enabled) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audio.context) audio.context = new AudioContext();
  if (audio.context.state === "suspended") audio.context.resume();
  return audio.context;
}

function playSound(name) {
  const context = ensureAudio();
  if (!context) return;
  const now = context.currentTime;
  const patterns = {
    select: [[440, 0, 0.06, "triangle", 0.035]],
    place: [[330, 0, 0.08, "triangle", 0.045], [494, 0.07, 0.09, "triangle", 0.04]],
    undo: [[360, 0, 0.06, "sine", 0.035], [260, 0.06, 0.08, "sine", 0.03]],
    hint: [[660, 0, 0.07, "sine", 0.03], [880, 0.08, 0.08, "sine", 0.025]],
    turn: [[220, 0, 0.08, "square", 0.025], [330, 0.08, 0.08, "square", 0.025]],
    shot: [[740, 0, 0.08, "square", 0.035], [560, 0.05, 0.07, "square", 0.025]],
    tankShot: [[190, 0, 0.1, "sawtooth", 0.045], [120, 0.08, 0.08, "sawtooth", 0.035]],
    heal: [[523, 0, 0.09, "sine", 0.035], [659, 0.08, 0.09, "sine", 0.03], [784, 0.16, 0.11, "sine", 0.025]],
    attack: [[150, 0, 0.1, "sawtooth", 0.04], [95, 0.08, 0.12, "sawtooth", 0.035]],
    move: [[210, 0, 0.07, "triangle", 0.025], [180, 0.07, 0.07, "triangle", 0.02]],
    gate: [[90, 0, 0.18, "sawtooth", 0.045]],
    win: [[392, 0, 0.09, "triangle", 0.035], [523, 0.09, 0.1, "triangle", 0.035], [659, 0.18, 0.16, "triangle", 0.03]],
    loss: [[220, 0, 0.12, "sine", 0.035], [165, 0.12, 0.14, "sine", 0.03], [110, 0.26, 0.2, "sine", 0.025]],
    restart: [[260, 0, 0.06, "triangle", 0.03], [330, 0.07, 0.08, "triangle", 0.03]],
    toggle: [[523, 0, 0.08, "sine", 0.035], [698, 0.08, 0.1, "sine", 0.03]],
  };
  (patterns[name] || patterns.select).forEach(([frequency, delay, duration, type, volume]) => {
    playTone(context, now + delay, frequency, duration, type, volume);
  });
}

function playTone(context, start, frequency, duration, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

nextTurnBtn.addEventListener("click", endTurn);
soundBtn.addEventListener("click", toggleSound);
undoBtn.addEventListener("click", undoPlacement);
hintBtn.addEventListener("click", hint);
restartBtn.addEventListener("click", restart);

track("session_start", { userAgent: navigator.userAgent });
beginLevel(0);
refreshTelemetry();
