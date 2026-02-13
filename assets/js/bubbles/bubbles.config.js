// Config global editable (valores por defecto y límites razonables)
window.BUBBLES_CONFIG = {
  // Colocación: evita solapes con esta separación mínima (px)
  minGapPx: 10,

  // Reintentos para colocar burbujas sin solape
  placementMaxAttempts: 1200,

  // Si no caben, reducimos tamaño (hasta este factor)
  minBubbleScale: 0.78,

  // Operaciones: rango de operandos
  operations: {
    aMin: 1,
    aMax: 20,
    bMin: 1,
    bMax: 20,
    // En divisiones: solo generamos divisiones exactas para que queden bonitas
    exactDivisionOnly: true
  },

  // Tablas: por defecto, trabajamos hasta 10 múltiplos (tabla * 10)
  tables: {
    maxMultiple: 10
  }
};
