import type { PetDirection, PetState } from "./petTypes";

export interface ButterflyState {
  id: string;
  x: number;
  y: number;
  phase: "flying" | "caught";
  elapsedTime: number;
}

export interface PetWorldSnapshot {
  instanceId: string;
  x: number;
  y: number;
  direction: PetDirection;
  state: PetState;
  animationTime: number;
  butterfly: ButterflyState | null;
}

export type PetWorldCommand =
  | { action: "hold" }
  | { action: "drag"; x: number; y: number }
  | { action: "release" }
  | { action: "spawnButterfly" };

export type WorldClientMessage =
  | { type: "presence"; visible: boolean }
  | { type: "heartbeat" }
  | { type: "command"; instanceId: string; command: PetWorldCommand };

export type WorldServerMessage =
  | { type: "snapshot"; snapshot: PetWorldSnapshot }
  | { type: "petting"; instanceId: string; affection: number };

export const WORLD_PORT_NAME = "chrome-pet:world";
