export type Locale = "en" | "tl";
export type TextKey =
  | "GAME_START" | "SETTINGS" | "LANGUAGE" | "PASS" | "SHOOT"
  | "DRIVE" | "STEAL" | "BLOCK" | "TIMEOUT" | "SHOT_MADE";

const dictionaries: Record<Locale, Record<TextKey, string>> = {
  en: {
    GAME_START: "Start Game", SETTINGS: "Settings", LANGUAGE: "Language",
    PASS: "Pass", SHOOT: "Shoot", DRIVE: "Drive", STEAL: "Steal",
    BLOCK: "Block", TIMEOUT: "Timeout", SHOT_MADE: "Shot made"
  },
  tl: {
    GAME_START: "Simulan ang Laro", SETTINGS: "Mga Setting", LANGUAGE: "Wika",
    PASS: "Pasa", SHOOT: "Tira", DRIVE: "Drive", STEAL: "Agaw",
    BLOCK: "Harang", TIMEOUT: "Timeout", SHOT_MADE: "Pasok ang tira"
  }
};

export class Localization {
  constructor(public locale: Locale = "en") {}

  setLocale(locale: Locale): void { this.locale = locale; }

  t(key: TextKey): string {
    return dictionaries[this.locale][key] ?? dictionaries.en[key] ?? key;
  }
}
