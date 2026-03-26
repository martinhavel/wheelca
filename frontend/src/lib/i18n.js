const translations = {
  cs: {
    title: 'Bezbariérová mapa',
    offline: 'OFFLINE',
    help: '? Nápověda',
    helpClose: 'Zavřít nápovědu',

    // Help
    helpMapTitle: 'Co zobrazuje mapa?',
    helpMapText: 'Mapa ukazuje přístupnost ulic, chodníků a budov pro lidi na vozíku. Vyber město z nabídky výše. Data pocházejí z OpenStreetMap a hlášení komunity.',
    helpLinesTitle: 'Barevné čáry = chodníky a cesty',
    helpGreen: 'sjízdný povrch (asfalt, dlažba, beton)',
    helpYellow: 'omezeně sjízdný (zhutněný štěrk, ploské kostky)',
    helpRed: 'nesjízdný povrch',
    helpGray: 'neznámé',
    helpDotsTitle: 'Barevné tečky = budovy a místa',
    helpDotGreen: 'plně bezbariérové',
    helpDotYellow: 'částečně přístupné',
    helpDotRed: 'nepřístupné',
    helpHowTitle: 'Jak používat?',
    helpZoom: 'Přibliž mapu (zoom 14+) a data se načtou automaticky',
    helpClick: 'Klikni na čáru/tečku pro detail',
    helpRoute: 'Najdi trasu - klikni na start, pak na cíl',
    helpRightClick: 'Pravý klik = nahlásit bariéru',
    helpOffline: 'Offline data - stáhni si Prahu pro použití bez internetu',

    // Stats
    statAccessible: 'přístupných',
    statBarriers: 'Bariér',
    statFootways: 'chodníků',
    statTotal: 'Celkem míst',
    statWc: 'WC',

    // Layers
    layers: 'Vrstvy',
    layerPois: 'Místa a budovy',
    layerFootways: 'Chodníky',
    layerBarriers: 'Bariéry',

    // Navigation
    navigation: 'Navigace',
    findRoute: 'Naplánovat trasu',
    cancel: 'Zrušit',
    clickStart: 'Klikněte na mapu — výchozí bod',
    clickEnd: 'Klikněte na mapu — cíl',
    startPoint: 'výchozí bod',
    destination: 'cíl',
    server: 'Server',
    rightClickHint: 'Pravý klik na mapu = nahlásit bariéru',

    // Route info
    offlineRoute: 'Offline trasa',
    mostAccessible: 'nejpřístupnější',
    shortestRoute: 'nejkratší',
    wheelchairRoute: 'Bezbariérová trasa',
    footRoute: 'Pěší trasa (bez wheelchair dat)',
    pctAccessible: '% přístupné',
    pctLimited: '% omezené',
    pctBad: '% špatné',
    pctUnknown: '% neznámé',
    clearRoute: 'Zrušit trasu',

    // Import
    importTitle: 'Data',
    importBtn: 'Načíst data z OSM',
    importing: 'Načítám...',
    importDesc: 'Importuje místa, chodníky a WC z OpenStreetMap pro zobrazený výřez. Přibližte mapu (zoom 14+).',

    // Toasts
    toastClickStart: 'Klikni na start trasy',
    toastClickEnd: 'Klikněte na cíl trasy',
    toastCalculating: 'Počítám trasu...',
    toastOfflineNoRoute: 'Routing není dostupný offline',
    toastBuildingGraph: 'Stavím graf...',
    toastNoOfflineData: 'Offline routing není k dispozici - stáhni offline data',
    toastLoadingOSM: 'Načítám data z OpenStreetMap...',
    toastLoaded: 'Načteno:',
    toastPlaces: 'míst',
    toastSidewalks: 'chodníků',
    toastOfflineCache: 'Offline režim - data z cache',
    toastLoadError: 'Nepodařilo se načíst data',
    toastBarrierReported: 'Bariéra nahlášena',
    toastBarrierOffline: 'Bariéra uložena offline - synchronizuje se po připojení',
    toastRatingSent: 'Hodnocení odesláno!',
    toastRatingOffline: 'Hodnocení uloženo offline - synchronizuje se po připojení',
    toastSynced: 'Synchronizováno',
    toastBarriersSync: 'bariér',
    toastOfflineRouteLabel: 'Offline trasa:',
    toastFootRouteLabel: 'Pěší trasa:',
    toastWheelchairRouteLabel: 'Bezbariérová trasa:',
    toastImported: 'Načteno:',
    toastImportPlaces: 'míst',
    toastImportSidewalks: 'chodníků',
    toastImportError: 'Chyba při importu',
    toastLocationFound: 'Poloha nalezena',
    toastLocationError: 'Nepodařilo se zjistit polohu',
    toastPositionSet: 'Pozice nastavena',
    toastSearchingWc: 'Hledám nejbližší WC...',
    toastNoWcFound: 'Žádné WC v okolí nenalezeno',
    toastEnableLocation: 'Zapněte polohu pro nalezení WC',
    toastRouteError: 'Chyba: ',

    // Report dialog
    reportTitle: 'Nahlásit bariéru',
    reportOfflineNote: 'Offline - bariéra se uloží lokálně a synchronizuje po připojení',
    reportPosition: 'Pozice:',
    reportDescPlaceholder: 'Volitelný popis...',
    reportSeverity: 'Závažnost:',
    reportSeverityMild: 'Mírná',
    reportSeverityMedium: 'Střední',
    reportSeverityBlocking: 'Blokující',
    reportBarrierType: 'Typ bariéry',
    reportDescription: 'Popis',
    reportSubmit: 'Odeslat',

    // Rating dialog
    rateTitle: 'Ohodnotit místo',
    rateOfflineNote: 'Offline - hodnocení se synchronizuje po připojení',
    rateBtn: 'Ohodnotit',
    rateSubmit: 'Odeslat hodnocení',
    rateCommentPlaceholder: 'Komentář (volitelné)...',

    // Popup
    noName: 'Bez názvu',
    sidewalk: 'Chodník',
    surface: 'Povrch',
    smoothness: 'Hladkost',
    slope: 'Sklon',
    accessibility: 'Přístupnost',
    severity: 'Závažnost',
    verified: 'Ověřeno',
    unverified: 'Neověřeno',
    fee: 'Poplatek',
    feeYes: 'Ano',
    feeNo: 'Ne',
    openingHours: 'Otevírací doba',
    access: 'Přístup',
    barrier: 'Bariéra',

    // Quick actions
    myLocation: 'Moje poloha',
    nearestWc: 'Nejbližší WC',

    // Filter
    filterCategories: 'Filtr kategorií',
    filterAll: 'Vše',
    filterFood: 'Jídlo',
    filterShops: 'Obchody',
    filterHealth: 'Zdraví',
    filterCulture: 'Kultura',

    // Legend
    legend: 'Legenda',
    legendPlaces: 'Místa',
    legendSidewalks: 'Chodníky',

    // Zoom hint
    zoomHint: 'Přibližte mapu pro zobrazení dat',

    // Offline manager
    offlineData: 'Offline data',
    online: 'Online',
    offlineLabel: 'Offline',
    syncing: 'Synchronizuji...',
    offlineAvailable: 'Offline data k dispozici',
    places: 'míst',
    sidewalks: 'chodníků',
    barriers: 'bariér',
    tilesInCache: 'dlaždic v cache',
    pendingSync: 'Čeká na sync:',
    pendingRatings: 'hodnocení',
    pendingBarriers: 'bariér',
    lastSync: 'Poslední sync:',
    syncedLabel: 'Synchronizováno:',
    syncBarriers: 'bariér',
    syncRatings: 'hodnocení',
    syncPoisUpdated: 'POI aktualizováno',
    syncFootwaysUpdated: 'chodníků aktualizováno',
    syncBarriersUpdated: 'bariér aktualizováno',
    availableData: 'K dispozici:',
    estimatedSize: 'Odhad velikosti:',
    downloadPrague: 'Stáhnout Prahu',
    updateAll: 'Aktualizovat vše',
    synchronize: 'Synchronizovat',
    syncDots: 'Sync...',
    deleteData: 'Smazat',
    noDataOffline: 'Nejste online a nemáte stažena offline data.',
    downloadingData: 'Stahování dat...',
    savingPOI: 'Ukládání POI...',
    savingSidewalks: 'Ukládání chodníků...',
    savingBarriers: 'Ukládání bariér...',
    dataSaved: 'Data uložena!',
    downloadError: 'Chyba stahování dat:',
    generatingTiles: 'Generování seznamu dlaždic...',
    downloadingTiles: 'Stahování',
    tiles: 'dlaždic...',
    done: 'Hotovo!',
    dataSavedNoSW: 'Data uložena (dlaždice bez SW)',

    // Barrier types
    barrierSteps: 'Schody',
    barrierKerb: 'Vysoký obrubník',
    barrierNarrow: 'Úzký průchod',
    barrierSlope: 'Strmý svah',
    barrierSurface: 'Špatný povrch',
    barrierConstruction: 'Stavba/uzavírka',
    barrierNoRamp: 'Chybí rampa',
    barrierOther: 'Jiné',

    // Wheelchair
    wheelchairYes: 'Bezbariérové',
    wheelchairLimited: 'Omezeně přístupné',
    wheelchairNo: 'Nepřístupné',
    wheelchairUnknown: 'Neznámé',

    // Rating options
    rateYes: 'Přístupné',
    rateYesDesc: 'Bezbariérový vstup, široké dveře, bez schodů',
    rateLimited: 'Omezené',
    rateLimitedDesc: 'Částečně přístupné, menší překážky',
    rateNo: 'Nepřístupné',
    rateNoDesc: 'Schody, úzký vstup, bez rampy',
    rateSuccess: 'Hodnocení odesláno',
    rateError: 'Chyba při odesílání hodnocení',

    // Score labels
    scoreUnknown: 'Neznámý',
    scoreGood: 'Přístupný',
    scoreLimited: 'Omezeně',
    scoreBad: 'Nepřístupný',

    // City & sharing
    selectCity: 'Město:',
    gpxExport: 'GPX',
    gpxExported: 'GPX trasa stažena',
    shareUrl: 'Sdílet',
    urlCopied: 'URL zkopírováno do schránky',

    // Search & geo
    searchPlaceholder: 'Hledat místo nebo adresu...',
    searchBtn: 'Hledat',
    searchNoResults: 'Nic nenalezeno',
    searchError: 'Chyba vyhledávání',
    geoLocate: 'Moje poloha',
    geoLocating: 'Hledám polohu...',
    geoError: 'Nepodařilo se zjistit polohu',
    geoNotSupported: 'Geolokace není podporována',

    // Offline packages
    offlinePackages: 'Offline balíčky',
    downloadCity: 'Stáhnout',

    // Language
    language: 'Jazyk',
  },

  en: {
    title: 'Accessible Map',
    offline: 'OFFLINE',
    help: '? Help',
    helpClose: 'Close help',

    helpMapTitle: 'What does the map show?',
    helpMapText: 'The map shows accessibility of streets, sidewalks and buildings for wheelchair users. Select a city from the buttons above. Data comes from OpenStreetMap and community reports.',
    helpLinesTitle: 'Colored lines = sidewalks and paths',
    helpGreen: 'smooth surface (asphalt, pavement, concrete)',
    helpYellow: 'partially accessible (compacted gravel, flat cobblestones)',
    helpRed: 'inaccessible surface',
    helpGray: 'unknown',
    helpDotsTitle: 'Colored dots = buildings and places',
    helpDotGreen: 'fully accessible',
    helpDotYellow: 'partially accessible',
    helpDotRed: 'inaccessible',
    helpHowTitle: 'How to use?',
    helpZoom: 'Zoom in (zoom 14+) and data loads automatically',
    helpClick: 'Click on a line/dot for details',
    helpRoute: 'Find route - click start, then destination',
    helpRightClick: 'Right-click = report a barrier',
    helpOffline: 'Offline data - download Prague for use without internet',

    statAccessible: 'accessible',
    statBarriers: 'Barriers',
    statFootways: 'sidewalks',
    statTotal: 'Total places',
    statWc: 'WC',

    layers: 'Layers',
    layerPois: 'Places & buildings',
    layerFootways: 'Sidewalks',
    layerBarriers: 'Barriers',

    navigation: 'Navigation',
    findRoute: 'Plan route',
    cancel: 'Cancel',
    clickStart: 'Click on the map — start point',
    clickEnd: 'Click on the map — destination',
    startPoint: 'start point',
    destination: 'destination',
    server: 'Server',
    rightClickHint: 'Right-click on map = report barrier',

    offlineRoute: 'Offline route',
    mostAccessible: 'most accessible',
    shortestRoute: 'shortest',
    wheelchairRoute: 'Wheelchair route',
    footRoute: 'Walking route (no wheelchair data)',
    pctAccessible: '% accessible',
    pctLimited: '% limited',
    pctBad: '% bad',
    pctUnknown: '% unknown',
    clearRoute: 'Clear route',

    importTitle: 'Data',
    importBtn: 'Load data from OSM',
    importing: 'Loading...',
    importDesc: 'Imports places, sidewalks and WC from OpenStreetMap for the visible area. Zoom in (14+).',

    toastClickStart: 'Click on route start',
    toastClickEnd: 'Click on route destination',
    toastCalculating: 'Calculating route...',
    toastOfflineNoRoute: 'Routing not available offline',
    toastBuildingGraph: 'Building graph...',
    toastNoOfflineData: 'Offline routing not available - download offline data',
    toastLoadingOSM: 'Loading data from OpenStreetMap...',
    toastLoaded: 'Loaded:',
    toastPlaces: 'places',
    toastSidewalks: 'sidewalks',
    toastOfflineCache: 'Offline mode - data from cache',
    toastLoadError: 'Failed to load data',
    toastBarrierReported: 'Barrier reported',
    toastBarrierOffline: 'Barrier saved offline - will sync when connected',
    toastRatingSent: 'Rating submitted!',
    toastRatingOffline: 'Rating saved offline - will sync when connected',
    toastSynced: 'Synced',
    toastBarriersSync: 'barriers',
    toastOfflineRouteLabel: 'Offline route:',
    toastFootRouteLabel: 'Walking route:',
    toastWheelchairRouteLabel: 'Wheelchair route:',
    toastImported: 'Loaded:',
    toastImportPlaces: 'places',
    toastImportSidewalks: 'sidewalks',
    toastImportError: 'Import error',
    toastLocationFound: 'Location found',
    toastLocationError: 'Could not determine location',
    toastPositionSet: 'Position set',
    toastSearchingWc: 'Searching for nearest WC...',
    toastNoWcFound: 'No WC found nearby',
    toastEnableLocation: 'Enable location to find WC',
    toastRouteError: 'Error: ',

    reportTitle: 'Report barrier',
    reportOfflineNote: 'Offline - barrier will be saved locally and synced when connected',
    reportPosition: 'Position:',
    reportDescPlaceholder: 'Optional description...',
    reportSeverity: 'Severity:',
    reportSeverityMild: 'Mild',
    reportSeverityMedium: 'Medium',
    reportSeverityBlocking: 'Blocking',
    reportBarrierType: 'Barrier type',
    reportDescription: 'Description',
    reportSubmit: 'Submit',

    rateTitle: 'Rate this place',
    rateOfflineNote: 'Offline - rating will sync when connected',
    rateBtn: 'Rate',
    rateSubmit: 'Submit rating',
    rateCommentPlaceholder: 'Comment (optional)...',

    noName: 'No name',
    sidewalk: 'Sidewalk',
    surface: 'Surface',
    smoothness: 'Smoothness',
    slope: 'Slope',
    accessibility: 'Accessibility',
    severity: 'Severity',
    verified: 'Verified',
    unverified: 'Unverified',
    fee: 'Fee',
    feeYes: 'Yes',
    feeNo: 'No',
    openingHours: 'Opening hours',
    access: 'Access',
    barrier: 'Barrier',

    myLocation: 'My location',
    nearestWc: 'Nearest WC',

    filterCategories: 'Category filter',
    filterAll: 'All',
    filterFood: 'Food',
    filterShops: 'Shops',
    filterHealth: 'Health',
    filterCulture: 'Culture',

    legend: 'Legend',
    legendPlaces: 'Places',
    legendSidewalks: 'Sidewalks',

    zoomHint: 'Zoom in to display data',

    offlineData: 'Offline data',
    online: 'Online',
    offlineLabel: 'Offline',
    syncing: 'Syncing...',
    offlineAvailable: 'Offline data available',
    places: 'places',
    sidewalks: 'sidewalks',
    barriers: 'barriers',
    tilesInCache: 'tiles in cache',
    pendingSync: 'Pending sync:',
    pendingRatings: 'ratings',
    pendingBarriers: 'barriers',
    lastSync: 'Last sync:',
    syncedLabel: 'Synced:',
    syncBarriers: 'barriers',
    syncRatings: 'ratings',
    syncPoisUpdated: 'POIs updated',
    syncFootwaysUpdated: 'sidewalks updated',
    syncBarriersUpdated: 'barriers updated',
    availableData: 'Available:',
    estimatedSize: 'Estimated size:',
    downloadPrague: 'Download Prague',
    updateAll: 'Update all',
    synchronize: 'Synchronize',
    syncDots: 'Sync...',
    deleteData: 'Delete',
    noDataOffline: 'You are offline and have no downloaded data.',
    downloadingData: 'Downloading data...',
    savingPOI: 'Saving POIs...',
    savingSidewalks: 'Saving sidewalks...',
    savingBarriers: 'Saving barriers...',
    dataSaved: 'Data saved!',
    downloadError: 'Download error:',
    generatingTiles: 'Generating tile list...',
    downloadingTiles: 'Downloading',
    tiles: 'tiles...',
    done: 'Done!',
    dataSavedNoSW: 'Data saved (tiles without SW)',

    barrierSteps: 'Steps',
    barrierKerb: 'High kerb',
    barrierNarrow: 'Narrow passage',
    barrierSlope: 'Steep slope',
    barrierSurface: 'Bad surface',
    barrierConstruction: 'Construction',
    barrierNoRamp: 'No ramp',
    barrierOther: 'Other',

    wheelchairYes: 'Accessible',
    wheelchairLimited: 'Partially accessible',
    wheelchairNo: 'Inaccessible',
    wheelchairUnknown: 'Unknown',

    rateYes: 'Accessible',
    rateYesDesc: 'Step-free entrance, wide doors, no stairs',
    rateLimited: 'Limited',
    rateLimitedDesc: 'Partially accessible, minor obstacles',
    rateNo: 'Inaccessible',
    rateNoDesc: 'Steps, narrow entrance, no ramp',
    rateSuccess: 'Rating submitted',
    rateError: 'Error submitting rating',

    scoreUnknown: 'Unknown',
    scoreGood: 'Accessible',
    scoreLimited: 'Limited',
    scoreBad: 'Inaccessible',

    selectCity: 'City:',
    gpxExport: 'GPX',
    gpxExported: 'GPX route downloaded',
    shareUrl: 'Share',
    urlCopied: 'URL copied to clipboard',

    searchPlaceholder: 'Search place or address...',
    searchBtn: 'Search',
    searchNoResults: 'No results found',
    searchError: 'Search error',
    geoLocate: 'My location',
    geoLocating: 'Finding location...',
    geoError: 'Could not determine location',
    geoNotSupported: 'Geolocation not supported',

    offlinePackages: 'Offline packages',
    downloadCity: 'Download',

    language: 'Language',
  },

  de: {
    title: 'Barrierefreie Karte',
    offline: 'OFFLINE',
    help: '? Hilfe',
    helpClose: 'Hilfe schliessen',

    helpMapTitle: 'Was zeigt die Karte?',
    helpMapText: 'Die Karte zeigt die Barrierefreiheit von Strassen, Gehwegen und Gebaeuden fuer Rollstuhlfahrer. Waehlen Sie oben eine Stadt aus. Daten stammen aus OpenStreetMap und Community-Meldungen.',
    helpLinesTitle: 'Farbige Linien = Gehwege und Wege',
    helpGreen: 'glatter Belag (Asphalt, Pflaster, Beton)',
    helpYellow: 'eingeschraenkt befahrbar (verdichteter Kies, flache Pflastersteine)',
    helpRed: 'unbefahrbarer Belag',
    helpGray: 'unbekannt',
    helpDotsTitle: 'Farbige Punkte = Gebaeude und Orte',
    helpDotGreen: 'voll barrierefrei',
    helpDotYellow: 'teilweise barrierefrei',
    helpDotRed: 'nicht barrierefrei',
    helpHowTitle: 'Wie benutzen?',
    helpZoom: 'Karte vergroessern (Zoom 14+), Daten laden automatisch',
    helpClick: 'Auf Linie/Punkt klicken fuer Details',
    helpRoute: 'Route finden - Start anklicken, dann Ziel',
    helpRightClick: 'Rechtsklick = Barriere melden',
    helpOffline: 'Offline-Daten - Prag herunterladen fuer Nutzung ohne Internet',

    statAccessible: 'barrierefrei',
    statBarriers: 'Barrieren',
    statFootways: 'Gehwege',
    statTotal: 'Orte gesamt',
    statWc: 'WC',

    layers: 'Ebenen',
    layerPois: 'Orte & Gebaeude',
    layerFootways: 'Gehwege',
    layerBarriers: 'Barrieren',

    navigation: 'Navigation',
    findRoute: 'Route planen',
    cancel: 'Abbrechen',
    clickStart: 'Klicken Sie auf die Karte — Startpunkt',
    clickEnd: 'Klicken Sie auf die Karte — Ziel',
    startPoint: 'Startpunkt',
    destination: 'Ziel',
    server: 'Server',
    rightClickHint: 'Rechtsklick auf Karte = Barriere melden',

    offlineRoute: 'Offline-Route',
    mostAccessible: 'barrierefreieste',
    shortestRoute: 'kuerzeste',
    wheelchairRoute: 'Rollstuhlroute',
    footRoute: 'Fussweg (ohne Rollstuhldaten)',
    pctAccessible: '% barrierefrei',
    pctLimited: '% eingeschraenkt',
    pctBad: '% schlecht',
    pctUnknown: '% unbekannt',
    clearRoute: 'Route loeschen',

    importTitle: 'Daten',
    importBtn: 'Daten von OSM laden',
    importing: 'Laden...',
    importDesc: 'Importiert Orte, Gehwege und WC von OpenStreetMap fuer den sichtbaren Bereich. Zoom 14+ erforderlich.',

    toastClickStart: 'Klicken Sie auf den Startpunkt',
    toastClickEnd: 'Klicken Sie auf das Ziel',
    toastCalculating: 'Route wird berechnet...',
    toastOfflineNoRoute: 'Routing offline nicht verfuegbar',
    toastBuildingGraph: 'Graph wird erstellt...',
    toastNoOfflineData: 'Offline-Routing nicht verfuegbar - Offline-Daten herunterladen',
    toastLoadingOSM: 'Daten von OpenStreetMap laden...',
    toastLoaded: 'Geladen:',
    toastPlaces: 'Orte',
    toastSidewalks: 'Gehwege',
    toastOfflineCache: 'Offline-Modus - Daten aus Cache',
    toastLoadError: 'Daten konnten nicht geladen werden',
    toastBarrierReported: 'Barriere gemeldet',
    toastBarrierOffline: 'Barriere offline gespeichert - wird bei Verbindung synchronisiert',
    toastRatingSent: 'Bewertung gesendet!',
    toastRatingOffline: 'Bewertung offline gespeichert - wird bei Verbindung synchronisiert',
    toastSynced: 'Synchronisiert',
    toastBarriersSync: 'Barrieren',
    toastOfflineRouteLabel: 'Offline-Route:',
    toastFootRouteLabel: 'Fussweg:',
    toastWheelchairRouteLabel: 'Rollstuhlroute:',
    toastImported: 'Geladen:',
    toastImportPlaces: 'Orte',
    toastImportSidewalks: 'Gehwege',
    toastImportError: 'Importfehler',
    toastLocationFound: 'Standort gefunden',
    toastLocationError: 'Standort konnte nicht ermittelt werden',
    toastPositionSet: 'Position gesetzt',
    toastSearchingWc: 'Suche naechstes WC...',
    toastNoWcFound: 'Kein WC in der Naehe gefunden',
    toastEnableLocation: 'Standort aktivieren um WC zu finden',
    toastRouteError: 'Fehler: ',

    reportTitle: 'Barriere melden',
    reportOfflineNote: 'Offline - Barriere wird lokal gespeichert und bei Verbindung synchronisiert',
    reportPosition: 'Position:',
    reportDescPlaceholder: 'Optionale Beschreibung...',
    reportSeverity: 'Schweregrad:',
    reportSeverityMild: 'Leicht',
    reportSeverityMedium: 'Mittel',
    reportSeverityBlocking: 'Blockierend',
    reportBarrierType: 'Barrieretyp',
    reportDescription: 'Beschreibung',
    reportSubmit: 'Absenden',

    rateTitle: 'Ort bewerten',
    rateOfflineNote: 'Offline - Bewertung wird bei Verbindung synchronisiert',
    rateBtn: 'Bewerten',
    rateSubmit: 'Bewertung absenden',
    rateCommentPlaceholder: 'Kommentar (optional)...',

    noName: 'Ohne Namen',
    sidewalk: 'Gehweg',
    surface: 'Oberflaeche',
    smoothness: 'Glattheit',
    slope: 'Neigung',
    accessibility: 'Barrierefreiheit',
    severity: 'Schweregrad',
    verified: 'Verifiziert',
    unverified: 'Nicht verifiziert',
    fee: 'Gebuehr',
    feeYes: 'Ja',
    feeNo: 'Nein',
    openingHours: 'Oeffnungszeiten',
    access: 'Zugang',
    barrier: 'Barriere',

    myLocation: 'Mein Standort',
    nearestWc: 'Naechstes WC',

    filterCategories: 'Kategoriefilter',
    filterAll: 'Alle',
    filterFood: 'Essen',
    filterShops: 'Geschaefte',
    filterHealth: 'Gesundheit',
    filterCulture: 'Kultur',

    legend: 'Legende',
    legendPlaces: 'Orte',
    legendSidewalks: 'Gehwege',

    zoomHint: 'Karte vergroessern um Daten anzuzeigen',

    offlineData: 'Offline-Daten',
    online: 'Online',
    offlineLabel: 'Offline',
    syncing: 'Synchronisiere...',
    offlineAvailable: 'Offline-Daten verfuegbar',
    places: 'Orte',
    sidewalks: 'Gehwege',
    barriers: 'Barrieren',
    tilesInCache: 'Kacheln im Cache',
    pendingSync: 'Warten auf Sync:',
    pendingRatings: 'Bewertungen',
    pendingBarriers: 'Barrieren',
    lastSync: 'Letzter Sync:',
    syncedLabel: 'Synchronisiert:',
    syncBarriers: 'Barrieren',
    syncRatings: 'Bewertungen',
    syncPoisUpdated: 'POIs aktualisiert',
    syncFootwaysUpdated: 'Gehwege aktualisiert',
    syncBarriersUpdated: 'Barrieren aktualisiert',
    availableData: 'Verfuegbar:',
    estimatedSize: 'Geschaetzte Groesse:',
    downloadPrague: 'Prag herunterladen',
    updateAll: 'Alles aktualisieren',
    synchronize: 'Synchronisieren',
    syncDots: 'Sync...',
    deleteData: 'Loeschen',
    noDataOffline: 'Sie sind offline und haben keine heruntergeladenen Daten.',
    downloadingData: 'Daten werden heruntergeladen...',
    savingPOI: 'POIs speichern...',
    savingSidewalks: 'Gehwege speichern...',
    savingBarriers: 'Barrieren speichern...',
    dataSaved: 'Daten gespeichert!',
    downloadError: 'Download-Fehler:',
    generatingTiles: 'Kachelliste wird erstellt...',
    downloadingTiles: 'Herunterladen',
    tiles: 'Kacheln...',
    done: 'Fertig!',
    dataSavedNoSW: 'Daten gespeichert (Kacheln ohne SW)',

    barrierSteps: 'Treppen',
    barrierKerb: 'Hohe Bordsteinkante',
    barrierNarrow: 'Enge Passage',
    barrierSlope: 'Steile Neigung',
    barrierSurface: 'Schlechter Belag',
    barrierConstruction: 'Baustelle',
    barrierNoRamp: 'Keine Rampe',
    barrierOther: 'Sonstiges',

    wheelchairYes: 'Barrierefrei',
    wheelchairLimited: 'Eingeschraenkt barrierefrei',
    wheelchairNo: 'Nicht barrierefrei',
    wheelchairUnknown: 'Unbekannt',

    rateYes: 'Barrierefrei',
    rateYesDesc: 'Stufenloser Eingang, breite Tueren, keine Treppen',
    rateLimited: 'Eingeschraenkt',
    rateLimitedDesc: 'Teilweise barrierefrei, kleinere Hindernisse',
    rateNo: 'Nicht barrierefrei',
    rateNoDesc: 'Treppen, enger Eingang, keine Rampe',
    rateSuccess: 'Bewertung gesendet',
    rateError: 'Fehler beim Senden der Bewertung',

    scoreUnknown: 'Unbekannt',
    scoreGood: 'Barrierefrei',
    scoreLimited: 'Eingeschraenkt',
    scoreBad: 'Nicht barrierefrei',

    selectCity: 'Stadt:',
    gpxExport: 'GPX',
    gpxExported: 'GPX-Route heruntergeladen',
    shareUrl: 'Teilen',
    urlCopied: 'URL in Zwischenablage kopiert',

    searchPlaceholder: 'Adresse oder Ort suchen...',
    searchBtn: 'Suchen',
    searchNoResults: 'Keine Ergebnisse',
    searchError: 'Suchfehler',
    geoLocate: 'Mein Standort',
    geoLocating: 'Standort wird gesucht...',
    geoError: 'Standort konnte nicht ermittelt werden',
    geoNotSupported: 'Geolokalisierung nicht unterstuetzt',

    offlinePackages: 'Offline-Pakete',
    downloadCity: 'Herunterladen',

    language: 'Sprache',
  },
};

// Surface translations per language
const SURFACES = {
  cs: {
    asphalt: 'asfalt', concrete: 'beton', paving_stones: 'dlažba',
    'concrete:plates': 'betonové desky', cobblestone: 'kostky',
    sett: 'žulové kostky', compacted: 'zhutněný štěrk',
    fine_gravel: 'jemný štěrk', gravel: 'štěrk', sand: 'písek',
    grass: 'tráva', dirt: 'hlína', mud: 'bláto',
    'cobblestone:flattened': 'ploské kostky', wood: 'dřevo', metal: 'kov'
  },
  en: {
    asphalt: 'asphalt', concrete: 'concrete', paving_stones: 'paving stones',
    'concrete:plates': 'concrete plates', cobblestone: 'cobblestone',
    sett: 'sett', compacted: 'compacted gravel',
    fine_gravel: 'fine gravel', gravel: 'gravel', sand: 'sand',
    grass: 'grass', dirt: 'dirt', mud: 'mud',
    'cobblestone:flattened': 'flat cobblestone', wood: 'wood', metal: 'metal'
  },
  de: {
    asphalt: 'Asphalt', concrete: 'Beton', paving_stones: 'Pflastersteine',
    'concrete:plates': 'Betonplatten', cobblestone: 'Kopfsteinpflaster',
    sett: 'Natursteinpflaster', compacted: 'verdichteter Kies',
    fine_gravel: 'Feinkies', gravel: 'Kies', sand: 'Sand',
    grass: 'Gras', dirt: 'Erde', mud: 'Schlamm',
    'cobblestone:flattened': 'flaches Pflaster', wood: 'Holz', metal: 'Metall'
  },
};

const SMOOTHNESS = {
  cs: { excellent: 'vynikající', good: 'dobrá', intermediate: 'střední', bad: 'špatná', very_bad: 'velmi špatná', horrible: 'hrozná' },
  en: { excellent: 'excellent', good: 'good', intermediate: 'intermediate', bad: 'bad', very_bad: 'very bad', horrible: 'horrible' },
  de: { excellent: 'ausgezeichnet', good: 'gut', intermediate: 'mittel', bad: 'schlecht', very_bad: 'sehr schlecht', horrible: 'furchtbar' },
};

// Category translations
const CATEGORIES = {
  cs: {
    restaurant: 'Restaurace', cafe: 'Kavárna', bar: 'Bar', pub: 'Hospoda',
    fast_food: 'Rychlé občerstvení', pharmacy: 'Lékárna', hospital: 'Nemocnice',
    clinic: 'Klinika', doctors: 'Lékař', dentist: 'Zubař', bank: 'Banka',
    atm: 'Bankomat', post_office: 'Pošta', library: 'Knihovna', school: 'Škola',
    university: 'Univerzita', kindergarten: 'Školka', theatre: 'Divadlo',
    cinema: 'Kino', museum: 'Muzeum', gallery: 'Galerie', place_of_worship: 'Kostel/chrám',
    parking: 'Parkoviště', fuel: 'Čerpací stanice', toilets: 'WC',
    supermarket: 'Supermarket', convenience: 'Potraviny', bakery: 'Pekárna',
    clothes: 'Oblečení', hairdresser: 'Kadeřnictví', optician: 'Optika',
    shoes: 'Obuv', electronics: 'Elektronika', hotel: 'Hotel', hostel: 'Hostel',
    guest_house: 'Penzion', apartment: 'Apartmán', information: 'Informace',
    yes: 'Budova', other: 'Ostatní'
  },
  en: {
    restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar', pub: 'Pub',
    fast_food: 'Fast food', pharmacy: 'Pharmacy', hospital: 'Hospital',
    clinic: 'Clinic', doctors: 'Doctor', dentist: 'Dentist', bank: 'Bank',
    atm: 'ATM', post_office: 'Post office', library: 'Library', school: 'School',
    university: 'University', kindergarten: 'Kindergarten', theatre: 'Theatre',
    cinema: 'Cinema', museum: 'Museum', gallery: 'Gallery', place_of_worship: 'Place of worship',
    parking: 'Parking', fuel: 'Gas station', toilets: 'Toilets',
    supermarket: 'Supermarket', convenience: 'Convenience store', bakery: 'Bakery',
    clothes: 'Clothing', hairdresser: 'Hairdresser', optician: 'Optician',
    shoes: 'Shoes', electronics: 'Electronics', hotel: 'Hotel', hostel: 'Hostel',
    guest_house: 'Guest house', apartment: 'Apartment', information: 'Information',
    yes: 'Building', other: 'Other'
  },
  de: {
    restaurant: 'Restaurant', cafe: 'Cafe', bar: 'Bar', pub: 'Kneipe',
    fast_food: 'Schnellimbiss', pharmacy: 'Apotheke', hospital: 'Krankenhaus',
    clinic: 'Klinik', doctors: 'Arzt', dentist: 'Zahnarzt', bank: 'Bank',
    atm: 'Geldautomat', post_office: 'Postamt', library: 'Bibliothek', school: 'Schule',
    university: 'Universitaet', kindergarten: 'Kindergarten', theatre: 'Theater',
    cinema: 'Kino', museum: 'Museum', gallery: 'Galerie', place_of_worship: 'Gotteshaus',
    parking: 'Parkplatz', fuel: 'Tankstelle', toilets: 'Toiletten',
    supermarket: 'Supermarkt', convenience: 'Lebensmittelladen', bakery: 'Baeckerei',
    clothes: 'Kleidung', hairdresser: 'Friseur', optician: 'Optiker',
    shoes: 'Schuhe', electronics: 'Elektronik', hotel: 'Hotel', hostel: 'Hostel',
    guest_house: 'Pension', apartment: 'Apartment', information: 'Information',
    yes: 'Gebaeude', other: 'Sonstiges'
  },
};

const SUPPORTED_LANGS = [
  { code: 'cs', label: 'CZ' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
];

function getLang() {
  if (typeof window === 'undefined') return 'cs';
  return localStorage.getItem('wheelca-lang') || 'cs';
}

function setLang(lang) {
  localStorage.setItem('wheelca-lang', lang);
}

function t(key, lang) {
  const l = lang || getLang();
  return translations[l]?.[key] || translations.cs[key] || key;
}

function getSurface(key, lang) {
  const l = lang || getLang();
  return SURFACES[l]?.[key] || SURFACES.cs[key] || key;
}

function getSmoothness(key, lang) {
  const l = lang || getLang();
  return SMOOTHNESS[l]?.[key] || SMOOTHNESS.cs[key] || key;
}

function getCategory(key, lang) {
  const l = lang || getLang();
  return CATEGORIES[l]?.[key] || CATEGORIES.cs[key] || key;
}

function getWheelchairLabel(key, lang) {
  const map = { yes: 'wheelchairYes', limited: 'wheelchairLimited', no: 'wheelchairNo', unknown: 'wheelchairUnknown' };
  return t(map[key] || 'wheelchairUnknown', lang);
}

function getScoreLabel(score, lang) {
  const map = { 0: 'scoreUnknown', 1: 'scoreGood', 2: 'scoreLimited', 3: 'scoreBad' };
  return t(map[score] || 'scoreUnknown', lang);
}

function getBarrierTypeLabel(value, lang) {
  const map = {
    steps: 'barrierSteps', high_kerb: 'barrierKerb', narrow_passage: 'barrierNarrow',
    steep_slope: 'barrierSlope', bad_surface: 'barrierSurface', construction: 'barrierConstruction',
    no_ramp: 'barrierNoRamp', other: 'barrierOther'
  };
  return t(map[value] || 'barrierOther', lang);
}

function getSeverityLabel(severity, lang) {
  const map = { 1: 'reportSeverityMild', 2: 'reportSeverityMedium', 3: 'reportSeverityBlocking' };
  return t(map[severity] || 'reportSeverityMedium', lang);
}

function getFilterGroupLabel(key, lang) {
  const map = { wc: 'WC', food: 'filterFood', shops: 'filterShops', health: 'filterHealth', culture: 'filterCulture' };
  if (key === 'wc') return 'WC';
  return t(map[key] || key, lang);
}

export { translations, SUPPORTED_LANGS, getLang, setLang, t, getSurface, getSmoothness, getCategory, getWheelchairLabel, getScoreLabel, getBarrierTypeLabel, getSeverityLabel, getFilterGroupLabel };
