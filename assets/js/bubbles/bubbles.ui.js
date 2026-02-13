(function(){
  const $ = (sel) => document.querySelector(sel);
  const t = (key, params) => (window.I18n ? window.I18n.t(key, params) : key);

  function fmtTimeSlider(v){
    if(Number(v) === 0) return t("game.infinite");
    if(Number(v) >= 65) return t("game.infinite");
    return `${v}s`;
  }

  function buildModeOptions(container, mode){
    container.innerHTML = "";

    if(mode === "numbers"){
      container.appendChild(optNumbers());
    } else if(mode === "operations"){
      container.appendChild(optOperations());
    } else if(mode === "tables"){
      container.appendChild(optTables());
    }
  }

  function optNumbers(){
    const el = document.createElement("div");
    el.className = "optbox";
    el.innerHTML = `
      <h3>${t("game.optionsNumbersTitle")}</h3>
      <div class="row">
        <div class="field">
          <label for="numMin">${t("game.numMin")}</label>
          <input id="numMin" type="number" value="1" min="-999" max="9999" />
        </div>
        <div class="field">
          <label for="numMax">${t("game.numMax")}</label>
          <input id="numMax" type="number" value="50" min="-999" max="9999" />
        </div>
      </div>
      <div class="hint">${t("game.numbersHint")}</div>
    `;
    return el;
  }

  function optOperations(){
    const el = document.createElement("div");
    el.className = "optbox";
    el.innerHTML = `
      <h3>${t("game.optionsOperationsTitle")}</h3>
      <div class="checkrow">
        <label class="chk"><input type="checkbox" id="opAdd" checked /> ${t("game.opAdd")}</label>
        <label class="chk"><input type="checkbox" id="opSub" checked /> ${t("game.opSub")}</label>
        <label class="chk"><input type="checkbox" id="opMul" checked /> ${t("game.opMul")}</label>
        <label class="chk"><input type="checkbox" id="opDiv" /> ${t("game.opDiv")}</label>
      </div>
      <div class="hint">${t("game.operationsHint")}</div>
    `;
    return el;
  }

  function optTables(){
    const el = document.createElement("div");
    el.className = "optbox";
    el.innerHTML = `
      <h3>${t("game.optionsTablesTitle")}</h3>
      <div class="row">
        <div class="field">
          <label for="tableN">${t("game.table")}</label>
          <select id="tableN">
            <option value="random">${t("game.random")}</option>
            ${Array.from({length:10}, (_, i) => `<option value="${i+1}">${t("game.tableOf", { n: i + 1 })}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="hint">${t("game.tablesHint")}</div>
    `;
    return el;
  }

  function getUIRefs(){
    return {
      mode: $("#mode"),
      order: $("#order"),
      bubbleCount: $("#bubbleCount"),
      bubbleCountVal: $("#bubbleCountVal"),
      timeLimit: $("#timeLimit"),
      timeLimitVal: $("#timeLimitVal"),
      modeOptions: $("#modeOptions"),
      langSelect: $("#langSelect"),

      btnStart: $("#btnStart"),
      btnReset: $("#btnReset"),
      btnPause: $("#btnPause"),
      btnPlayAgain: $("#btnPlayAgain"),

      arena: $("#arena"),
      goalText: $("#goalText"),
      remainingText: $("#remainingText"),
      statusText: $("#statusText"),
      timebarFill: $("#timebarFill"),
      pauseCover: $("#pauseCover"),

      overlay: $("#overlay"),
      overlayTitle: $("#overlayTitle"),
      overlayMsg: $("#overlayMsg"),
    };
  }

  window.BubblesUI = {
    getUIRefs,
    buildModeOptions,
    fmtTimeSlider
  };
})();
