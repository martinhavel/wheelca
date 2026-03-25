// Shared city definitions for backend and frontend
const CITIES = {
  prague: {
    id: 'prague',
    name: { cs: 'Praha', en: 'Prague', de: 'Prag' },
    center: [50.0755, 14.4378],
    zoom: 15,
    bbox: { minLat: 49.94, maxLat: 50.18, minLng: 14.22, maxLng: 14.71 },
  },
  brno: {
    id: 'brno',
    name: { cs: 'Brno', en: 'Brno', de: 'Brünn' },
    center: [49.1951, 16.6068],
    zoom: 15,
    bbox: { minLat: 49.12, maxLat: 49.28, minLng: 16.48, maxLng: 16.74 },
  },
  ostrava: {
    id: 'ostrava',
    name: { cs: 'Ostrava', en: 'Ostrava', de: 'Ostrau' },
    center: [49.8209, 18.2625],
    zoom: 15,
    bbox: { minLat: 49.76, maxLat: 49.88, minLng: 18.14, maxLng: 18.38 },
  },
  plzen: {
    id: 'plzen',
    name: { cs: 'Plzeň', en: 'Pilsen', de: 'Pilsen' },
    center: [49.7384, 13.3736],
    zoom: 15,
    bbox: { minLat: 49.70, maxLat: 49.78, minLng: 13.28, maxLng: 13.46 },
  },
};

export { CITIES };
export default CITIES;
