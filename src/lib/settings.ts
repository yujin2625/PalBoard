"use client";

// Small persisted app settings (localStorage). Kept separate from pal/world
// data so the settings screen and the import flow share one source of truth.

const MY_UID_KEY = "palboard.myPlayerUid";

/** Your Palworld PlayerUId — used to keep only your own pals on import when a
 * save/mod export mixes several players. */
export function getMyUid(): string {
  try {
    return localStorage.getItem(MY_UID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setMyUid(uid: string): void {
  try {
    localStorage.setItem(MY_UID_KEY, uid);
  } catch {}
}

export function clearMyUid(): void {
  try {
    localStorage.removeItem(MY_UID_KEY);
  } catch {}
}
