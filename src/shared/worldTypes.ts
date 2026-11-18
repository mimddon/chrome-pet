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
  tailWagTime: number | null;
  butterfly: ButterflyState | null;
  treat: TreatState | null;
}

export interface TreatState {
  id: string;
  x: number;
  y: number;
  phase: "approaching" | "eating" | "rewarding" | "happy";
  elapsedTime: number;
}

export type PetWorldCommand =
  | { action: "hold" }
  | { action: "drag"; x: number; y: number }
  | { action: "release" }
  | { action: "placeTreat"; x: number; y: number }
  | { action: "spawnButterfly" };

export type WorldClientMessage =
  | { type: "presence"; visible: boolean }
  | { type: "heartbeat" }
  | { type: "command"; instanceId: string; command: PetWorldCommand };

export type WorldServerMessage =
  | { type: "snapshot"; snapshot: PetWorldSnapshot }
  | { type: "petting"; instanceId: string; affection: number };

export const WORLD_PORT_NAME = "chrome-pet:world";
export const SIT_TAIL_CYCLE_SECONDS = 0.6;
export const STAND_UP_SECONDS = 0.8;
export const LIE_DOWN_SECONDS = 0.8;
export const FALL_ASLEEP_SECONDS = 1.2;
export const WAKE_UP_SECONDS = 1.4;
