/* Immortal Fly Swarm
 * Inspired by the Google Research × HHMI Janelia adult male fruit fly connectome.
 *
 * Rules of the world:
 *   - Food capacity scales with market cap: cap = sqrt(mcap / 1000).
 *   - Every fly is immortal. When hungry it slows and dims; when it eats it wakes.
 *   - Queens (♛) periodically mate, spend food, and lay eggs.
 *   - Eggs → larvae → workers. Rare workers ascend to queens as the swarm grows.
 *   - The neural haze is a soft connectome — nearby individuals link, echoing the
 *     ~166k neurons mapped in the fruit fly brain.
 */

(() => {
  "use strict";

  const canvas = document.getElementById("swarm");
  const ctx = canvas.getContext("2d", { alpha: true });
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- state ----------
  const state = {
    running: true,
    marketCap: 100000,
    foodCapacity: 0,
    foodRegenPerSec: 0,
    generation: 1,
    tickCount: 0,
    lastMcapFetch: 0,
  };

  const flies = [];   // queens + workers
  const eggs = [];    // eggs / larvae
  const foods = [];   // food pellets

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (a, b) => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  };

  function computeFoodEconomy() {
    const cap = Math.max(6, Math.floor(Math.sqrt(state.marketCap / 1000)));
    state.foodCapacity = cap;
    // Regeneration: gently trickle food based on mcap magnitude.
    state.foodRegenPerSec = clamp(cap / 40, 0.15, 8);
  }

  function spawnFood(n = 1) {
    for (let i = 0; i < n; i++) {
      if (foods.length >= state.foodCapacity) return;
      foods.push({
        x: rand(40, W - 40),
        y: rand(40, H - 40),
        r: rand(2.4, 3.6),
        e: rand(0.9, 1.4),           // energy
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function makeFly(x, y, opts = {}) {
    return {
      x, y,
      vx: rand(-0.6, 0.6),
      vy: rand(-0.6, 0.6),
      role: opts.role || "worker",   // "queen" | "worker"
      energy: opts.energy ?? rand(0.6, 1.0),
      age: 0,
      size: opts.role === "queen" ? rand(3.6, 4.4) : rand(1.9, 2.6),
      hue: opts.role === "queen" ? 45 : 200 + rand(-15, 25),
      wing: Math.random() * Math.PI * 2,
      matingCooldown: opts.role === "queen" ? rand(3, 6) : 0,
      target: null,
      gen: opts.gen ?? state.generation,
    };
  }

  function makeEgg(x, y, gen) {
    return {
      x, y,
      vx: rand(-0.15, 0.15),
      vy: rand(-0.15, 0.15),
      stage: 0,          // 0..1 → hatch when >=1
      hatchIn: rand(6, 10),
      elapsed: 0,
      gen,
    };
  }

  function reset() {
    flies.length = 0;
    eggs.length = 0;
    foods.length = 0;
    state.generation = 1;
    state.tickCount = 0;
    // Founding queen at center.
    flies.push(makeFly(W / 2, H / 2, { role: "queen", energy: 1, gen: 1 }));
    computeFoodEconomy();
    spawnFood(Math.floor(state.foodCapacity * 0.6));
  }

  // ---------- market cap fetching ----------
  async function fetchMarketCap(address) {
    if (!address) return null;
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.pairs || !data.pairs.length) return null;
      // pick pair with highest liquidity
      const best = data.pairs.reduce((a, b) =>
        (b.liquidity?.usd || 0) > (a.liquidity?.usd || 0) ? b : a
      );
      const mc = best.marketCap || best.fdv;
      return typeof mc === "number" ? mc : null;
    } catch (e) {
      console.warn("mcap fetch failed", e);
      return null;
    }
  }

  // ---------- simulation ----------
  function step(dt) {
    state.tickCount += dt;

    // Regenerate food based on market cap magnitude.
    if (Math.random() < state.foodRegenPerSec * dt) spawnFood(1);

    // Update foods (gentle pulse).
    for (const f of foods) f.pulse += dt * 2.4;

    // Update eggs.
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i];
      e.elapsed += dt;
      e.x += e.vx; e.y += e.vy;
      e.vx *= 0.98; e.vy *= 0.98;
      e.stage = clamp(e.elapsed / e.hatchIn, 0, 1);
      if (e.stage >= 1) {
        eggs.splice(i, 1);
        // 3% chance to hatch as a new queen once swarm has plenty of food.
        const canBeQueen = flies.length > 30 && Math.random() < 0.03;
        flies.push(makeFly(e.x, e.y, {
          role: canBeQueen ? "queen" : "worker",
          energy: 0.7,
          gen: e.gen,
        }));
      }
    }

    // Update flies.
    for (const f of flies) {
      f.age += dt;
      f.wing += dt * (14 + f.energy * 10);

      // Hunger drain.
      f.energy -= dt * (f.role === "queen" ? 0.035 : 0.025);
      if (f.energy < 0) f.energy = 0;

      // Behaviour: seek nearest food when hungry, otherwise wander / gather.
      let ax = 0, ay = 0;
      const wantsFood = f.energy < 0.85 && foods.length;

      if (wantsFood) {
        // find nearest food
        let best = null, bestD = Infinity;
        for (const fd of foods) {
          const d = dist2(f, fd);
          if (d < bestD) { bestD = d; best = fd; }
        }
        if (best) {
          const dx = best.x - f.x, dy = best.y - f.y;
          const d = Math.sqrt(bestD) || 1;
          ax += (dx / d) * 0.05;
          ay += (dy / d) * 0.05;
          // eat if very close
          if (bestD < (best.r + f.size + 3) ** 2) {
            f.energy = clamp(f.energy + best.e, 0, 1.4);
            const idx = foods.indexOf(best);
            if (idx >= 0) foods.splice(idx, 1);
          }
        }
      } else {
        // Flocking-ish drift: cohesion toward center-of-mass of nearby swarm.
        let cx = 0, cy = 0, n = 0;
        for (const g of flies) {
          if (g === f) continue;
          const d = dist2(f, g);
          if (d < 90 * 90) { cx += g.x; cy += g.y; n++; }
          if (d < 22 * 22 && d > 0) {
            // separation
            const dx = f.x - g.x, dy = f.y - g.y;
            ax += dx * 0.0025;
            ay += dy * 0.0025;
          }
        }
        if (n) {
          ax += ((cx / n) - f.x) * 0.00035;
          ay += ((cy / n) - f.y) * 0.00035;
        }
        // gentle random wander
        ax += rand(-0.03, 0.03);
        ay += rand(-0.03, 0.03);
      }

      // Immortality: when starving, drift very slowly and dim, but never die.
      const activity = f.energy < 0.05 ? 0.05 : 1;

      f.vx = (f.vx + ax) * (0.94 + 0.04 * activity);
      f.vy = (f.vy + ay) * (0.94 + 0.04 * activity);

      // Speed cap.
      const speedCap = (f.role === "queen" ? 1.4 : 2.2) * activity;
      const sp = Math.hypot(f.vx, f.vy);
      if (sp > speedCap) { f.vx = f.vx / sp * speedCap; f.vy = f.vy / sp * speedCap; }

      f.x += f.vx;
      f.y += f.vy;

      // Soft bounds — wrap around the edges.
      if (f.x < -10) f.x = W + 10;
      if (f.x > W + 10) f.x = -10;
      if (f.y < -10) f.y = H + 10;
      if (f.y > H + 10) f.y = -10;

      // Queen reproduction.
      if (f.role === "queen") {
        f.matingCooldown -= dt;
        if (f.matingCooldown <= 0 && f.energy > 0.75 && flies.length < 600) {
          // find a nearby worker as mate
          let mate = null, mateD = Infinity;
          for (const g of flies) {
            if (g === f || g.role !== "worker") continue;
            const d = dist2(f, g);
            if (d < mateD && d < 60 * 60) { mateD = d; mate = g; }
          }
          if (mate || flies.length === 1) {
            const clutch = 2 + Math.floor(Math.random() * 3); // 2..4 eggs
            for (let k = 0; k < clutch; k++) {
              eggs.push(makeEgg(f.x + rand(-8, 8), f.y + rand(-8, 8), state.generation + 1));
            }
            f.energy -= 0.35;
            f.matingCooldown = rand(5, 8);
            state.generation = Math.max(state.generation, state.generation + 0); // set below
          }
        }
      }
    }

    // Bump generation counter if eggs of a higher generation ever hatched.
    let maxGen = 1;
    for (const f of flies) if (f.gen > maxGen) maxGen = f.gen;
    for (const e of eggs) if (e.gen > maxGen) maxGen = e.gen;
    state.generation = maxGen;
  }

  // ---------- rendering ----------
  function drawBackground() {
    ctx.fillStyle = "rgba(5, 7, 13, 0.35)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawConnectome() {
    // draw soft neural connections between close flies
    ctx.lineWidth = 1;
    for (let i = 0; i < flies.length; i++) {
      const a = flies[i];
      for (let j = i + 1; j < flies.length; j++) {
        const b = flies[j];
        const d2 = dist2(a, b);
        if (d2 < 110 * 110) {
          const alpha = (1 - d2 / (110 * 110)) * 0.12;
          ctx.strokeStyle = `rgba(154, 220, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function drawFood() {
    for (const f of foods) {
      const pulse = 0.6 + 0.4 * Math.sin(f.pulse);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
      g.addColorStop(0, `rgba(124, 249, 193, ${0.65 * pulse})`);
      g.addColorStop(1, "rgba(124, 249, 193, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#c8ffe6";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEggs() {
    for (const e of eggs) {
      const s = 1.6 + e.stage * 2.2;
      ctx.fillStyle = `rgba(208, 179, 255, ${0.5 + 0.5 * e.stage})`;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, s * 0.7, s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFly(f) {
    const angle = Math.atan2(f.vy, f.vx);
    const size = f.size;
    const dim = f.energy < 0.05 ? 0.35 : 1;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(angle);

    // Wing flap.
    const wingSpread = Math.abs(Math.sin(f.wing)) * size * 1.2 + size * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.18 * dim})`;
    ctx.beginPath();
    ctx.ellipse(-size * 0.2, -wingSpread * 0.55, size * 1.3, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-size * 0.2,  wingSpread * 0.55, size * 1.3, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body glow.
    const color = f.role === "queen"
      ? `hsla(45, 100%, 65%, ${dim})`
      : `hsla(${f.hue}, 90%, 70%, ${dim})`;
    const glow = f.role === "queen" ? "rgba(255, 209, 102, 0.55)" : "rgba(154, 220, 255, 0.45)";

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 4);
    g.addColorStop(0, glow);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, size * 4, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 1.4, size * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head.
    ctx.fillStyle = f.role === "queen" ? "#fff2c8" : "#eaf7ff";
    ctx.beginPath();
    ctx.arc(size * 1.1, 0, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Queen crown mark.
    if (f.role === "queen") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function render() {
    drawBackground();
    drawConnectome();
    drawFood();
    drawEggs();
    for (const f of flies) drawFly(f);
  }

  // ---------- UI ----------
  const ui = {
    ca: document.getElementById("ca"),
    fetchBtn: document.getElementById("fetchBtn"),
    mcap: document.getElementById("mcap"),
    playBtn: document.getElementById("playBtn"),
    resetBtn: document.getElementById("resetBtn"),
    feedBtn: document.getElementById("feedBtn"),
    stPop: document.getElementById("stPop"),
    stGen: document.getElementById("stGen"),
    stFood: document.getElementById("stFood"),
    stQueens: document.getElementById("stQueens"),
    stEggs: document.getElementById("stEggs"),
    stMcap: document.getElementById("stMcap"),
    matePeriod: document.getElementById("matePeriod"),
  };

  ui.mcap.addEventListener("input", () => {
    const v = parseFloat(ui.mcap.value);
    if (!isNaN(v) && v >= 0) {
      state.marketCap = v;
      computeFoodEconomy();
    }
  });

  ui.playBtn.addEventListener("click", () => {
    state.running = !state.running;
    ui.playBtn.textContent = state.running ? "▮▮ 暂停" : "▶  继续";
    ui.playBtn.classList.toggle("primary", state.running);
  });

  ui.resetBtn.addEventListener("click", reset);

  ui.feedBtn.addEventListener("click", () => spawnFood(Math.ceil(state.foodCapacity * 0.4)));

  ui.fetchBtn.addEventListener("click", async () => {
    const addr = ui.ca.value.trim();
    if (!addr) return;
    ui.fetchBtn.textContent = "拉取中…";
    ui.fetchBtn.disabled = true;
    const mc = await fetchMarketCap(addr);
    ui.fetchBtn.disabled = false;
    ui.fetchBtn.textContent = "拉取市值";
    if (mc == null) {
      ui.fetchBtn.textContent = "未找到";
      setTimeout(() => (ui.fetchBtn.textContent = "拉取市值"), 1400);
      return;
    }
    state.marketCap = mc;
    ui.mcap.value = Math.round(mc);
    computeFoodEconomy();
  });

  function updateHUD() {
    let queens = 0;
    for (const f of flies) if (f.role === "queen") queens++;
    ui.stPop.textContent = flies.length.toString();
    ui.stGen.textContent = state.generation.toString();
    ui.stFood.textContent = `${foods.length}/${state.foodCapacity}`;
    ui.stQueens.textContent = queens.toString();
    ui.stEggs.textContent = eggs.length.toString();
    ui.stMcap.textContent = "$" + Math.round(state.marketCap).toLocaleString();
  }

  // ---------- main loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.running) step(dt);
    render();
    updateHUD();
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
