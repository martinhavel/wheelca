export const PRAGUE_CENTER = [50.0755, 14.4378];

export const WHEELCHAIR_COLORS = {
  yes: '#16a34a', limited: '#ca8a04', no: '#dc2626', unknown: '#9ca3af'
};

export const WHEELCHAIR_LABELS = {
  yes: 'Bezbariérové', limited: 'Omezeně přístupné', no: 'Nepřístupné', unknown: 'Neznámé'
};

export const SCORE_COLORS = { 0: '#9ca3af', 1: '#16a34a', 2: '#ca8a04', 3: '#dc2626' };
export const SCORE_LABELS = { 0: 'Neznámý', 1: 'Přístupný', 2: 'Omezeně', 3: 'Nepřístupný' };

export const CATEGORY_LABELS = {
  toilets: 'WC', restaurant: 'Restaurace', cafe: 'Kavárna', bar: 'Bar', pub: 'Hospoda',
  fast_food: 'Rychlé občerstvení', pharmacy: 'Lékárna', hospital: 'Nemocnice',
  clinic: 'Klinika', doctors: 'Lékař', dentist: 'Zubař', bank: 'Banka',
  atm: 'Bankomat', post_office: 'Pošta', library: 'Knihovna', school: 'Škola',
  university: 'Univerzita', kindergarten: 'Školka', theatre: 'Divadlo',
  cinema: 'Kino', museum: 'Muzeum', gallery: 'Galerie',
  place_of_worship: 'Kostel', parking: 'Parkoviště', fuel: 'Čerpací stanice',
  supermarket: 'Supermarket', convenience: 'Potraviny', bakery: 'Pekárna',
  hotel: 'Hotel', hostel: 'Hostel', information: 'Informace', other: 'Ostatní'
};

export const CATEGORY_ICONS = {
  toilets: '🚻', restaurant: '🍽️', cafe: '☕', bar: '🍺', pub: '🍺',
  fast_food: '🍔', pharmacy: '💊', hospital: '🏥', clinic: '⚕️', doctors: '👨‍⚕️',
  bank: '🏦', post_office: '📮', library: '📚', theatre: '🎭', cinema: '🎬',
  museum: '🏛️', gallery: '🖼️', supermarket: '🛒', hotel: '🏨', parking: '🅿️'
};

export const FILTER_GROUPS = [
  { key: 'wc', label: 'WC', icon: '🚻', categories: ['toilets'] },
  { key: 'food', label: 'Jídlo', icon: '🍽️', categories: ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'bakery'] },
  { key: 'shops', label: 'Obchody', icon: '🛒', categories: ['supermarket', 'convenience', 'clothes', 'shoes', 'electronics', 'optician', 'hairdresser'] },
  { key: 'health', label: 'Zdraví', icon: '💊', categories: ['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'] },
  { key: 'culture', label: 'Kultura', icon: '🎭', categories: ['theatre', 'cinema', 'museum', 'gallery', 'library'] },
];

export const SURFACE_LABELS = {
  asphalt: 'asfalt', concrete: 'beton', paving_stones: 'dlažba',
  'concrete:plates': 'betonové desky', cobblestone: 'kostky',
  sett: 'žulové kostky', compacted: 'zhutněný štěrk',
  fine_gravel: 'jemný štěrk', gravel: 'štěrk', sand: 'písek',
  grass: 'tráva', dirt: 'hlína', mud: 'bláto', wood: 'dřevo'
};

export const SMOOTHNESS_LABELS = {
  excellent: 'vynikající', good: 'dobrá', intermediate: 'střední',
  bad: 'špatná', very_bad: 'velmi špatná', horrible: 'hrozná'
};

export const BARRIER_TYPES = [
  { value: 'steps', label: 'Schody' },
  { value: 'high_kerb', label: 'Vysoký obrubník' },
  { value: 'narrow_passage', label: 'Úzký průchod' },
  { value: 'steep_slope', label: 'Strmý svah' },
  { value: 'bad_surface', label: 'Špatný povrch' },
  { value: 'construction', label: 'Stavba/uzavírka' },
  { value: 'no_ramp', label: 'Chybí rampa' },
  { value: 'other', label: 'Jiné' }
];

// Offline tile config (CARTO Voyager)
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
export const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

// Offline config
export const OFFLINE_TILE_ZOOMS = [12, 13, 14, 15, 16];
