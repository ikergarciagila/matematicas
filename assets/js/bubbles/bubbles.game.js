(function(){
  const U = window.BubblesUtils;
  const CFG = window.BUBBLES_CONFIG;
  const t = (key, params) => (window.I18n ? window.I18n.t(key, params) : key);

  const state = {
    running: false,
    paused: false,
    ended: false,
    timeLimitMs: 30000,
    startTs: 0,
    pauseAccumMs: 0,
    pauseStartTs: 0,
    raf: 0,
    mode: "numbers",
    order: "asc",
    bubbleCount: 10,
    items: [],
    targets: [],
    nextIndex: 0,
    tableN: null
  };

  function init(){
    if(window.I18n){
      window.I18n.init();
      window.I18n.bindLanguageSelector("#langSelect");
    }

    const ui = window.BubblesUI.getUIRefs();
    window.BubblesUI.buildModeOptions(ui.modeOptions, ui.mode.value);

    ui.bubbleCount.addEventListener("input", () => ui.bubbleCountVal.textContent = ui.bubbleCount.value);
    ui.timeLimit.addEventListener("input", () => ui.timeLimitVal.textContent = window.BubblesUI.fmtTimeSlider(ui.timeLimit.value));

    ui.mode.addEventListener("change", () => {
      window.BubblesUI.buildModeOptions(ui.modeOptions, ui.mode.value);
    });

    ui.btnStart.addEventListener("click", () => startGame(ui));
    ui.btnReset.addEventListener("click", () => reset(ui));
    ui.btnPause.addEventListener("click", () => togglePause(ui));
    ui.btnPlayAgain.addEventListener("click", () => {
      hideOverlay(ui);
      startGame(ui);
    });

    ui.bubbleCountVal.textContent = ui.bubbleCount.value;
    ui.timeLimitVal.textContent = window.BubblesUI.fmtTimeSlider(ui.timeLimit.value);
    updateHUD(ui, t("game.statusReady"));
    setTimebar(ui, 1);
  }

  function readOptions(ui){
    const mode = ui.mode.value;
    const order = ui.order.value;
    const bubbleCount = Number(ui.bubbleCount.value);
    const rawTime = Number(ui.timeLimit.value);
    const timeLimitMs = (rawTime === 0 || rawTime >= 65) ? Infinity : (Math.max(5, rawTime) * 1000);
    const opts = { mode, order, bubbleCount, timeLimitMs };

    if(mode === "numbers"){
      const minEl = document.querySelector("#numMin");
      const maxEl = document.querySelector("#numMax");
      let min = Number(minEl?.value ?? 1);
      let max = Number(maxEl?.value ?? 50);
      if(min > max) [min, max] = [max, min];
      opts.numMin = min;
      opts.numMax = max;
    }

    if(mode === "operations"){
      const flags = {
        add: !!document.querySelector("#opAdd")?.checked,
        sub: !!document.querySelector("#opSub")?.checked,
        mul: !!document.querySelector("#opMul")?.checked,
        div: !!document.querySelector("#opDiv")?.checked,
      };
      if(!flags.add && !flags.sub && !flags.mul && !flags.div) flags.add = true;
      opts.opFlags = flags;
    }

    if(mode === "tables"){
      const sel = document.querySelector("#tableN");
      opts.tableN = sel?.value ?? "random";
    }

    return opts;
  }

  function reset(ui){
    stopLoop();
    state.running = false;
    state.paused = false;
    state.ended = false;
    state.items = [];
    state.targets = [];
    state.nextIndex = 0;
    state.tableN = null;
    clearBubbles(ui);
    updateHUD(ui, t("game.statusReady"));
    setTimebar(ui, 1);
    hideOverlay(ui);
    setPauseCover(ui, false);
    ui.btnPause.textContent = t("game.pause");
  }

  function startGame(ui){
    reset(ui);
    const opts = readOptions(ui);

    state.mode = opts.mode;
    state.order = opts.order;
    state.bubbleCount = opts.bubbleCount;
    state.timeLimitMs = opts.timeLimitMs;
    state.tableN = opts.tableN ?? null;
    state.items = generateItems(opts);
    state.targets = computeTargets(state.items, opts);
    state.nextIndex = 0;

    const ok = renderAndPlace(ui, state.items);
    if(!ok){
      showOverlay(ui, t("game.overlayNoFitTitle"), t("game.overlayNoFitMsg"));
      state.ended = true;
      return;
    }

    ui.goalText.textContent = goalTextForMode(opts, state);
    ui.remainingText.textContent = String(state.targets.length);
    ui.statusText.textContent = t("game.statusPlaying");

    state.running = true;
    state.paused = false;
    state.ended = false;
    state.startTs = performance.now();
    state.pauseAccumMs = 0;
    ui.btnPause.textContent = t("game.pause");
    setPauseCover(ui, false);

    loop(ui);
  }

  function goalTextForMode(opts, st){
    const ord = opts.order === "asc" ? t("game.orderWordAsc") : t("game.orderWordDesc");
    if(opts.mode === "numbers") return t("game.goalNumbers", { order: ord });
    if(opts.mode === "operations") return t("game.goalOperations", { order: ord });
    if(opts.mode === "tables"){
      const tableLabel = (st.tableN === null || st.tableN === "random")
        ? t("game.tableRandom")
        : t("game.tableOfLower", { n: st.tableN });
      return t("game.goalTable", { table: tableLabel, order: ord });
    }
    return t("game.dash");
  }

  function generateItems(opts){
    if(opts.mode === "numbers"){
      const nums = U.uniqInts(opts.bubbleCount, opts.numMin, opts.numMax);
      return nums.map((n, i) => ({ id: `n_${i}_${n}`, text: String(n), value: n, isTarget: true }));
    }

    if(opts.mode === "operations"){
      const ops = [];
      const flags = opts.opFlags;
      const types = [];
      if(flags.add) types.push("add");
      if(flags.sub) types.push("sub");
      if(flags.mul) types.push("mul");
      if(flags.div) types.push("div");
      for(let i = 0; i < opts.bubbleCount; i++){
        const op = types[U.randInt(0, types.length - 1)];
        ops.push(makeOperationItem(op, i));
      }
      return ops;
    }

    if(opts.mode === "tables"){
      const tableN = (opts.tableN === "random") ? U.randInt(1, 10) : Number(opts.tableN);
      const maxVal = tableN * CFG.tables.maxMultiple;
      const multiples = [];
      for(let k = 1; k <= CFG.tables.maxMultiple; k++) multiples.push(tableN * k);

      const minTargets = Math.min(multiples.length, Math.max(3, Math.floor(opts.bubbleCount * 0.6)));
      const targets = multiples.slice(0, minTargets);
      const distractCount = Math.max(0, opts.bubbleCount - targets.length);
      const distractPoolMax = Math.max(maxVal, 20);
      const distractors = [];
      const used = new Set(targets);

      while(distractors.length < distractCount){
        const n = U.randInt(1, distractPoolMax);
        if(n % tableN !== 0 && !used.has(n)){
          used.add(n);
          distractors.push(n);
        }
      }

      const all = [
        ...targets.map((n, i) => ({ id: `t_${i}_${n}`, text: String(n), value: n, isTarget: true })),
        ...distractors.map((n, i) => ({ id: `d_${i}_${n}`, text: String(n), value: n, isTarget: false }))
      ];

      state.tableN = tableN;
      return U.shuffle(all);
    }

    return [];
  }

  function makeOperationItem(type, i){
    const a = U.randInt(CFG.operations.aMin, CFG.operations.aMax);
    let b = U.randInt(CFG.operations.bMin, CFG.operations.bMax);
    let text = "";
    let value = 0;

    if(type === "add"){
      value = a + b;
      text = `${a} + ${b}`;
    } else if(type === "sub"){
      value = a - b;
      text = `${a} - ${b}`;
    } else if(type === "mul"){
      value = a * b;
      text = `${a} x ${b}`;
    } else if(type === "div"){
      if(CFG.operations.exactDivisionOnly){
        b = U.randInt(Math.max(1, CFG.operations.bMin), Math.max(1, CFG.operations.bMax));
        const dividend = a * b;
        value = dividend / b;
        text = `${dividend} / ${b}`;
      } else {
        value = a / b;
        text = `${a} / ${b}`;
      }
    }

    return { id: `op_${i}_${type}_${a}_${b}`, text, value, isTarget: true };
  }

  function computeTargets(items, opts){
    const targets = items.filter((x) => x.isTarget);
    targets.sort((x, y) => x.value - y.value);
    if(opts.order === "desc") targets.reverse();
    return targets;
  }

  function renderAndPlace(ui, items){
    const arena = ui.arena;
    clearBubbles(ui);

    const arenaRect = arena.getBoundingClientRect();
    const bubbleSize = U.measureBubblePx(arena);
    const placed = U.placeNonOverlapping(
      items.length,
      { width: arenaRect.width, height: arenaRect.height },
      bubbleSize,
      CFG.minGapPx,
      CFG.placementMaxAttempts,
      CFG.minBubbleScale
    );

    if(!placed) return false;

    items.forEach((item, idx) => {
      const c = placed[idx];
      const el = document.createElement("button");
      el.className = "bubble";
      el.type = "button";
      el.dataset.id = item.id;
      el.style.transform = `translate(-50%, -50%) scale(${c.scale})`;
      el.style.left = `${c.x}px`;
      el.style.top = `${c.y}px`;
      el.innerHTML = `<div class="txt">${escapeHtml(item.text)}</div>`;
      el.addEventListener("click", () => onBubbleClick(ui, item, el));
      arena.appendChild(el);
      animateBubbleIn(el, c.scale);
    });

    return true;
  }

  function onBubbleClick(ui, item, el){
    if(!state.running || state.paused || state.ended) return;

    const expected = state.targets[state.nextIndex];
    const isCorrect = expected && item.id === expected.id;

    if(isCorrect){
      el.classList.add("good");
      el.style.pointerEvents = "none";
      animateBubbleOut(el);

      state.nextIndex++;
      const remaining = state.targets.length - state.nextIndex;
      ui.remainingText.textContent = String(remaining);

      if(remaining <= 0){
        endGame(ui, true, t("game.winTitle"), t("game.winMsg"));
      }
    } else {
      el.classList.add("bad");
      animateBubbleError(el);
      endGame(ui, false, t("game.wrongTitle"), t("game.wrongMsg", { expected: expected?.text ?? t("game.dash") }));
    }
  }

  function loop(ui){
    stopLoop();
    const tick = () => {
      if(!state.running || state.ended) return;

      if(state.paused){
        state.raf = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const elapsed = now - state.startTs - state.pauseAccumMs;

      if(state.timeLimitMs !== Infinity){
        const left = Math.max(0, state.timeLimitMs - elapsed);
        const p = left / state.timeLimitMs;
        setTimebar(ui, p);

        if(left <= 0){
          endGame(ui, false, t("game.timeoutTitle"), t("game.timeoutMsg"));
          return;
        }
      } else {
        setTimebar(ui, 1);
      }

      state.raf = requestAnimationFrame(tick);
    };

    state.raf = requestAnimationFrame(tick);
  }

  function stopLoop(){
    if(state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function togglePause(ui){
    if(!state.running || state.ended) return;

    state.paused = !state.paused;

    if(state.paused){
      state.pauseStartTs = performance.now();
      ui.btnPause.textContent = t("game.pauseResume");
      ui.statusText.textContent = t("game.statusPaused");
      setPauseCover(ui, true);
    } else {
      const now = performance.now();
      state.pauseAccumMs += (now - state.pauseStartTs);
      ui.btnPause.textContent = t("game.pause");
      ui.statusText.textContent = t("game.statusPlaying");
      setPauseCover(ui, false);
    }
  }

  function endGame(ui, win, title, msg){
    state.ended = true;
    state.running = false;
    ui.statusText.textContent = win ? t("game.statusVictory") : t("game.statusEnd");
    setPauseCover(ui, false);
    showOverlay(ui, title, msg);
    stopLoop();
  }

  function updateHUD(ui, status){
    ui.goalText.textContent = t("game.dash");
    ui.remainingText.textContent = t("game.dash");
    ui.statusText.textContent = status;
  }

  function setTimebar(ui, ratio01){
    const p = U.clamp(ratio01, 0, 1);
    ui.timebarFill.style.transform = `scaleX(${p})`;
  }

  function showOverlay(ui, title, msg){
    ui.overlayTitle.textContent = title;
    ui.overlayMsg.textContent = msg;
    ui.overlay.classList.remove("hidden");
    ui.overlay.setAttribute("aria-hidden", "false");
  }

  function hideOverlay(ui){
    ui.overlay.classList.add("hidden");
    ui.overlay.setAttribute("aria-hidden", "true");
  }

  function clearBubbles(ui){
    ui.arena.querySelectorAll(".bubble").forEach((el) => el.remove());
  }

  function setPauseCover(ui, visible){
    if(!ui.pauseCover) return;
    ui.pauseCover.classList.toggle("hidden", !visible);
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function animateBubbleIn(el, scale){
    const to = `translate(-50%, -50%) scale(${scale})`;
    const from = `translate(-50%, -50%) scale(${Math.max(0.45, scale * 0.72)})`;
    el.animate(
      [
        { transform: from, opacity: 0 },
        { transform: to, opacity: 1 }
      ],
      { duration: 220, easing: "cubic-bezier(.2,.9,.25,1)", fill: "none" }
    );
  }

  function animateBubbleOut(el){
    const base = el.style.transform || "translate(-50%, -50%) scale(1)";
    const match = /scale\(([^)]+)\)/.exec(base);
    const scale = Number(match?.[1] ?? 1);
    const to = `translate(-50%, -50%) scale(${Math.max(0.18, scale * 0.35)})`;
    const anim = el.animate(
      [
        { transform: base, opacity: 1 },
        { transform: to, opacity: 0 }
      ],
      { duration: 140, easing: "ease-out", fill: "forwards" }
    );
    anim.onfinish = () => el.remove();
  }

  function animateBubbleError(el){
    const base = el.style.transform || "translate(-50%, -50%) scale(1)";
    el.animate(
      [
        { transform: base },
        { transform: `${base} translateX(-5px)` },
        { transform: `${base} translateX(5px)` },
        { transform: base }
      ],
      { duration: 180, easing: "ease-in-out", fill: "none" }
    );
  }

  document.addEventListener("DOMContentLoaded", init);
})();
