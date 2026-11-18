
export type PetSpecies = "cat" | "dog";

export type PetAnimation =
  | "idle"
  | "drag"
  | "walk"
  | "sit"
  | "stand"
  | "jump"
  | "lie"
  | "doze"
  | "sleep"
  | "wake"
  | "sleepToSit"
  | "sitToSleep"
  | "pet";

export type PetDirection = "left" | "right";

export type PetState =
  | "idle"
  | "dragging"
  | "walking"
  | "sitting"
  | "standingUp"
  | "jumping"
  | "lyingDown"
  | "fallingAsleep"
  | "sleeping"
  | "wakingUp"
  | "sleepToSit"
  | "sitToSleep";

export interface PetConfig {
  species: PetSpecies;
  skin: string;
  size: number;
}

export interface PetPosition {
  x: number;
  y: number;
}
