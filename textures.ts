// Procedural 32x32 voxel textures. Every texture is generated at runtime so the
// game ships with crisp, original pixel art instead of external image assets.

export const TILE = 64;
export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 4;

export const TILE_NAMES = [
  "grass_top",
  "grass_side",
  "dirt",
  "stone",
  "cobblestone",
  "sand",
  "sandstone",
  "log_side",
  "log_top",
  "birch_side",
  "birch_top",
  "leaves_oak",
  "leaves_pine",
  "planks",
  "planks_dark",
  "glass",
  "water",
  "snow",
  "gravel",
  "coal_ore",
  "iron_ore",
  "gold_ore",
  "diamond_ore",
  "bricks",
  "glowstone",
  "obsidian",
  "wool_red",
  "wool_yellow",
  "wool_blue",
  "farmland",
  "wheat",
  "path",
  "lantern",
  "bookshelf",
  "crafting_top",
  "crafting_side",
  "bedrock",
  "flower_red",
  "flower_yellow",
  "tall_grass",
  "terracotta",
  "stone_bricks",
  "mossy_cobble",
  "door",
  "lava",
  "ice",
  "hay",
  "top_grass",
  "top_stone",
  "top_dirt",
  "top_sand",
  "top_cobble",
  "top_planks",
  "top_snow",
  "top_bricks",
  "top_path",
  "top_gravel",
  "top_wool",
  "top_farmland",
] as const;

// Surfaces that receive the raised "chunky top" treatment. Sides and bottoms
// intentionally keep the plain, clean Minecraft artwork.
export const RAISED_TOP_FOR: Partial<Record<TileName, TileName>> = {
  grass_top: "top_grass",
  stone: "top_stone",
  dirt: "top_dirt",
  sand: "top_sand",
  cobblestone: "top_cobble",
  planks: "top_planks",
  planks_dark: "top_planks",
  snow: "top_snow",
  bricks: "top_bricks",
  path: "top_path",
  gravel: "top_gravel",
  wool_red: "top_wool",
  wool_yellow: "top_wool",
  wool_blue: "top_wool",
  farmland: "top_farmland",
  log_top: "top_planks",
  birch_top: "top_snow",
};

export type TileName = (typeof TILE_NAMES)[number];

function makeCanvas(w: number, h = w) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function randFactory(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length) % arr.length];

type Ctx = CanvasRenderingContext2D;







// ---------------------------------------------------------------------------
// Classic Minecraft-style 16x16 pixel art.
// Every texture is authored on a 16x16 logical grid and upscaled with nearest
// neighbour to the 32x32 tile, preserving the chunky authentic pixel look.
// ---------------------------------------------------------------------------
type G = (x: number, y: number, w: number, h: number, c: string) => void;

function canvas16(draw: (g: G, r: () => number) => void): (ctx: Ctx) => void {
  return (ctx) => {
    const size = ctx.canvas.width;
    const S = size / 16;
    const g: G = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)));
    };
    const r = randFactory(0);
    draw(g, r);
  };
}

function seeded(draw: (g: G, r: () => number) => void, seed: number): (ctx: Ctx) => void {
  return (ctx) => {
    const size = ctx.canvas.width;
    const S = size / 16;
    const g: G = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S)));
    };
    draw(g, randFactory(seed));
  };
}

const PALE = ["#8f8f8f", "#9a9a9a", "#878787", "#a3a3a3", "#828282", "#969696"];
const GRASS = ["#7ab44f", "#71ac48", "#83bd58", "#69a142", "#8fc564", "#5f9739"];
const DIRT = ["#9a7150", "#8f6849", "#a3795a", "#87603f", "#ad8362"];
const SAND = ["#e8e0ad", "#dfd6a1", "#f0e9bd", "#d6cb93", "#f5eec6"];

function ore(g: G, r: () => number, colors: [string, string, string], seedCount = 5) {
  const spots: [number, number][] = [[2, 3], [10, 2], [5, 9], [11, 10], [1, 12], [8, 13]];
  for (let i = 0; i < seedCount; i++) {
    const [cx, cy] = spots[i % spots.length];
    const s = 1 + Math.floor(r() * 2);
    for (let y = -s; y <= s; y++) {
      for (let x = -s; x <= s; x++) {
        if (Math.abs(x) + Math.abs(y) > s + 1 || r() > 0.72) continue;
        g(cx + x, cy + y, 1, 1, colors[0]);
      }
    }
    g(cx - 1, cy - 1, 1, 1, colors[1]);
    g(cx + 1, cy + 1, 1, 1, colors[2]);
  }
}

const COBBLE_CELLS: [number, number, number, number][] = [
  [0, 0, 6, 4], [6, 0, 4, 3], [10, 0, 6, 5],
  [0, 4, 4, 4], [4, 3, 6, 5], [10, 5, 6, 4],
  [0, 8, 6, 4], [6, 8, 5, 5], [11, 9, 5, 4],
  [0, 12, 5, 4], [5, 13, 6, 3], [11, 13, 5, 3],
];

function cobble(g: G, r: () => number, mossy = false) {
  g(0, 0, 16, 16, "#5d5d5d");
  for (const [x, y, w, h] of COBBLE_CELLS) {
    const base = PALE[Math.floor(r() * PALE.length)];
    g(x + 1, y + 1, w - 2, h - 2, base);
    g(x + 1, y + 1, w - 2, 1, "#a8a8a8");
    g(x + 1, y + 1, 1, h - 2, "#b0b0b0");
    g(x + 1, y + h - 2, w - 2, 1, "#7a7a7a");
    g(x + w - 2, y + 1, 1, h - 2, "#828282");
    for (let k = 0; k < 2; k++) if (r() > 0.4) g(x + 1 + Math.floor(r() * (w - 3)), y + 1 + Math.floor(r() * (h - 3)), 1, 1, r() > 0.5 ? "#6a6a6a" : "#adadad");
  }
  if (mossy) {
    for (let i = 0; i < 5; i++) {
      const x = 1 + Math.floor(r() * 13);
      const y = 1 + Math.floor(r() * 11);
      g(x, y, 2 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), ["#4f7a32", "#5d8a3a", "#3f6728"][i % 3]);
    }
  }
}

function planks(g: G, r: () => number, colors: string[], seam: string) {
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    for (let x = 0; x < 16; x++) g(x, y, 1, 4, colors[Math.floor(r() * colors.length)]);
    g(0, y, 16, 1, seam);
    g(0, y + 1, 16, 1, "rgba(255,255,255,.16)");
    const cut = 2 + Math.floor(r() * 11);
    g(cut, y, 1, 4, seam);
    for (let k = 0; k < 3; k++) {
      const gx = Math.floor(r() * 15);
      g(gx, y + 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), 1, "rgba(60,40,20,.35)");
    }
  }
}

const painters: Record<string, (ctx: Ctx) => void> = {
  grass_top: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, GRASS[Math.floor(r() * GRASS.length)]);
    for (let i = 0; i < 16; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#6ba03f");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#98cd70");
  }, 101),
  grass_side: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, DIRT[Math.floor(r() * DIRT.length)]);
    for (let i = 0; i < 22; i++) g(Math.floor(r() * 16), 5 + Math.floor(r() * 11), 1, 1, r() > 0.5 ? "#7e5940" : "#b48c6c");
    for (let x = 0; x < 16; x++) {
      const h = 2 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) g(x, y, 1, 1, y === h - 1 ? "#78b04c" : GRASS[Math.floor(r() * GRASS.length)]);
    }
    for (let x = 0; x < 16; x++) if (r() > 0.72) g(x, 4, 1, 1, "#6da340");
  }, 202),
  dirt: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, DIRT[Math.floor(r() * DIRT.length)]);
    for (let i = 0; i < 12; i++) g(Math.floor(r() * 14), Math.floor(r() * 14), 2, 1, "#6d4b33");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#ab8464");
  }, 303),
  stone: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, PALE[Math.floor(r() * PALE.length)]);
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(r() * 12);
      const y = Math.floor(r() * 14);
      g(x, y, 3 + Math.floor(r() * 3), 1, "#6b6b6b");
      if (r() > 0.5) g(x + 1, y + 1, 2, 1, "#8f8f8f");
    }
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#9a9a9a");
  }, 404),
  cobblestone: seeded((g, r) => cobble(g, r), 505),
  sand: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, SAND[Math.floor(r() * SAND.length)]);
    for (let i = 0; i < 18; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, r() > 0.5 ? "#c8bb80" : "#f5efcf");
  }, 606),
  sandstone: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, SAND[Math.floor(r() * SAND.length)]);
    g(0, 3, 16, 1, "#c4b781");
    g(0, 4, 16, 1, "#e6ddb0");
    g(0, 9, 16, 1, "#c4b781");
    g(0, 10, 16, 1, "#eee6bd");
    for (let i = 0; i < 12; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#c9bd88");
  }, 707),
  log_side: seeded((g, r) => {
    for (let x = 0; x < 16; x++) {
      const shade = r();
      const base = shade > 0.66 ? "#8a6638" : shade > 0.33 ? "#9b7544" : "#7a5a32";
      g(x, 0, 1, 16, base);
    }
    for (let x = 0; x < 16; x++) {
      if (r() > 0.55) {
        const start = Math.floor(r() * 10);
        g(x, start, 1, 3 + Math.floor(r() * 4), r() > 0.5 ? "#6d4c28" : "#ad8752");
      }
    }
    for (let i = 0; i < 5; i++) g(Math.floor(r() * 15), Math.floor(r() * 14), 2, 1, "#3d2a13");
    for (let i = 0; i < 6; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 2, "#8a6738");
  }, 808),
  log_top: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, r() > 0.5 ? "#c5a06b" : "#d3b07c");
    const rings = [[7.4, "#6f4f28"], [5.4, "#7c5a30"], [3.4, "#6f4f28"], [1.5, "#5a3f20"]];
    for (const [radius, color] of rings) {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (Math.abs(d - (radius as number)) < 0.55) g(x, y, 1, 1, color as string);
        }
      }
    }
    g(7, 7, 2, 2, "#6d4d27");
    for (let i = 0; i < 8; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#c2a072");
  }, 909),
  birch_side: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, r() > 0.5 ? "#d7d3c2" : "#c8c4b2");
    for (let i = 0; i < 7; i++) {
      const y = Math.floor(r() * 16);
      const x = Math.floor(r() * 12);
      g(x, y, 2 + Math.floor(r() * 2), 1, "#3f3e35");
      if (r() > 0.6) g(x, y + 1, 1, 1, "#565549");
    }
    for (let i = 0; i < 14; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#e6e2d2");
  }, 1010),
  birch_top: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, r() > 0.5 ? "#c9b98d" : "#b8a87c");
    for (const rr of [6.5, 4.2, 2]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (Math.abs(d - rr) < 0.55) g(x, y, 1, 1, "#8c7b52");
      }
    }
    g(7, 7, 2, 2, "#8c7b52");
  }, 1111),
  leaves_oak: seeded((g, r) => {
    g(0, 0, 16, 16, "#4a7f2c");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() > 0.12) g(x, y, 1, 1, ["#4f8a35", "#58943c", "#447d2c", "#5f9d43", "#3a6d25"][Math.floor(r() * 5)]);
    for (let i = 0; i < 16; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#38651f");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#82c25a");
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(r() * 13);
      const y = 1 + Math.floor(r() * 13);
      g(x, y, 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), "#00000000");
    }
  }, 1212),
  leaves_pine: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#356b2a", "#3d7731", "#2c5a23", "#488538", "#25491e"][Math.floor(r() * 5)]);
    for (let i = 0; i < 12; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#24471b");
    for (let i = 0; i < 5; i++) g(1 + Math.floor(r() * 12), 1 + Math.floor(r() * 12), 2, 1, "#00000000");
  }, 1313),
  planks: seeded((g, r) => planks(g, r, ["#c49c62", "#bd9358", "#cda66c", "#b58a4f"], "#8a6535"), 1414),
  planks_dark: seeded((g, r) => planks(g, r, ["#8a653c", "#7f5c35", "#94703f", "#775430"], "#5a3f22"), 1515),
  glass: canvas16((g) => {
    g(0, 0, 16, 16, "rgba(205,235,250,.12)");
    g(0, 0, 16, 1, "#dff4ff");
    g(0, 15, 16, 1, "#dff4ff");
    g(0, 0, 1, 16, "#dff4ff");
    g(15, 0, 1, 16, "#dff4ff");
    g(0, 0, 16, 1, "#ffffff");
    for (let i = 1; i < 8; i++) {
      g(i, 9 - i, 1, 2, "#eaf9ff");
      g(11 + Math.floor(i / 3), 15 - i, 2, 1, "#eaf9ff");
    }
    g(2, 2, 1, 1, "#ffffff");
    g(13, 3, 1, 1, "#ffffff");
  }),
  water: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#3f86c4", "#3a7ebc", "#4790cf", "#3577b2", "#56a0dd"][Math.floor(r() * 5)]);
    for (let y = 1; y < 16; y += 4) {
      for (let x = 0; x < 16; x++) {
        const wave = Math.round(Math.sin((x + y) * 0.6) * 1.1);
        g(x, y + wave, 2, 1, "#9ad6f2");
        g(x, y + wave + 1, 1, 1, "#b4e3f8");
      }
    }
    for (let i = 0; i < 8; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#a9e3f7");
  }, 1616),
  snow: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#f4f9fd", "#eef5fa", "#fbfeff", "#e7f0f7"][Math.floor(r() * 4)]);
    for (let i = 0; i < 14; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#d6e6f2");
  }, 1717),
  gravel: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#7e7a76", "#8a8682", "#6f6b67", "#96918c", "#645f5b"][Math.floor(r() * 5)]);
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 14);
      const y = Math.floor(r() * 15);
      g(x, y, 2, 1, r() > 0.5 ? "#a8a39d" : "#514d49");
    }
  }, 1818),
  coal_ore: seeded((g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, PALE[Math.floor(r() * PALE.length)]); ore(g, r, ["#1d1d1d", "#333333", "#0d0d0d"], 6); }, 1919),
  iron_ore: seeded((g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, PALE[Math.floor(r() * PALE.length)]); ore(g, r, ["#c9a58b", "#e6cfbc", "#a3816a"], 6); }, 2020),
  gold_ore: seeded((g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, PALE[Math.floor(r() * PALE.length)]); ore(g, r, ["#e8bb30", "#fff08a", "#b78c15"], 6); }, 2121),
  diamond_ore: seeded((g, r) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, PALE[Math.floor(r() * PALE.length)]); ore(g, r, ["#3ecfd2", "#c6ffff", "#1d9ea3"], 6); }, 2222),
  bricks: seeded((g, r) => {
    g(0, 0, 16, 16, "#b5aca1");
    const brickColors = ["#9c4a34", "#93432e", "#a85541", "#883c29"];
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : -4;
      for (let col = 0; col < 3; col++) {
        const x = offset + col * 8;
        g(x + 1, row * 4 + 1, 6, 2, brickColors[Math.floor(r() * brickColors.length)]);
        g(x + 1, row * 4 + 1, 6, 1, "#b4614b");
        g(x + 1, row * 4 + 2, 6, 1, "#7d3625");
      }
    }
  }, 2323),
  glowstone: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#e9b249", "#dfa63c", "#f3c766", "#d49a30"][Math.floor(r() * 4)]);
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(r() * 13);
      const y = Math.floor(r() * 13);
      g(x, y, 2, 2, r() > 0.5 ? "#ffe89a" : "#c2811e");
      g(x, y, 1, 1, "#fff6c9");
    }
  }, 2424),
  obsidian: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#160f1f", "#1d1429", "#120c19", "#241834"][Math.floor(r() * 4)]);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(r() * 13);
      const y = Math.floor(r() * 13);
      g(x, y, 2, 1, "#4b3468");
      g(x + 1, y + 1, 1, 1, "#6a4f8f");
    }
    for (let i = 0; i < 8; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#7d5ca8");
  }, 2525),
  wool_red: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#b8342e", "#a92d27", "#c33b35", "#9d2621"][Math.floor(r() * 4)]);
    for (let i = 0; i < 16; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#7d1c18");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#e05a54");
  }, 2626),
  wool_yellow: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#e0b93a", "#d4ac31", "#edc94f", "#c9a12a"][Math.floor(r() * 4)]);
    for (let i = 0; i < 16; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#a37d1c");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#f7dd83");
  }, 2727),
  wool_blue: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#3559bd", "#2e50ac", "#3f65cf", "#2948a0"][Math.floor(r() * 4)]);
    for (let i = 0; i < 16; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#1c3078");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#6f90e8");
  }, 2828),
  farmland: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, DIRT[Math.floor(r() * DIRT.length)]);
    for (let y = 2; y < 16; y += 4) {
      g(0, y, 16, 1, "#4f3520");
      g(0, y + 1, 16, 1, "#654530");
    }
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#a97e58");
  }, 2929),
  wheat: seeded((g, r) => {
    for (let stalk = 0; stalk < 4; stalk++) {
      const x = 2 + stalk * 4;
      const top = 2 + Math.floor(r() * 3);
      g(x, top, 1, 15 - top, "#7f9c38");
      g(x + 1, top + 3, 1, 2, "#8fae44");
      for (let y = top + 1; y < top + 10; y += 2) {
        g(x - 1, y, 3, 1, y % 4 === 0 ? "#e3cd6c" : "#cbb44f");
        g(x, y + 1, 1, 1, "#b39c3c");
      }
    }
    for (let i = 0; i < 8; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#f3e49a");
  }, 3030),
  path: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#a2926d", "#9a8a66", "#b0a17c", "#8d7d5b"][Math.floor(r() * 4)]);
    for (let i = 0; i < 18; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, r() > 0.5 ? "#c2b491" : "#75674a");
  }, 3131),
  lantern: canvas16((g) => {
    g(3, 2, 10, 12, "#2b2620");
    g(4, 3, 8, 10, "#f3c657");
    g(5, 4, 6, 8, "#ffe9a1");
    g(5, 6, 6, 1, "#d79e2c");
    g(5, 9, 6, 1, "#d79e2c");
    g(2, 1, 12, 2, "#1e1a15");
    g(2, 13, 12, 2, "#1e1a15");
    g(3, 0, 2, 1, "#3a332a");
    g(11, 0, 2, 1, "#3a332a");
    g(6, 5, 2, 2, "#fff6cf");
    g(9, 8, 1, 1, "#fff6cf");
  }),
  bookshelf: seeded((g, r) => {
    planks(g, r, ["#a97f4a", "#9d7440", "#b78a51"], "#63441f");
    const spines = ["#9c3a30", "#2f5c8a", "#b49a3d", "#3d7048", "#7b3f7a", "#a45c2c", "#575757"];
    for (let shelf = 0; shelf < 2; shelf++) {
      const y = 1 + shelf * 8;
      g(1, y + 6, 14, 1, "#4b3219");
      let x = 1;
      while (x < 15) {
        const w = 1 + Math.floor(r() * 2);
        const h = 4 + Math.floor(r() * 2);
        g(x, y + 6 - h, w, h, spines[Math.floor(r() * spines.length)]);
        g(x, y + 6 - h, w, 1, "rgba(255,255,255,.25)");
        g(x, y + 6 - h, 1, h, "rgba(0,0,0,.25)");
        x += w + 1;
      }
    }
  }, 3232),
  crafting_top: seeded((g, r) => {
    planks(g, r, ["#b18a52", "#a67e47", "#bd955c"], "#684722");
    for (let i = 0; i < 4; i++) {
      g(i * 4, 0, 1, 16, "#4a3216");
      g(0, i * 4, 16, 1, "#4a3216");
    }
    g(1, 1, 2, 1, "rgba(255,255,255,.2)");
  }, 3333),
  crafting_side: seeded((g, r) => {
    planks(g, r, ["#a67e47", "#9b7440", "#b18a52"], "#5b3f1f");
    g(0, 0, 16, 4, "#46301a");
    g(0, 1, 16, 1, "rgba(255,255,255,.18)");
    g(3, 6, 1, 6, "#3b2a16");
    g(2, 6, 5, 2, "#5e4423");
    g(10, 7, 4, 2, "#5e4423");
    for (let i = 0; i < 4; i++) g(10 + i, 9, 1, 1, "#3b2a16");
  }, 3434),
  bedrock: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#4d4d4d", "#3b3b3b", "#5d5d5d", "#6a6a6a", "#2e2e2e"][Math.floor(r() * 5)]);
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(r() * 12);
      const y = Math.floor(r() * 12);
      g(x, y, 3, 2, r() > 0.5 ? "#666666" : "#141414");
    }
  }, 3535),
  flower_red: seeded((g, r) => {
    g(7, 6, 1, 9, "#4f7d2f");
    g(4, 10, 3, 1, "#69a63f");
    g(8, 8, 3, 1, "#69a63f");
    g(4, 3, 5, 3, "#c3322b");
    g(5, 2, 3, 1, "#d9453c");
    g(4, 6, 5, 1, "#a82722");
    g(6, 3, 1, 1, "#f0d278");
    for (let i = 0; i < 4; i++) g(1 + Math.floor(r() * 14), 12 + Math.floor(r() * 4), 2, 1, "#5f9737");
  }, 3636),
  flower_yellow: seeded((g, r) => {
    g(7, 6, 1, 9, "#4f7d2f");
    g(3, 11, 4, 1, "#69a63f");
    g(8, 9, 4, 1, "#69a63f");
    g(4, 3, 5, 3, "#d6b52f");
    g(5, 2, 3, 1, "#ecd25c");
    g(4, 6, 5, 1, "#a98a1e");
    g(6, 3, 1, 1, "#a97b1b");
    for (let i = 0; i < 4; i++) g(1 + Math.floor(r() * 14), 12 + Math.floor(r() * 4), 2, 1, "#5f9737");
  }, 3737),
  tall_grass: seeded((g, r) => {
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(r() * 14);
      const h = 5 + Math.floor(r() * 9);
      const bend = r() > 0.5 ? 1 : -1;
      for (let k = 0; k < h; k++) {
        const px = x + (k > h * 0.6 ? bend : 0);
        g(px, 15 - k, 1, 1, ["#4f8a30", "#5f9c39", "#3f7427", "#6cab42"][Math.floor(r() * 4)]);
      }
    }
  }, 3838),
  terracotta: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#b85c45", "#ad513b", "#c66a51", "#a04a33"][Math.floor(r() * 4)]);
    for (let y = 0; y < 16; y += 4) g(0, y, 16, 1, "#78341f");
    for (let i = 0; i < 10; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#c96c52");
  }, 3939),
  stone_bricks: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#7b7b7b", "#828282", "#747474", "#8a8a8a"][Math.floor(r() * 4)]);
    g(0, 7, 16, 1, "#4d4d4d");
    g(0, 15, 16, 1, "#4d4d4d");
    g(7, 0, 1, 7, "#4d4d4d");
    g(3, 8, 1, 7, "#4d4d4d");
    g(11, 8, 1, 7, "#4d4d4d");
    g(0, 0, 7, 1, "#9f9f9f");
    g(0, 8, 3, 1, "#9f9f9f");
    g(8, 8, 3, 1, "#9f9f9f");
    g(12, 8, 4, 1, "#9f9f9f");
  }, 4040),
  mossy_cobble: seeded((g, r) => cobble(g, r, true), 4141),
  door: seeded((g, r) => {
    planks(g, r, ["#8a6538", "#7c5a30", "#956f40"], "#4b331a");
    g(0, 0, 1, 16, "#3f2b13");
    g(15, 0, 1, 16, "#3f2b13");
    g(0, 0, 16, 1, "#3f2b13");
    g(0, 15, 16, 1, "#3f2b13");
    g(0, 7, 16, 1, "#3f2b13");
    g(11, 10, 2, 2, "#d9b55c");
    g(2, 2, 4, 4, "#5c3f1f");
    g(3, 3, 2, 2, "#8a6538");
  }, 4242),
  lava: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#d9531a", "#e86a20", "#c44412", "#f38a28"][Math.floor(r() * 4)]);
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(r() * 12);
      const y = Math.floor(r() * 12);
      g(x, y, 3, 2, r() > 0.5 ? "#ffd05a" : "#9d2f08");
      g(x, y, 1, 1, "#fff0a8");
    }
  }, 4343),
  ice: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#a5d6ee", "#9bcee8", "#b2dff4", "#8fc4e0"][Math.floor(r() * 4)]);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 10);
      const y = Math.floor(r() * 10);
      for (let k = 0; k < 6; k++) g(x + k, y + k, 1, 1, "#e6f7ff");
    }
    for (let i = 0; i < 8; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1, "#d3f0ff");
  }, 4444),
  hay: seeded((g, r) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g(x, y, 1, 1, ["#c8a63c", "#bd9a33", "#d6b448", "#b18f2d"][Math.floor(r() * 4)]);
    for (let y = 0; y < 16; y += 3) g(0, y, 16, 1, "#96751f");
    for (let i = 0; i < 14; i++) g(Math.floor(r() * 16), Math.floor(r() * 16), 1, 2, "#efd980");
    g(0, 0, 2, 16, "#8a6c1c");
    g(14, 0, 2, 16, "#8a6c1c");
  }, 4545),
};

// Derive a per-pixel normal map from the 32x32 atlas. This gives every block
// face real micro-relief (little 3D bumps) instead of a flat painted surface.
let normalCache: HTMLCanvasElement | null = null;

export function getAtlasNormalMap(): HTMLCanvasElement {
  if (normalCache) return normalCache;
  const atlas = getAtlas().canvas;
  const w = atlas.width;
  const h = atlas.height;
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sctx = srcCanvas.getContext("2d")!;
  sctx.drawImage(atlas, 0, 0);
  const src = sctx.getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(w, h);
  const lum = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    const i = (cy * w + cx) * 4;
    return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
  };
  const strength = 6.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = lum(x - 1, y);
      const r = lum(x + 1, y);
      const u = lum(x, y - 1);
      const d = lum(x, y + 1);
      let nx = (l - r) * strength;
      let ny = (u - d) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  normalCache = out;
  return out;
}


// ---------------------------------------------------------------------------
// Raised TOP textures: only the top face of a block looks chunky and lifted.
// Sides & bottoms keep the clean flat Minecraft texture.
// ---------------------------------------------------------------------------
function raisedTop(base: (ctx: Ctx) => void): (ctx: Ctx) => void {
  // Identical, clean artwork. Cast shadows now supply the 3D depth.
  return (ctx) => base(ctx);
}

const topBase: Record<string, string> = {
  top_grass: "grass_top",
  top_stone: "stone",
  top_dirt: "dirt",
  top_sand: "sand",
  top_cobble: "cobblestone",
  top_planks: "planks",
  top_snow: "snow",
  top_bricks: "bricks",
  top_path: "path",
  top_gravel: "gravel",
  top_wool: "wool_red",
  top_farmland: "farmland",
};
for (const [topName, baseName] of Object.entries(topBase)) {
  painters[topName] = raisedTop(painters[baseName]);
}

let heightCache: HTMLCanvasElement | null = null;

// Height map used for parallax occlusion mapping: bright pixels are "higher",
// so block surfaces get genuine depth that shifts with the camera, not just a
// flat normal map.
export function getAtlasHeightMap(): HTMLCanvasElement {
  if (heightCache) return heightCache;
  const atlas = getAtlas().canvas;
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(atlas, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114) / 255;
    const v = Math.round(Math.max(0, Math.min(1, lum * 1.15)) * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  heightCache = canvas;
  return canvas;
}

let roughnessCache: HTMLCanvasElement | null = null;

// Physically-based roughness variation: dark mortar/crevices are rougher,
// bright polished pixels are smoother. This gives real PBR response to the sun.
export function getAtlasRoughnessMap(): HTMLCanvasElement {
  if (roughnessCache) return roughnessCache;
  const atlas = getAtlas().canvas;
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(atlas, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = (img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114) / 255;
    // rough in crevices (dark), smoother on highlights (bright)
    const v = Math.round((0.62 + (1 - lum) * 0.38) * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  roughnessCache = canvas;
  return canvas;
}

const lowPowerTextureMode = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;

let atlasCache: { canvas: HTMLCanvasElement; uv: Record<string, [number, number, number, number]> } | null = null;

export function getAtlas() {
  if (atlasCache) return atlasCache;
  const canvas = makeCanvas(TILE * ATLAS_COLS, TILE * ATLAS_ROWS);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const uv: Record<string, [number, number, number, number]> = {};
  TILE_NAMES.forEach((name, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const tileCanvas = makeCanvas(TILE);
    const tctx = tileCanvas.getContext("2d")!;
    painters[name](tctx);
    if (!lowPowerTextureMode) refine(tctx);
    ctx.drawImage(tileCanvas, col * TILE, row * TILE);
    const pad = 0.04 / TILE;
    const u0 = (col * TILE + 0.35) / canvas.width + pad * 0;
    const v0 = 1 - ((row + 1) * TILE - 0.35) / canvas.height;
    const u1 = ((col + 1) * TILE - 0.35) / canvas.width;
    const v1 = 1 - (row * TILE + 0.35) / canvas.height;
    uv[name] = [u0, v0, u1, v1];
  });
  atlasCache = { canvas, uv };
  return atlasCache;
}

// Finishing pass that adds 64x64 micro-detail on top of the 16x16 authored art:
// a light unsharp mask makes the pixels crisp, and a very low amplitude dither
// adds the subtle surface grit that reads as expensive HD material.
function refine(ctx: Ctx) {
  const image = ctx.getImageData(0, 0, TILE, TILE);
  const src = image.data;
  const out = new Uint8ClampedArray(src);
  const idx = (x: number, y: number) => (y * TILE + x) * 4;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const i = idx(x, y);
      const l = src[idx(Math.max(0, x - 1), y)];
      const r = src[idx(Math.min(TILE - 1, x + 1), y)];
      const u = src[idx(x, Math.max(0, y - 1))];
      const d = src[idx(x, Math.min(TILE - 1, y + 1))];
      const avg = (l + r + u + d) * 0.25;
      // deterministic dither so the texture is stable between loads
      const n = ((x * 73 + y * 151 + (x ^ y) * 37) % 17) / 17 - 0.5;
      const grit = (n * 9) | 0;
      for (let c = 0; c < 3; c++) {
        const v = src[i + c];
        const sharpened = v + (v - avg) * 0.34 + grit;
        out[i + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
      }
    }
  }
  image.data.set(out);
  ctx.putImageData(image, 0, 0);
}

export function tileCanvas(name: TileName): HTMLCanvasElement {
  const canvas = makeCanvas(TILE);
  const ctx = canvas.getContext("2d")!;
  painters[name](ctx);
  refine(ctx);
  return canvas;
}

// ---------- Isometric inventory icons ----------
const iconCache = new Map<string, string>();

export function blockIconDataUrl(block: { tex: { top: TileName; side: TileName; bottom: TileName } }, size = 128): string {
  const key = `${block.tex.top}/${block.tex.side}/${size}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const s = size / 128;
  const top = { x: 64 * s, y: 6 * s };
  const right = { x: 120 * s, y: 34 * s };
  const bottom = { x: 64 * s, y: 62 * s };
  const left = { x: 8 * s, y: 34 * s };
  const drop = 48 * s;

  const drawFace = (img: HTMLCanvasElement, a: number, b: number, c: number, d: number, e: number, f: number, clip: [number, number][]) => {
    ctx.save();
    ctx.beginPath();
    clip.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(a, b, c, d, e, f);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  };

  const topTex = tileCanvas(block.tex.top);
  const sideTex = tileCanvas(block.tex.side);
  const shade = (clip: [number, number][], color: string, alpha: number) => {
    ctx.save();
    ctx.beginPath();
    clip.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  };

  const topClip: [number, number][] = [
    [top.x, top.y],
    [right.x, right.y],
    [bottom.x, bottom.y],
    [left.x, left.y],
  ];
  const leftClip: [number, number][] = [
    [left.x, left.y],
    [bottom.x, bottom.y],
    [bottom.x, bottom.y + drop],
    [left.x, left.y + drop],
  ];
  const rightClip: [number, number][] = [
    [bottom.x, bottom.y],
    [right.x, right.y],
    [right.x, right.y + drop],
    [bottom.x, bottom.y + drop],
  ];

  // side faces use half-width mapping
  drawFace(sideTex, (54 / 32) * s, (28 / 32) * s, 0, (drop / 32) * s, left.x, left.y, leftClip);
  drawFace(sideTex, (54 / 32) * s, (-28 / 32) * s, 0, (drop / 32) * s, bottom.x, bottom.y, rightClip);
  drawFace(topTex, (56 / 32) * s, (28 / 32) * s, (-56 / 32) * s, (28 / 32) * s, top.x, top.y, topClip);
  shade(leftClip, "#07120b", 0.14);
  shade(rightClip, "#040d08", 0.24);
  shade(topClip, "#ffffff", 0.14);

  // crisp voxel silhouette
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(20,30,22,.35)";
  ctx.lineWidth = Math.max(1, 1.4 * s);
  for (const clip of [topClip, leftClip, rightClip]) {
    ctx.beginPath();
    clip.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }

  const url = canvas.toDataURL("image/png");
  iconCache.set(key, url);
  return url;
}

export function avatarDataUrl(seed = 3, size = 128): string {
  const r = randFactory(seed * 991 + 7);
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d")!;
  const px = size / 8;
  const hair = pick(r, ["#3a2a1c", "#5a3a20", "#221b16", "#7a4a22"]);
  const skin = pick(r, ["#d8a079", "#c58d66", "#e5b189", "#a96b47"]);
  const shirt = pick(r, ["#2f8f83", "#3d6f9e", "#4d7d3f", "#94603a"]);
  const colors: string[] = [];
  for (let i = 0; i < 8; i++) colors.push(skin);
  const set = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * px, y * px, px, px);
  };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) set(x, y, skin);
  for (let x = 0; x < 8; x++) set(x, 0, hair);
  for (let x = 0; x < 8; x++) if (r() > 0.3) set(x, 1, hair);
  set(0, 2, hair);
  set(7, 2, hair);
  set(0, 3, hair);
  set(7, 3, hair);
  set(1, 2, pick(r, ["#2f5f43", "#3d6f9e", "#6a4a2c"]));
  set(6, 2, pick(r, ["#2f5f43", "#3d6f9e", "#6a4a2c"]));
  set(1, 4, "#f4f7f2");
  set(2, 4, "#243b34");
  set(5, 4, "#f4f7f2");
  set(6, 4, "#243b34");
  set(3, 5, "#b97a58");
  set(4, 5, "#b97a58");
  set(3, 6, "#7c4b34");
  set(4, 6, "#7c4b34");
  set(2, 7, "#8d5a3c");
  set(5, 7, "#8d5a3c");
  for (let x = 0; x < 8; x++) for (let y = 6; y < 8; y++) if (x > 1 && x < 6 && y === 7) set(x, y, shirt);
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = Math.max(1, px * 0.12);
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  return canvas.toDataURL("image/png");
}

export function radialGlow(): HTMLCanvasElement {
  const canvas = makeCanvas(128);
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,238,180,1)");
  g.addColorStop(0.18, "rgba(255,206,110,.8)");
  g.addColorStop(0.5, "rgba(255,168,64,.22)");
  g.addColorStop(1, "rgba(255,140,30,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}
