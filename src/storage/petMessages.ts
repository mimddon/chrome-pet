import type { OwnedPet } from "./petState";

export type PetMutationRequest =
  | { type: "chrome-pet:mutate"; action: "adopt"; entryId: string }
  | { type: "chrome-pet:mutate"; action: "replace"; entryId: string; instanceId: string }
  | { type: "chrome-pet:mutate"; action: "pet"; instanceId: string; amount: number };

export type PetMutationResponse =
  | { ok: true; pet: OwnedPet }
  | { ok: false; error: string };

export function isPetMutationRequest(value: unknown): value is PetMutationRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  if (request.type !== "chrome-pet:mutate") return false;
  switch (request.action) {
    case "adopt":
      return typeof request.entryId === "string";
    case "replace":
      return typeof request.entryId === "string" && typeof request.instanceId === "string";
    case "pet":
      return typeof request.instanceId === "string" &&
        typeof request.amount === "number" &&
        Number.isSafeInteger(request.amount) && request.amount > 0;
    default:
      return false;
  }
}
