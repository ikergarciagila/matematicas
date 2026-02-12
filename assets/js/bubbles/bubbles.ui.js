(function(){
  const $ = (sel) => document.querySelector(sel);

  function fmtTimeSlider(v){
    // Slider: 0 => infinito
    if(Number(v) === 0) return '∞';
    if(Number(v) >= 65) return '∞'; // por si ajustas el máximo
    return `${v}s`;
  }

  function buildModeOptions(container, mode){
    container.innerHTML = '';

    if(mode === 'numbers'){
      container.appendChild(optNumbers());
    } else if(mode === 'operations'){
      container.appendChild(optOperations());
    } else if(mode === 'tables'){
      container.appendChild(optTables());
    }
  }

  function optNumbers(){
    const el = document.createElement('div');
    el.className = 'optbox';
    el.innerHTML = `
      <h3>Opciones de números</h3>
      <div class="row">
        <div class="field">
          <label for="numMin">Número mínimo</label>
          <input id="numMin" type="number" value="1" min="-999" max="9999" />
        </div>
        <div class="field">
          <label for="numMax">Número máximo</label>
          <input id="numMax" type="number" value="50" min="-999" max="9999" />
        </div>
      </div>
      <div class="hint">Se generan números únicos dentro del rango.</div>
    `;
    return el;
  }

  function optOperations(){
    const el = document.createElement('div');
    el.className = 'optbox';
    el.innerHTML = `
      <h3>Opciones de operaciones</h3>
      <div class="checkrow">
        <label class="chk"><input type="checkbox" id="opAdd" checked /> Sumas (+)</label>
        <label class="chk"><input type="checkbox" id="opSub" checked /> Restas (−)</label>
        <label class="chk"><input type="checkbox" id="opMul" checked /> Multiplicaciones (×)</label>
        <label class="chk"><input type="checkbox" id="opDiv" /> Divisiones (÷)</label>
      </div>
      <div class="hint">Se ordena por el resultado de la operación (asc/desc).</div>
    `;
    return el;
  }

  function optTables(){
    const el = document.createElement('div');
    el.className = 'optbox';
    el.innerHTML = `
      <h3>Opciones de tablas</h3>
      <div class="row">
        <div class="field">
          <label for="tableN">Tabla</label>
          <select id="tableN">
            <option value="random">Aleatorio</option>
            ${Array.from({length:10}, (_,i)=>`<option value="${i+1}">Del ${i+1}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="hint">Aparecen burbujas que NO pertenecen a la tabla (distractores).</div>
    `;
    return el;
  }

  function getUIRefs(){
    return {
      mode: $('#mode'),
      order: $('#order'),
      bubbleCount: $('#bubbleCount'),
      bubbleCountVal: $('#bubbleCountVal'),
      timeLimit: $('#timeLimit'),
      timeLimitVal: $('#timeLimitVal'),
      modeOptions: $('#modeOptions'),

      btnStart: $('#btnStart'),
      btnReset: $('#btnReset'),
      btnPause: $('#btnPause'),
      btnPlayAgain: $('#btnPlayAgain'),

      arena: $('#arena'),
      goalText: $('#goalText'),
      nextText: $('#nextText'),
      remainingText: $('#remainingText'),
      statusText: $('#statusText'),
      timebarFill: $('#timebarFill'),

      overlay: $('#overlay'),
      overlayTitle: $('#overlayTitle'),
      overlayMsg: $('#overlayMsg'),
    };
  }

  window.BubblesUI = {
    getUIRefs,
    buildModeOptions,
    fmtTimeSlider
  };
})();
