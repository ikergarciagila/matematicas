(function(){
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function randInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function shuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function uniqInts(count, min, max){
    const span = max - min + 1;
    if(count > span) count = span;
    const set = new Set();
    while(set.size < count){
      set.add(randInt(min, max));
    }
    return [...set];
  }

  // Tamaño real de una burbuja (según CSS clamp) -> medimos una burbuja de prueba
  function measureBubblePx(arenaEl){
    const temp = document.createElement('div');
    temp.className = 'bubble';
    temp.style.left = '-9999px';
    temp.style.top = '-9999px';
    temp.innerHTML = '<div class="txt">00</div>';
    arenaEl.appendChild(temp);
    const r = temp.getBoundingClientRect();
    temp.remove();
    return { w: r.width, h: r.height };
  }

  // Algoritmo simple de no-solape: intentos aleatorios + chequeo por distancia
  // Representamos burbujas como círculos (radio = min(w,h)/2)
  function placeNonOverlapping(count, arenaRect, bubbleSizePx, minGapPx, maxAttempts, scaleFloor){
    let scale = 1.0;
    let placed = null;

    while(scale >= scaleFloor && !placed){
      const w = bubbleSizePx.w * scale;
      const h = bubbleSizePx.h * scale;
      const r = Math.min(w, h) / 2;

      const circles = [];
      let attempts = 0;

      while(circles.length < count && attempts < maxAttempts){
        attempts++;

        const x = randInt(Math.ceil(r), Math.floor(arenaRect.width - r));
        const y = randInt(Math.ceil(r), Math.floor(arenaRect.height - r));

        let ok = true;
        for(const c of circles){
          const dx = x - c.x;
          const dy = y - c.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if(dist < (r + c.r + minGapPx)){
            ok = false;
            break;
          }
        }
        if(ok){
          circles.push({ x, y, r, w, h, scale });
        }
      }

      if(circles.length === count){
        placed = circles;
      }else{
        scale -= 0.05;
      }
    }

    return placed; // null si no se pudo
  }

  window.BubblesUtils = {
    clamp,
    randInt,
    shuffle,
    uniqInts,
    measureBubblePx,
    placeNonOverlapping
  };
})();
