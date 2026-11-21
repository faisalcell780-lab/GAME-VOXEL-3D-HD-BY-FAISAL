import { ID } from "./world";

export interface Recipe {
  id: string;
  name: string;
  description: string;
  output: { id: number; count: number };
  inputs: { id: number; count: number }[];
}

export const RECIPES: Recipe[] = [
  {
    id: "planks",
    name: "Papan Oak",
    description: "Potong kayu menjadi papan serbaguna.",
    output: { id: ID.planks, count: 4 },
    inputs: [{ id: ID.log, count: 1 }],
  },
  {
    id: "glass",
    name: "Kaca",
    description: "Lelehkan pasir menjadi kaca bening.",
    output: { id: ID.glass, count: 2 },
    inputs: [{ id: ID.sand, count: 3 }, { id: ID.coalOre, count: 1 }],
  },
  {
    id: "stonebricks",
    name: "Batu Bata Putih",
    description: "Susun batu menjadi blok bangunan kokoh.",
    output: { id: ID.stoneBricks, count: 4 },
    inputs: [{ id: ID.stone, count: 4 }],
  },
  {
    id: "bricks",
    name: "Bata Merah",
    description: "Bakar batu dengan tanah untuk bata klasik.",
    output: { id: ID.bricks, count: 4 },
    inputs: [{ id: ID.stone, count: 2 }, { id: ID.dirt, count: 2 }],
  },
  {
    id: "crafting",
    name: "Meja Kerajinan",
    description: "Meja untuk membuat apa pun.",
    output: { id: ID.crafting, count: 1 },
    inputs: [{ id: ID.planks, count: 4 }],
  },
  {
    id: "glowstone",
    name: "Batu Bercahaya",
    description: "Cahaya abadi untuk rumah malammu.",
    output: { id: ID.glowstone, count: 2 },
    inputs: [{ id: ID.goldOre, count: 2 }, { id: ID.coalOre, count: 1 }],
  },
  {
    id: "lantern",
    name: "Lentera",
    description: "Lentera hangat untuk jalan setapak.",
    output: { id: ID.lantern, count: 2 },
    inputs: [{ id: ID.ironOre, count: 1 }, { id: ID.coalOre, count: 1 }],
  },
  {
    id: "mossy",
    name: "Batu Berlumut",
    description: "Sentuhan alam liar pada batu tua.",
    output: { id: ID.mossyCobble, count: 3 },
    inputs: [{ id: ID.cobblestone, count: 3 }, { id: ID.tallGrass, count: 1 }],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Kristal gelap dari perut bumi.",
    output: { id: ID.obsidian, count: 2 },
    inputs: [{ id: ID.stone, count: 4 }, { id: ID.lava, count: 1 }],
  },
  {
    id: "hay",
    name: "Bal Jerami",
    description: "Kumpulan gandum yang dipadatkan.",
    output: { id: ID.hay, count: 2 },
    inputs: [{ id: ID.wheat, count: 4 }],
  },
];
