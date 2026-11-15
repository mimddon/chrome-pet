
import type { PetSpecies } from "../petTypes";

export interface PetPoolEntry {
  id: string;
  name: string;
  species: PetSpecies;
  skin: string;
  weight: number;
  enabled: boolean;
}

export const PET_GACHA_POOL: PetPoolEntry[] = [
  {
    id: "cat-basic",
    name: "기본 고양이",
    species: "cat",
    skin: "basic",
    weight: 60,
    enabled: true,
  },
  {
    id: "dog-basic",
    name: "기본 강아지",
    species: "dog",
    skin: "basic",
    weight: 33,
    enabled: true,
  },
  {
    id: "cat-black",
    name: "검은 고양이",
    species: "cat",
    skin: "black",
    weight: 5,
    enabled: true,
  },
  {
    id: "cat-white",
    name: "흰 고양이",
    species: "cat",
    skin: "white",
    weight: 2,
    enabled: true,
  },
];
