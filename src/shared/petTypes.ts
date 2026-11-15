
export type PetSpecies = "cat" | "dog";

export type PetAnimation =
  | "idle"
  | "walk"
  | "sit"
  | "jump"
  | "sleep"
  | "pet";

export type PetDirection = "left" | "right";

export type PetState = "idle" | "walking" | "sitting" | "jumping" | "sleeping";

export interface PetConfig {
  species: PetSpecies;
  skin: string;
  size: number;
}

export interface PetPosition {
  x: number;
  y: number;
}
