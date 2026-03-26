export const PRAGUE_CENTER = [50.0755, 14.4378];

export const WHEELCHAIR_COLORS = {
  yes: '#16a34a', limited: '#ca8a04', no: '#dc2626', unknown: '#9ca3af'
};

export const SCORE_COLORS = { 0: '#9ca3af', 1: '#16a34a', 2: '#ca8a04', 3: '#dc2626' };

export const CATEGORY_ICONS = {
  toilets: '🚻', restaurant: '🍽️', cafe: '☕', bar: '🍺', pub: '🍺',
  fast_food: '🍔', pharmacy: '💊', hospital: '🏥', clinic: '⚕️', doctors: '👨‍⚕️',
  bank: '🏦', post_office: '📮', library: '📚', theatre: '🎭', cinema: '🎬',
  museum: '🏛️', gallery: '🖼️', supermarket: '🛒', hotel: '🏨', parking: '🅿️'
};

export const FILTER_GROUPS = [
  { key: 'wc', icon: '🚻', categories: ['toilets'] },
  { key: 'food', icon: '🍽️', categories: ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'bakery'] },
  { key: 'shops', icon: '🛒', categories: ['supermarket', 'convenience', 'clothes', 'shoes', 'electronics', 'optician', 'hairdresser'] },
  { key: 'health', icon: '💊', categories: ['pharmacy', 'hospital', 'clinic', 'doctors', 'dentist'] },
  { key: 'culture', icon: '🎭', categories: ['theatre', 'cinema', 'museum', 'gallery', 'library'] },
];

export const BARRIER_TYPE_VALUES = [
  'steps', 'high_kerb', 'narrow_passage', 'steep_slope', 'bad_surface', 'construction', 'no_ramp', 'other'
];
