export const MAX_SIZE = 16;
export const MIN_SIZE = 4;

export const COLORS = [
  "#f5d6a6", "#cce7c9", "#bcd8ee", "#f1c4c9",
  "#d8c6ef", "#dce0a8", "#c5eadf", "#f5ccb0",
  "#bdd9ce", "#e8d1aa", "#cfd6f4", "#e9bfd9"
];

export const AVATARS = [
  "#d5573b", "#2f7d6d", "#4472c4", "#d19326",
  "#874c9c", "#3e8f4f", "#a33d63", "#68727a",
  "#b86b35", "#4d7f9f", "#7a6f2b", "#be4f73",
  "#235f78", "#97573f", "#5f6fb8", "#337f40"
];

export const DEFAULT_OBJECT_RULES = {
  arbol: { name: "arbol", occupiable: false },
  arbusto: { name: "arbusto", occupiable: false },
  banco: { name: "banco", occupiable: true },
  agua: { name: "agua", occupiable: false },
  fuente: { name: "fuente", occupiable: false },
  mesa: { name: "mesa", occupiable: true },
  silla: { name: "silla", occupiable: true },
  flor: { name: "flor", occupiable: false },
  caja: { name: "caja", occupiable: false },
  puerta: { name: "puerta", occupiable: true },
  ventana: { name: "ventana", occupiable: false },
  piedra: { name: "piedra", occupiable: false },
  lampara: { name: "lampara", occupiable: false },
  cama: { name: "cama", occupiable: true },
  sofa: { name: "sofa", occupiable: true },
  alfombra: { name: "alfombra", occupiable: true },
  estante: { name: "estante", occupiable: false },
  librero: { name: "librero", occupiable: false },
  gabinete: { name: "gabinete", occupiable: false },
  fregadero: { name: "fregadero", occupiable: false },
  estufa: { name: "estufa", occupiable: false },
  refrigerador: { name: "refrigerador", occupiable: false },
  barril: { name: "barril", occupiable: false },
  estatua: { name: "estatua", occupiable: false },
  fogata: { name: "fogata", occupiable: false },
  pozo: { name: "pozo", occupiable: false },
  escalera: { name: "escalera", occupiable: true },
  escritorio: { name: "escritorio", occupiable: true },
  planta: { name: "planta", occupiable: false },
  herramienta: { name: "herramienta", occupiable: false },
  carro: { name: "carro", occupiable: false },
  piano: { name: "piano", occupiable: false }
};

export const OBJECTS = [
  { id: "armchair", png: true, name: "sillon" },
  { id: "basin", png: true, name: "palangana" },
  { id: "beach_ball", png: true, name: "pelota de playa" },
  { id: "beach_umbrella", png: true, name: "sombrilla" },
  { id: "books", png: true, name: "libros" },
  { id: "bush", png: true, name: "arbusto" },
  { id: "car", png: true, name: "auto" },
  { id: "chair", png: true, name: "silla" },
  { id: "chest", png: true, name: "cofre" },
  { id: "closet", png: true, name: "armario", w: 2 },
  { id: "couch", png: true, name: "sofa" },
  { id: "countertop_shelf", png: true, name: "estante de mesada" },
  { id: "floor_clock", png: true, name: "reloj de pie" },
  { id: "flowers", png: true, name: "flores" },
  { id: "fridge", png: true, name: "nevera" },
  { id: "frontal_bed", png: true, name: "cama frontal", h: 2 },
  { id: "horizontal_bed", png: true, name: "cama horizontal", w: 2 },
  { id: "horizontal_carpet", png: true, name: "alfombra horizontal", w: 2 },
  { id: "ink", png: true, name: "tinta" },
  { id: "lamp", png: true, name: "lampara" },
  { id: "letter", png: true, name: "carta" },
  { id: "mirror", png: true, name: "espejo" },
  { id: "oil_stain", png: true, name: "mancha de aceite" },
  { id: "old_tv", png: true, name: "tv vieja" },
  { id: "patch_of_soil", png: true, name: "parche de tierra" },
  { id: "radio", png: true, name: "radio" },
  { id: "rock", png: true, name: "roca" },
  { id: "rug", png: true, name: "alfombra" },
  { id: "shed", png: true, name: "cobertizo" },
  { id: "shelf", png: true, name: "estante" },
  { id: "shower", png: true, name: "ducha" },
  { id: "small_table", png: true, name: "mesa pequena" },
  { id: "soccer_ball", png: true, name: "pelota de futbol" },
  { id: "stove", png: true, name: "estufa" },
  { id: "table", png: true, name: "mesa" },
  { id: "toilet", png: true, name: "inodoro" },
  { id: "toy", png: true, name: "juguete" },
  { id: "tree", png: true, name: "arbol" },
  { id: "tub", png: true, name: "tina" },
  { id: "vertical_car", png: true, name: "auto vertical", h: 2 },
  { id: "vertical_carpet", png: true, name: "alfombra vertical", h: 2 },
  { id: "vertical_table", png: true, name: "mesa vertical", h: 2 },
  { id: "wood_box", png: true, name: "caja de madera" },
];

export const TEXTURES = [
  { id: "plain",                 name: "liso",              png: false },
  { id: "grass",                 name: "pasto",             png: true },
  { id: "wood",                  name: "madera",            png: true },
  { id: "light_wood",            name: "madera clara",      png: true },
  { id: "dark_wood",             name: "madera oscura",     png: true },
  { id: "gray_wood",             name: "madera gris",       png: true },
  { id: "hardwood_floor",        name: "parquet",           png: true },
  { id: "dark_hardwood_floor",   name: "parquet oscuro",    png: true },
  { id: "white_terrazzo",        name: "terrazo blanco",    png: true },
  { id: "black_terrazzo",        name: "terrazo negro",     png: true },
  { id: "terrazzo",              name: "terrazo",           png: true },
  { id: "tile",                  name: "azulejo",           png: true },
  { id: "mosaic_tile",           name: "azulejo mosaico",   png: true },
  { id: "brick",                 name: "ladrillo",          png: true },
  { id: "dark_brick",            name: "ladrillo oscuro",   png: true },
  { id: "stone_path",            name: "camino de piedra",  png: true },
  { id: "dark_stone",            name: "piedra oscura",     png: true },
  { id: "sand",                  name: "arena",             png: true },
  { id: "mud",                   name: "barro",             png: true },
  { id: "dark_earth",            name: "tierra oscura",     png: true },
  { id: "water",                 name: "agua",              png: true },
  { id: "dark_water",            name: "agua oscura",       png: true },
  { id: "water_plant",           name: "planta de agua",    png: true }
];

export function findObject(id) {
  return OBJECTS.find((o) => o.id === id);
}

export function objectAssetForKey(key) {
  const exact = {
    arbol: "tree", arbusto: "bush", banco: "bench", agua: "water", fuente: "fountain",
    mesa: "table", silla: "chair", flor: "flower", caja: "box", puerta: "door",
    ventana: "window", piedra: "rock", lampara: "lamp", cama: "bed", sofa: "couch",
    alfombra: "rug", estante: "shelf", librero: "bookcase", gabinete: "cabinet",
    fregadero: "sink", estufa: "stove", refrigerador: "fridge", barril: "barrel",
    estatua: "statue", fogata: "campfire", pozo: "well", escalera: "stairs",
    escritorio: "desk", planta: "plant", herramienta: "tools", carro: "car", piano: "piano"
  };
  if (exact[key]) return exact[key];
  const partials = [
    ["arbol", "tree"], ["arbust", "bush"], ["banco", "bench"], ["agua", "water"], ["lago", "water"],
    ["estanque", "water"], ["fuente", "fountain"], ["mesa", "table"], ["silla", "chair"], ["flor", "flower"],
    ["caja", "box"], ["puerta", "door"], ["ventana", "window"], ["piedra", "rock"], ["roca", "rock"],
    ["lampara", "lamp"], ["cama", "bed"], ["sofa", "couch"], ["alfombra", "rug"], ["estante", "shelf"],
    ["librero", "bookcase"], ["libro", "bookcase"], ["gabinete", "cabinet"], ["fregadero", "sink"],
    ["lavabo", "sink"], ["estufa", "stove"], ["refrigerador", "fridge"], ["nevera", "fridge"],
    ["barril", "barrel"], ["estatua", "statue"], ["fogata", "campfire"], ["pozo", "well"],
    ["escalera", "stairs"], ["escritorio", "desk"], ["planta", "plant"], ["herramienta", "tools"],
    ["carro", "car"], ["coche", "car"], ["piano", "piano"]
  ];
  return partials.find(([needle]) => key.includes(needle))?.[1] || "";
}

export const sampleCase = {
  id: "backyard-sample",
  title: "El jardin trasero",
  difficulty: "Facil",
  size: 6,
  victim: { name: "Violet", row: 3, col: 3 },
  suspects: [
    { id: "ana", name: "Ana", color: AVATARS[0] },
    { id: "bruno", name: "Bruno", color: AVATARS[1] },
    { id: "carissa", name: "Carissa", color: AVATARS[2] },
    { id: "dario", name: "Dario", color: AVATARS[3] },
    { id: "elena", name: "Elena", color: AVATARS[4] },
    { id: "felix", name: "Felix", color: AVATARS[5] }
  ],
  regions: [
    [0,0,1,1,2,2],
    [0,0,1,1,2,2],
    [3,3,4,4,4,2],
    [3,3,4,4,4,5],
    [6,6,6,7,7,5],
    [6,6,7,7,5,5]
  ],
  regionNames: ["terraza", "huerto", "estanque", "cobertizo", "patio", "sendero", "jardin", "pergola"],
  regionTextures: ["grass", "wood", "wood", "wood", "plain", "plain", "grass", "wood"],
  objects: {
    "0,0": { id: "table" },
    "0,4": { id: "tree" },
    "1,2": { id: "wood_box" },
    "2,0": { id: "bush" },
    "3,5": { id: "couch" },
    "4,1": { id: "horizontal_bed" },
    "5,4": { id: "small_table" }
  },
  objectRules: DEFAULT_OBJECT_RULES,
  clues: [
    "Cada sospechoso ocupa una fila y una columna distintas.",
    "La victima esta en el patio central.",
    "Carissa estaba sola en la misma zona que Violet.",
    "Bruno no estaba junto al estanque.",
    "Elena estaba cerca de una flor."
  ],
  solution: {
    ana: { row: 0, col: 2 },
    bruno: { row: 1, col: 5 },
    carissa: { row: 3, col: 4 },
    dario: { row: 2, col: 0 },
    elena: { row: 4, col: 1 },
    felix: { row: 5, col: 3 }
  },
  murderer: "carissa"
};
