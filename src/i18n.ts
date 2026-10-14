const en = {
  bankA: 'Bank A',
  bankB: 'Bank B',
  all: 'All',
  connected: 'Connected',
  unreachable: 'Headrush unreachable',
};

type Strings = typeof en;

const translations: Record<string, Strings> = {
  en,
  it: { bankA: 'Banco A', bankB: 'Banco B', all: 'Tutti', connected: 'Connesso', unreachable: 'Headrush non raggiungibile' },
  es: { bankA: 'Banco A', bankB: 'Banco B', all: 'Todos', connected: 'Conectado', unreachable: 'Headrush no accesible' },
  fr: { bankA: 'Banque A', bankB: 'Banque B', all: 'Tout', connected: 'Connecté', unreachable: 'Headrush injoignable' },
  de: { bankA: 'Bank A', bankB: 'Bank B', all: 'Alle', connected: 'Verbunden', unreachable: 'Headrush nicht erreichbar' },
  pt: { bankA: 'Banco A', bankB: 'Banco B', all: 'Todos', connected: 'Conectado', unreachable: 'Headrush inacessível' },
  ja: { bankA: 'バンクA', bankB: 'バンクB', all: 'すべて', connected: '接続済み', unreachable: 'Headrushに接続できません' },
  zh: { bankA: 'A组', bankB: 'B组', all: '全部', connected: '已连接', unreachable: '无法连接 Headrush' },
};

function pick(): Strings {
  const langs = typeof navigator !== 'undefined' ? [...(navigator.languages ?? []), navigator.language] : [];
  for (const l of langs) {
    const base = l?.toLowerCase().split('-')[0];
    if (base && translations[base]) return translations[base];
  }
  return en;
}

export const t = pick();

// Nomi delle modalità dei pedali: sono i termini dell'Headrush, non si traducono
export const MODE_TAG: Record<string, string> = { latch: 'LATCH', hold: 'HOLD', scene: 'SCENE' };
