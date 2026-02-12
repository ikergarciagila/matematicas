(function(){
  const U = window.BubblesUtils;
  const CFG = window.BUBBLES_CONFIG;

  const state = {
    running: false,
    paused: false,
    ended: false,

    // time
    timeLimitMs: 30000,
    startTs: 0,
    pauseAccumMs: 0,
    pauseStartTs: 0,
    raf: 0,

    // gameplay
    mode: 'numbers',
    order: 'asc',
    bubbleCount: 10,

    items: [],        // { id, text, value, isTarget }
    targets: [],      // ordered list of targets (by value)
    nextIndex: 0,

    // for tables
    tableN: null
  };

  function init(){
    const ui = window.BubblesUI.getUIRefs();

    // default options UI
    window.BubblesUI.buildModeOptions(ui.modeOptions, ui.mode.value);

    // sliders
    ui.bubbleCount.addEventListener('input', () => ui.bubbleCountVal.textContent = ui.bubbleCount.value);
    ui.timeLimit.addEventListener('input', () => ui.timeLimitVal.textContent = window.BubblesUI.fmtTimeSlider(ui.timeLimit.value));

    // mode change
    ui.mode.addEventListener('change', () => {
      window.BubblesUI.buildModeOptions(ui.modeOptions, ui.mode.value);
    });

    ui.btnStart.addEventListener('click', () => startGame(ui));
    ui.btnReset.addEventListener('click', () => reset(ui));
    ui.btnPause.addEventListener('click', () => togglePause(ui));
    ui.btnPlayAgain.addEventListener('click', () => {
      hideOverlay(ui);
      startGame(ui);
    });

    // initial label
    ui.bubbleCountVal.textContent = ui.bubbleCount.value;
    ui.timeLimitVal.textContent = window.BubblesUI.fmtTimeSlider(ui.timeLimit.value);
    updateHUD(ui, 'Listo');
    setTimebar(ui, 1);
  }

  function readOptions(ui){
    const mode = ui.mode.value;
    const order = ui.order.value;
    const bubbleCount = Number(ui.bubbleCount.value);

    // time slider: 0 => infinito, 5..60 => segundos
    const t = Number(ui.timeLimit.value);
    const timeLimitMs = (t === 0 || t >= 65) ? Infinity : (Math.max(5, t) * 1000);

    const opts = { mode, order, bubbleCount, timeLimitMs };

    if(mode === 'numbers'){
      const minEl = document.querySelector('#numMin');
      const maxEl = document.querySelector('#numMax');
      let min = Number(minEl?.value ?? 1);
      let max = Number(maxEl?.value ?? 50);
      if(min > max) [min, max] = [max, min];
      opts.numMin = min;
      opts.numMax = max;
    }

    if(mode === 'operations'){
      const flags = {
        add: !!document.querySelector('#opAdd')?.checked,
        sub: !!document.querySelector('#opSub')?.checked,
        mul: !!document.querySelector('#opMul')?.checked,
        div: !!document.querySelector('#opDiv')?.checked,
      };
      // si no marca nada, forzamos sumas para evitar modo inválido
      if(!flags.add && !flags.sub && !flags.mul && !flags.div) flags.add = true;
      opts.opFlags = flags;
    }

    if(mode === 'tables'){
      const sel = document.querySelector('#tableN');
      opts.tableN = sel?.value ?? 'random';
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
    ui.arena.innerHTML = '';
    updateHUD(ui, 'Listo');
    setTimebar(ui, 1);
    hideOverlay(ui);
    ui.btnPause.textContent = 'Pausar';
  }

  function startGame(ui){
    reset(ui);

    const opts = readOptions(ui);

    state.mode = opts.mode;
    state.order = opts.order;
    state.bubbleCount = opts.bubbleCount;
    state.timeLimitMs = opts.timeLimitMs;
    state.tableN = opts.tableN ?? null;

    // generate items
    state.items = generateItems(opts);
    state.targets = computeTargets(state.items, opts);
    state.nextIndex = 0;

    // render + place
    const ok = renderAndPlace(ui, state.items);
    if(!ok){
      showOverlay(ui,
        'No caben 🙈',
        'No he conseguido colocar las burbujas sin solaparse. Prueba con menos burbujas o gira el dispositivo.'
      );
      state.ended = true;
      return;
    }

    // HUD goal text
    const goal = goalTextForMode(opts, state);
    ui.goalText.textContent = goal;
    ui.remainingText.textContent = String(state.targets.length);
    ui.statusText.textContent = 'Jugando';
    ui.nextText.textContent = state.targets[0]?.text ?? '—';

    // time
    state.running = true;
    state.paused = false;
    state.ended = false;
    state.startTs = performance.now();
    state.pauseAccumMs = 0;
    ui.btnPause.textContent = 'Pausar';

    loop(ui);
  }

  function goalTextForMode(opts, st){
    const ord = opts.order === 'asc' ? 'ascendente' : 'descendente';
    if(opts.mode === 'numbers') return `Números (${ord})`;
    if(opts.mode === 'operations') return `Operaciones por resultado (${ord})`;
    if(opts.mode === 'tables'){
      const t = (st.tableN === null || st.tableN === 'random') ? 'aleatoria' : `del ${st.tableN}`;
      return `Tabla ${t} (${ord})`;
    }
    return '—';
  }

  function generateItems(opts){
    if(opts.mode === 'numbers'){
      const nums = U.uniqInts(opts.bubbleCount, opts.numMin, opts.numMax);
      return nums.map((n, i) => ({
        id: `n_${i}_${n}`,
        text: String(n),
        value: n,
        isTarget: true
      }));
    }

    if(opts.mode === 'operations'){
      const ops = [];
      const flags = opts.opFlags;

      const types = [];
      if(flags.add) types.push('add');
      if(flags.sub) types.push('sub');
      if(flags.mul) types.push('mul');
      if(flags.div) types.push('div');

      for(let i=0;i<opts.bubbleCount;i++){
        const t = types[U.randInt(0, types.length-1)];
        ops.push(makeOperationItem(t, i));
      }
      return ops;
    }

    if(opts.mode === 'tables'){
      const tableN = (opts.tableN === 'random') ? U.randInt(1,10) : Number(opts.tableN);
      const maxVal = tableN * CFG.tables.maxMultiple;

      // Targets (múltiplos)
      const multiples = [];
      for(let k=1;k<=CFG.tables.maxMultiple;k++){
        multiples.push(tableN * k);
      }

      // Queremos que haya distractores: el total es bubbleCount
      // targetsCount: mínimo 3 o la mitad (lo que tenga sentido), pero nunca más que bubbleCount
      const minTargets = Math.min(multiples.length, Math.max(3, Math.floor(opts.bubbleCount * 0.6)));
      const targets = multiples.slice(0, minTargets);

      const distractCount = Math.max(0, opts.bubbleCount - targets.length);

      // Distractores: números que NO sean múltiplos, dentro de 1..maxVal (o un poco más si hace falta)
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

      const all = [...targets.map((n,i)=>({ id:`t_${i}_${n}`, text:String(n), value:n, isTarget:true })),
                   ...distractors.map((n,i)=>({ id:`d_${i}_${n}`, text:String(n), value:n, isTarget:false }))];

      // guardamos tabla en el item (en state lo guardaremos indirectamente)
      state.tableN = tableN;

      return U.shuffle(all);
    }

    return [];
  }

  function makeOperationItem(type, i){
    const a = U.randInt(CFG.operations.aMin, CFG.operations.aMax);
    let b = U.randInt(CFG.operations.bMin, CFG.operations.bMax);

    let text = '';
    let value = 0;

    if(type === 'add'){
      value = a + b;
      text = `${a} + ${b}`;
    } else if(type === 'sub'){
      value = a - b;
      text = `${a} − ${b}`;
    } else if(type === 'mul'){
      value = a * b;
      text = `${a} × ${b}`;
    } else if(type === 'div'){
      if(CFG.operations.exactDivisionOnly){
        // construimos división exacta: (a*b) ÷ b = a
        b = U.randInt(Math.max(1, CFG.operations.bMin), Math.max(1, CFG.operations.bMax));
        const dividend = a * b;
        value = dividend / b;
        text = `${dividend} ÷ ${b}`;
      }else{
        value = a / b;
        text = `${a} ÷ ${b}`;
      }
    }

    return { id: `op_${i}_${type}_${a}_${b}`, text, value, isTarget: true };
  }

  function computeTargets(items, opts){
    // En numbers y operations: todas son target
    // En tables: solo isTarget=true
    const targets = items.filter(x => x.isTarget);

    targets.sort((x,y) => x.value - y.value);
    if(opts.order === 'desc') targets.reverse();

    return targets;
  }

  function renderAndPlace(ui, items){
    const arena = ui.arena;
    arena.innerHTML = '';

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

    // render
    items.forEach((item, idx) => {
      const c = placed[idx];
      const el = document.createElement('button');
      el.className = 'bubble';
      el.type = 'button';
      el.dataset.id = item.id;

      // aplicamos escala si se tuvo que reducir
      el.style.transform = `translate(-50%, -50%) scale(${c.scale})`;
      el.style.left = `${c.x}px`;
      el.style.top = `${c.y}px`;

      el.innerHTML = `<div class="txt">${escapeHtml(item.text)}</div>`;

      el.addEventListener('click', () => onBubbleClick(ui, item, el));
      arena.appendChild(el);
    });

    return true;
  }

  function onBubbleClick(ui, item, el){
    if(!state.running || state.paused || state.ended) return;

    const expected = state.targets[state.nextIndex];
    const isCorrect = expected && item.id === expected.id;

    if(isCorrect){
      el.classList.add('good');
      // quitar con una mini animación
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      setTimeout(() => el.remove(), 110);

      state.nextIndex++;
      const remaining = state.targets.length - state.nextIndex;

      ui.remainingText.textContent = String(remaining);
      ui.nextText.textContent = state.targets[state.nextIndex]?.text ?? '—';

      if(remaining <= 0){
        endGame(ui, true, '¡Bien! 🎉', 'Has completado todas las burbujas correctas.');
      }
    }else{
      el.classList.add('bad');
      endGame(ui, false, '¡Oh no! 💥', `Esa no era la siguiente. La correcta era: ${expected?.text ?? '—'}`);
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
          endGame(ui, false, 'Tiempo 😵', 'Se acabó el tiempo. Prueba con más segundos o “∞”.');
          return;
        }
      }else{
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
      ui.btnPause.textContent = 'Reanudar';
      ui.statusText.textContent = 'Pausado';
    }else{
      const now = performance.now();
      state.pauseAccumMs += (now - state.pauseStartTs);
      ui.btnPause.textContent = 'Pausar';
      ui.statusText.textContent = 'Jugando';
    }
  }

  function endGame(ui, win, title, msg){
    state.ended = true;
    state.running = false;
    ui.statusText.textContent = win ? 'Victoria' : 'Fin';
    showOverlay(ui, title, msg);
    stopLoop();
  }

  function updateHUD(ui, status){
    ui.goalText.textContent = '—';
    ui.nextText.textContent = '—';
    ui.remainingText.textContent = '—';
    ui.statusText.textContent = status;
  }

  function setTimebar(ui, ratio01){
    const p = U.clamp(ratio01, 0, 1);
    ui.timebarFill.style.transform = `scaleX(${p})`;
  }

  function showOverlay(ui, title, msg){
    ui.overlayTitle.textContent = title;
    ui.overlayMsg.textContent = msg;
    ui.overlay.classList.remove('hidden');
    ui.overlay.setAttribute('aria-hidden', 'false');
  }

  function hideOverlay(ui){
    ui.overlay.classList.add('hidden');
    ui.overlay.setAttribute('aria-hidden', 'true');
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  document.addEventListener('DOMContentLoaded', init);
})();
