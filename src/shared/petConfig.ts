
import type { PetAnimation, PetConfig } from "./petTypes";

export function getPetImageUrl(
  pet: PetConfig,
  animation: PetAnimation = "idle",
): string {
  const path = `assets/pets/${pet.species}/${pet.skin}/${animation}.png`;

  return chrome.runtime.getURL(path);
}
