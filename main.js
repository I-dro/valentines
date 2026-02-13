/* ╔══════════════════════════════════════════════════════════════╗
   ║  Valentine's Day – Main Logic                               ║
   ║  • tsParticles heart/sparkle field                          ║
   ║  • Cursor trail                                             ║
   ║  • Runaway "No" button (desktop push + mobile teleport)     ║
   ║  • "Yes" celebration (confetti + scene swap)                ║
   ╚══════════════════════════════════════════════════════════════╝ */

(function () {
  "use strict";

  // ───────── DOM refs ─────────
  const btnYes        = document.getElementById("btn-yes");
  const btnNo         = document.getElementById("btn-no");
  const heroCard      = document.getElementById("hero-card");
  const mainScene     = document.getElementById("main-scene");
  const successScene  = document.getElementById("success-scene");
  const promptText    = document.getElementById("prompt-text");
  const subText       = document.getElementById("sub-text");
  const buttonRow     = document.getElementById("button-row");
  const attemptCounter= document.getElementById("attempt-counter");
  const chibiYou      = document.getElementById("chibi-you");
  const chibiAlly     = document.getElementById("chibi-ally");
  const chibiContainer= document.getElementById("chibi-container");
  const chibiTogether = document.getElementById("chibi-together");
  const cursorTrail   = document.getElementById("cursor-trail");

  // ───────── State ─────────
  let noAttempts = 0;
  let noBtnActive = false;   // true once it enters "runaway" mode
  let noBtnX = 0;
  let noBtnY = 0;
  // Detect touch by the actual event, not device capability (MacBooks report touch support)
  let lastPointerType = "mouse";

  const noTexts = [
    "No 😢",
    "Are you sure? 🥺",
    "Really?? 😭",
    "Pookie please! 💔",
    "I'll be sad... 😿",
    "Think again! 🥹",
    "Pretty please? 🌹",
    "Don't do this! 😩",
    "Last chance... 💕",
    "NOOO come on!! 😫",
  ];

  // ═══════════════════════════════════════════════════
  //  Layer 2: tsParticles — hearts + sparkles
  // ═══════════════════════════════════════════════════
  function initParticles() {
    if (typeof tsParticles === "undefined") return;

    tsParticles.load("tsparticles", {
      fullScreen: false,
      fpsLimit: 60,
      particles: {
        number: { value: 22, density: { enable: true, area: 900 } },
        color: { value: ["#f48fb1", "#e91e63", "#ce93d8", "#f8bbd0", "#ff80ab"] },
        shape: {
          type: ["heart", "circle"],
        },
        opacity: {
          value: { min: 0.15, max: 0.5 },
          animation: { enable: true, speed: 0.5, minimumValue: 0.1, sync: false },
        },
        size: {
          value: { min: 4, max: 14 },
          animation: { enable: true, speed: 1.5, minimumValue: 3, sync: false },
        },
        move: {
          enable: true,
          speed: { min: 0.3, max: 0.8 },
          direction: "top",
          outModes: { default: "out" },
          drift: { min: -0.4, max: 0.4 },
        },
        wobble: { enable: true, distance: 6, speed: 3 },
        tilt: { enable: true, direction: "random", value: { min: 0, max: 360 }, animation: { enable: true, speed: 4 } },
      },
      detectRetina: true,
    });
  }

  // ═══════════════════════════════════════════════════
  //  Layer 5: Cursor / tap trail
  // ═══════════════════════════════════════════════════
  const trailEmojis = ["💕", "✨", "💖", "🌸", "💗"];
  let trailThrottle = 0;

  function spawnTrail(x, y) {
    const now = Date.now();
    if (now - trailThrottle < 80) return;
    trailThrottle = now;

    const el = document.createElement("span");
    el.className = "trail-particle";
    el.textContent = trailEmojis[Math.floor(Math.random() * trailEmojis.length)];
    el.style.left = x + "px";
    el.style.top = y + "px";
    cursorTrail.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  document.addEventListener("pointermove", (e) => {
    lastPointerType = e.pointerType;
    if (e.pointerType !== "touch") {
      cursorX = e.clientX;
      cursorY = e.clientY;
      spawnTrail(e.clientX, e.clientY);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    lastPointerType = e.pointerType;
    if (e.pointerType === "touch") spawnTrail(e.clientX, e.clientY);
  });

  // ═══════════════════════════════════════════════════
  //  Runaway "No" button  (smooth physics-based flee)
  //
  //  The physics loop runs from page load, watching the
  //  cursor's distance to the button. On desktop (mouse)
  //  the button smoothly accelerates away as the cursor
  //  approaches. On touch it teleports to a random spot.
  // ═══════════════════════════════════════════════════
  const DETECT_RADIUS    = 200;  // px — flee when cursor is this close to button center
  const BASE_FLEE_ACCEL  = 1.8;  // px/frame² base acceleration
  const BASE_MAX_SPEED   = 16;   // px/frame base cap
  const FRICTION         = 0.92; // velocity damping each frame (0–1; higher = slipperier)
  const MARGIN           = 20;   // px from viewport edges

  // These scale up with noAttempts
  let fleeAccel = BASE_FLEE_ACCEL;
  let maxSpeed  = BASE_MAX_SPEED;

  let velX = 0;
  let velY = 0;
  let cursorX = -9999;
  let cursorY = -9999;
  let wiggleTimeout = null;

  // Corner-stuck detection
  let stuckSince = 0;            // timestamp when button first got pinned to an edge
  const STUCK_THRESHOLD = 800;   // ms — escape-kick after this long on an edge
  const ESCAPE_KICK     = 35;    // px/frame impulse toward center

  /** Promote the button from flow layout to fixed positioning so it can roam the page.
   *  IMPORTANT: .hero-card has backdrop-filter which creates a containing block,
   *  trapping position:fixed children. So we physically move the button to <body>. */
  function activateRunaway() {
    if (noBtnActive) return;
    noBtnActive = true;

    // Snapshot where it is right now in the viewport
    const rect = btnNo.getBoundingClientRect();
    noBtnX = rect.left;
    noBtnY = rect.top;

    // Move to <body> so it escapes the card's containing block + overflow:hidden
    document.body.appendChild(btnNo);
    btnNo.classList.add("runaway");
    btnNo.style.left = noBtnX + "px";
    btnNo.style.top  = noBtnY + "px";
  }

  function clampPos(x, y) {
    const bw = btnNo.offsetWidth;
    const bh = btnNo.offsetHeight;
    x = Math.max(MARGIN, Math.min(window.innerWidth  - bw - MARGIN, x));
    y = Math.max(MARGIN, Math.min(window.innerHeight - bh - MARGIN, y));
    return { x, y };
  }

  function triggerWiggle() {
    if (wiggleTimeout) return; // already wiggling
    btnNo.classList.add("wiggle");
    wiggleTimeout = setTimeout(() => {
      btnNo.classList.remove("wiggle");
      wiggleTimeout = null;
    }, 300);
  }

  /**
   * Physics loop — runs every frame from page load.
   * Before activation it watches for cursor proximity and activates.
   * After activation it applies flee forces.
   */
  function physicsLoop() {
    // --- Pre-activation: detect cursor approaching the button's flow position ---
    if (!noBtnActive) {
      const rect = btnNo.getBoundingClientRect();
      const bcx = rect.left + rect.width / 2;
      const bcy = rect.top  + rect.height / 2;
      const dx = bcx - cursorX;
      const dy = bcy - cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < DETECT_RADIUS && dist > 0) {
        activateRunaway();
        recordNoAttempt();
      }

      requestAnimationFrame(physicsLoop);
      return;
    }

    // --- Post-activation: flee from cursor ---
    const bw = btnNo.offsetWidth;
    const bh = btnNo.offsetHeight;
    const cx = noBtnX + bw / 2;
    const cy = noBtnY + bh / 2;
    const dx = cx - cursorX;
    const dy = cy - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DETECT_RADIUS && dist > 0) {
      // Strength ramps up as cursor gets closer (quadratic for snappier feel)
      const t = 1 - dist / DETECT_RADIUS;          // 0 → edge,  1 → dead-center
      const strength = fleeAccel * (t * t + 0.3);   // scales with attempts
      const angle = Math.atan2(dy, dx);
      velX += Math.cos(angle) * strength;
      velY += Math.sin(angle) * strength;

      triggerWiggle();
    }

    // Clamp speed (cap scales with attempts)
    const speed = Math.sqrt(velX * velX + velY * velY);
    if (speed > maxSpeed) {
      velX = (velX / speed) * maxSpeed;
      velY = (velY / speed) * maxSpeed;
    }

    // Apply friction
    velX *= FRICTION;
    velY *= FRICTION;

    // Only update DOM if there's meaningful movement
    if (Math.abs(velX) > 0.1 || Math.abs(velY) > 0.1) {
      noBtnX += velX;
      noBtnY += velY;

      // Bounce off viewport edges
      const clamped = clampPos(noBtnX, noBtnY);
      const hitEdgeX = clamped.x !== noBtnX;
      const hitEdgeY = clamped.y !== noBtnY;
      if (hitEdgeX) velX *= -0.4;
      if (hitEdgeY) velY *= -0.4;
      noBtnX = clamped.x;
      noBtnY = clamped.y;

      // ── Corner/edge stuck detection ──
      const atEdge = hitEdgeX || hitEdgeY ||
        noBtnX <= MARGIN + 1 ||
        noBtnY <= MARGIN + 1 ||
        noBtnX >= window.innerWidth  - btnNo.offsetWidth  - MARGIN - 1 ||
        noBtnY >= window.innerHeight - btnNo.offsetHeight - MARGIN - 1;

      if (atEdge && dist < DETECT_RADIUS) {
        // Cursor is nearby AND button is on an edge → start/continue stuck timer
        if (stuckSince === 0) stuckSince = performance.now();

        if (performance.now() - stuckSince > STUCK_THRESHOLD) {
          // Escape kick! Launch toward the viewport center
          const vcx = window.innerWidth  / 2;
          const vcy = window.innerHeight / 2;
          const toCenterX = vcx - (noBtnX + bw / 2);
          const toCenterY = vcy - (noBtnY + bh / 2);
          const toDist = Math.max(1, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY));
          const kick = ESCAPE_KICK * (1 + noAttempts * 0.15); // scales with attempts too
          velX = (toCenterX / toDist) * kick;
          velY = (toCenterY / toDist) * kick;
          stuckSince = 0; // reset timer
        }
      } else {
        stuckSince = 0; // not stuck, reset
      }

      btnNo.style.left = noBtnX + "px";
      btnNo.style.top  = noBtnY + "px";
    } else {
      // Button is nearly stationary — check if it's parked on an edge with cursor nearby
      const atEdgeIdle =
        noBtnX <= MARGIN + 1 ||
        noBtnY <= MARGIN + 1 ||
        noBtnX >= window.innerWidth  - btnNo.offsetWidth  - MARGIN - 1 ||
        noBtnY >= window.innerHeight - btnNo.offsetHeight - MARGIN - 1;

      if (atEdgeIdle && dist < DETECT_RADIUS * 1.5) {
        if (stuckSince === 0) stuckSince = performance.now();
        if (performance.now() - stuckSince > STUCK_THRESHOLD) {
          const vcx = window.innerWidth  / 2;
          const vcy = window.innerHeight / 2;
          const toCenterX = vcx - (noBtnX + btnNo.offsetWidth / 2);
          const toCenterY = vcy - (noBtnY + btnNo.offsetHeight / 2);
          const toDist = Math.max(1, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY));
          const kick = ESCAPE_KICK * (1 + noAttempts * 0.15);
          velX = (toCenterX / toDist) * kick;
          velY = (toCenterY / toDist) * kick;
          stuckSince = 0;
        }
      } else {
        stuckSince = 0;
      }
    }

    requestAnimationFrame(physicsLoop);
  }

  // Start the loop immediately (it's cheap when idle)
  requestAnimationFrame(physicsLoop);

  /** Teleport to a random spot (for touch / fallback) */
  function teleportNo() {
    if (!noBtnActive) activateRunaway();
    const bw = btnNo.offsetWidth;
    const bh = btnNo.offsetHeight;
    noBtnX = MARGIN + Math.random() * (window.innerWidth  - bw - 2 * MARGIN);
    noBtnY = MARGIN + Math.random() * (window.innerHeight - bh - 2 * MARGIN);
    const clamped = clampPos(noBtnX, noBtnY);
    noBtnX = clamped.x;
    noBtnY = clamped.y;
    velX = 0;
    velY = 0;
    btnNo.style.left = noBtnX + "px";
    btnNo.style.top  = noBtnY + "px";

    triggerWiggle();
  }

  // (cursor position is tracked in the pointermove listener above, near the trail code)

  // Touch tap on "No" → teleport + record
  btnNo.addEventListener("pointerdown", (e) => {
    lastPointerType = e.pointerType;
    if (e.pointerType === "touch") {
      recordNoAttempt();
      teleportNo();
    }
  });

  // Click on "No" — desktop: big velocity kick; touch: teleport (already handled above)
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    if (lastPointerType === "touch") {
      // Already handled in pointerdown
      return;
    }
    // Desktop click (if they somehow manage to click it) — big kick
    recordNoAttempt();
    const bw = btnNo.offsetWidth;
    const bh = btnNo.offsetHeight;
    const cx = noBtnX + bw / 2;
    const cy = noBtnY + bh / 2;
    const dx = cx - cursorX;
    const dy = cy - cursorY;
    const angle = Math.atan2(dy, dx);
    velX += Math.cos(angle) * 50;
    velY += Math.sin(angle) * 50;
  });

  // ───────── Chibi sadness refs ─────────
  const youMouth    = document.getElementById("you-mouth");
  const youTears    = document.getElementById("you-tears");
  const youBrowL    = document.getElementById("you-brow-l");
  const youBrowR    = document.getElementById("you-brow-r");
  const youSparkleL = document.getElementById("you-sparkle-l");
  const youSparkleR = document.getElementById("you-sparkle-r");
  const youEyes     = document.getElementById("you-eyes");
  const waveArm     = chibiYou ? chibiYou.querySelector(".wave-arm") : null;

  /**
   * Sadness levels based on noAttempts:
   *  0   → 😊  happy smile, waving, sparkly eyes
   *  1-2 → 😐  neutral mouth, stops waving
   *  3-4 → 🙁  slight frown, worried brows
   *  5-6 → 😢  bigger frown, tears start, brows angled more
   *  7+  → 😭  big sad frown, heavy tears, no eye sparkle
   */
  function updateChibiSadness() {
    if (!youMouth) return;

    if (noAttempts === 0) {
      // Happy (default)
      youMouth.setAttribute("d", "M90 108 Q100 118 110 108");
      youTears.setAttribute("opacity", "0");
      youBrowL.setAttribute("opacity", "0");
      youBrowR.setAttribute("opacity", "0");
      youSparkleL.setAttribute("opacity", "1");
      youSparkleR.setAttribute("opacity", "1");
      if (waveArm) waveArm.classList.add("wave-arm-anim");
    } else if (noAttempts <= 2) {
      // Neutral — straight mouth, arm stops waving
      youMouth.setAttribute("d", "M90 110 L110 110");
      youTears.setAttribute("opacity", "0");
      youBrowL.setAttribute("opacity", "0");
      youBrowR.setAttribute("opacity", "0");
      if (waveArm) {
        waveArm.style.animation = "none";
        waveArm.style.transform = "rotate(0deg)";
      }
    } else if (noAttempts <= 4) {
      // Slight frown + worried brows
      youMouth.setAttribute("d", "M90 114 Q100 108 110 114");
      youBrowL.setAttribute("opacity", "1");
      youBrowR.setAttribute("opacity", "1");
      youBrowL.setAttribute("x1", "74"); youBrowL.setAttribute("y1", "80");
      youBrowL.setAttribute("x2", "88"); youBrowL.setAttribute("y2", "76");
      youBrowR.setAttribute("x1", "126"); youBrowR.setAttribute("y1", "80");
      youBrowR.setAttribute("x2", "112"); youBrowR.setAttribute("y2", "76");
      youTears.setAttribute("opacity", "0");
    } else if (noAttempts <= 6) {
      // Sad frown + tears appear
      youMouth.setAttribute("d", "M88 116 Q100 106 112 116");
      youBrowL.setAttribute("opacity", "1");
      youBrowR.setAttribute("opacity", "1");
      youBrowL.setAttribute("y1", "76"); youBrowL.setAttribute("y2", "72");
      youBrowR.setAttribute("y1", "76"); youBrowR.setAttribute("y2", "72");
      youTears.setAttribute("opacity", "0.7");
      youSparkleL.setAttribute("opacity", "0.4");
      youSparkleR.setAttribute("opacity", "0.4");
      // Add tear drip animation
      chibiYou.classList.add("chibi-crying");
    } else {
      // Full crying — big frown, heavy tears, no sparkle
      youMouth.setAttribute("d", "M86 118 Q100 104 114 118");
      youBrowL.setAttribute("opacity", "1");
      youBrowR.setAttribute("opacity", "1");
      youBrowL.setAttribute("y1", "74"); youBrowL.setAttribute("y2", "70");
      youBrowR.setAttribute("y1", "74"); youBrowR.setAttribute("y2", "70");
      youTears.setAttribute("opacity", "1");
      youSparkleL.setAttribute("opacity", "0");
      youSparkleR.setAttribute("opacity", "0");
      chibiYou.classList.add("chibi-crying");
      chibiYou.classList.add("chibi-sobbing");
    }
  }

  function recordNoAttempt() {
    noAttempts++;
    // Update button text
    btnNo.textContent = noTexts[Math.min(noAttempts, noTexts.length - 1)];

    // Scale flee speed: gets 20% faster per attempt, capping at ~3× base speed
    const speedMultiplier = Math.min(1 + noAttempts * 0.2, 3.0);
    fleeAccel = BASE_FLEE_ACCEL * speedMultiplier;
    maxSpeed  = BASE_MAX_SPEED  * speedMultiplier;

    // Grow "Yes" button
    btnYes.classList.remove("grow-1", "grow-2", "grow-3", "grow-4");
    if (noAttempts >= 8)      btnYes.classList.add("grow-4");
    else if (noAttempts >= 5) btnYes.classList.add("grow-3");
    else if (noAttempts >= 3) btnYes.classList.add("grow-2");
    else if (noAttempts >= 1) btnYes.classList.add("grow-1");

    // Make chibi sadder
    updateChibiSadness();

    // Show attempt counter
    attemptCounter.classList.remove("hidden");
    attemptCounter.textContent = `Times you tried to say no: ${noAttempts} 😤`;
  }

  // ═══════════════════════════════════════════════════
  //  "Yes" celebration
  // ═══════════════════════════════════════════════════
  btnYes.addEventListener("click", celebrate);

  function celebrate() {
    // Hide question UI
    heroCard.classList.add("hidden");
    if (noBtnActive) btnNo.classList.add("hidden");

    // Hide individual chibis, show couple
    chibiContainer.classList.add("hidden");
    chibiTogether.classList.remove("hidden");

    // Show success text
    successScene.classList.remove("hidden");

    // Fire confetti bursts
    fireConfetti();

    // Boost particles
    boostParticles();
  }

  function fireConfetti() {
    if (typeof confetti === "undefined") return;

    const defaults = {
      spread: 80,
      ticks: 120,
      gravity: 0.7,
      decay: 0.92,
      startVelocity: 35,
      colors: ["#f48fb1", "#e91e63", "#ce93d8", "#ff80ab", "#f8bbd0", "#ff4081"],
    };

    // Heart shapes
    const heart = confetti.shapeFromPath({
      path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    });

    // Burst from left
    confetti({
      ...defaults,
      particleCount: 60,
      origin: { x: 0.2, y: 0.6 },
      shapes: [heart, "circle"],
      scalar: 1.1,
    });

    // Burst from right
    confetti({
      ...defaults,
      particleCount: 60,
      origin: { x: 0.8, y: 0.6 },
      shapes: [heart, "circle"],
      scalar: 1.1,
    });

    // Center burst delayed
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 100,
        spread: 120,
        origin: { x: 0.5, y: 0.5 },
        shapes: [heart, "circle"],
        scalar: 1.3,
      });
    }, 400);

    // Continuous smaller bursts
    let burstCount = 0;
    const interval = setInterval(() => {
      burstCount++;
      if (burstCount > 6) { clearInterval(interval); return; }
      confetti({
        ...defaults,
        particleCount: 25,
        spread: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 + 0.3 },
        shapes: [heart],
        scalar: 0.9,
      });
    }, 600);
  }

  function boostParticles() {
    // Try to increase particle count after celebration
    if (typeof tsParticles === "undefined") return;
    const container = tsParticles.domItem(0);
    if (!container) return;
    // Emit extra particles
    try {
      container.particles.addParticle({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    } catch (_) { /* not critical */ }
  }

  // ═══════════════════════════════════════════════════
  //  Init
  // ═══════════════════════════════════════════════════
  initParticles();
})();
