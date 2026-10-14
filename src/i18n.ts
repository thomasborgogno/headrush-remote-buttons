const it = {
  bankA: 'Banco A',
  bankB: 'Banco B',
  all: 'Tutti',
  connected: 'Connesso',
  unreachable: 'Headrush non raggiungibile',
  hold: 'HOLD',
  latch: 'LATCH',
  scene: 'SCENE',
};

const en: typeof it = {
  bankA: 'Bank A',
  bankB: 'Bank B',
  all: 'All',
  connected: 'Connected',
  unreachable: 'Headrush unreachable',
  hold: 'HOLD',
  latch: 'LATCH',
  scene: 'SCENE',
};

export const t = (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('it')) ? it : en;
