export const PET_ENABLED_STORAGE_KEY = "chromePet.enabled";

// 기존 사용자는 별도 설정 없이 지금처럼 펫을 표시한다.
export async function getPetEnabled(): Promise<boolean> {
  const data = await chrome.storage.local.get(PET_ENABLED_STORAGE_KEY);
  return data[PET_ENABLED_STORAGE_KEY] !== false;
}

export async function setPetEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [PET_ENABLED_STORAGE_KEY]: enabled });
}

export function watchPetEnabled(
  onChange: (enabled: boolean) => void,
  onError: (error: unknown) => void = (error) => {
    console.error("[Chrome Pet] 표시 설정 조회 실패", error);
  },
): () => void {
  let active = true;
  let changed = false;
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (!active || area !== "local" || !Object.hasOwn(changes, PET_ENABLED_STORAGE_KEY)) return;
    changed = true;
    onChange(changes[PET_ENABLED_STORAGE_KEY]?.newValue !== false);
  };

  chrome.storage.onChanged.addListener(listener);
  void getPetEnabled().then(
    (enabled) => { if (active && !changed) onChange(enabled); },
    (error: unknown) => { if (active && !changed) onError(error); },
  );

  return () => {
    active = false;
    chrome.storage.onChanged.removeListener(listener);
  };
}
