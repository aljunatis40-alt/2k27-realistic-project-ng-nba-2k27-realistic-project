export type SavedLocale = "en" | "tl";

export interface GameSaveData {
  schemaVersion: 1;
  saveName: string;
  savedTimestamp: string | null;
  savedSelectedLanguageIndex: 0 | 1;
  profileLevel: number;
  totalVirtualCurrency: number;
  favoriteTeamAbbreviation: string;
  currentWins: number;
  currentLosses: number;
}

export interface SaveSystemOptions {
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  storageKey?: string;
  now?: () => Date;
  onLog?: (level: "info" | "warn" | "error", message: string) => void;
}

const DEFAULT_STORAGE_KEY = "nba2k27_profile_v1";

export function createDefaultProfileSaveData(): GameSaveData {
  return {
    schemaVersion: 1,
    saveName: "Slot_1",
    savedTimestamp: null,
    savedSelectedLanguageIndex: 0,
    profileLevel: 1,
    totalVirtualCurrency: 500,
    favoriteTeamAbbreviation: "LAL",
    currentWins: 0,
    currentLosses: 0
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateSaveData(value: unknown): value is GameSaveData {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  return (
    typeof value.saveName === "string" &&
    (value.savedTimestamp === null || typeof value.savedTimestamp === "string") &&
    (value.savedSelectedLanguageIndex === 0 || value.savedSelectedLanguageIndex === 1) &&
    isNonNegativeInteger(value.profileLevel) &&
    value.profileLevel >= 1 &&
    isNonNegativeInteger(value.totalVirtualCurrency) &&
    typeof value.favoriteTeamAbbreviation === "string" &&
    /^[A-Z0-9]{2,5}$/.test(value.favoriteTeamAbbreviation) &&
    isNonNegativeInteger(value.currentWins) &&
    isNonNegativeInteger(value.currentLosses)
  );
}

/**
 * Browser save storage for the Three.js/TypeScript build.
 *
 * Saves are versioned JSON in localStorage. This is persistence, not
 * encryption: browser-side secrets cannot safely be hidden in shipped code.
 * Use a server-authoritative profile for purchases or competitive progression.
 */
export class NBA2K27SaveSystem {
  private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  private readonly storageKey: string;
  private readonly now: () => Date;
  private readonly onLog?: SaveSystemOptions["onLog"];

  constructor(options: SaveSystemOptions = {}) {
    const browserStorage = options.storage ??
      (typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : undefined);
    if (!browserStorage) {
      throw new Error("Save storage is unavailable in this environment.");
    }
    this.storage = browserStorage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.now = options.now ?? (() => new Date());
    this.onLog = options.onLog;
  }

  saveProfileState(dataToSave: GameSaveData): boolean {
    if (!validateSaveData(dataToSave)) {
      this.log("error", "Profile save rejected because its data failed validation.");
      return false;
    }

    try {
      const saved: GameSaveData = {
        ...dataToSave,
        savedTimestamp: this.now().toISOString()
      };
      this.storage.setItem(this.storageKey, JSON.stringify(saved));
      this.log("info", `Profile "${saved.saveName}" saved successfully.`);
      return true;
    } catch (error) {
      this.log("error", `Failed to save profile: ${this.errorMessage(error)}`);
      return false;
    }
  }

  loadProfileState(): GameSaveData {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw === null) {
        this.log("info", "No saved profile found. Creating a default profile.");
        const defaults = createDefaultProfileSaveData();
        this.saveProfileState(defaults);
        return defaults;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!validateSaveData(parsed)) {
        this.log("warn", "Saved profile is invalid or uses an unsupported version. Returning defaults.");
        return createDefaultProfileSaveData();
      }

      this.log("info", `Profile loaded. Last saved: ${parsed.savedTimestamp ?? "unknown"}.`);
      return { ...parsed };
    } catch (error) {
      this.log("error", `Failed to load profile: ${this.errorMessage(error)}`);
      return createDefaultProfileSaveData();
    }
  }

  deleteActiveProfileSave(): boolean {
    try {
      this.storage.removeItem(this.storageKey);
      this.log("info", "Active profile save deleted.");
      return true;
    } catch (error) {
      this.log("error", `Failed to delete profile: ${this.errorMessage(error)}`);
      return false;
    }
  }

  getSelectedLocale(data: GameSaveData): SavedLocale {
    return data.savedSelectedLanguageIndex === 1 ? "tl" : "en";
  }

  private log(level: "info" | "warn" | "error", message: string): void {
    this.onLog?.(level, `[Save System] ${message}`);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
