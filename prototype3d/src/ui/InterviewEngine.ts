export type GameLanguage = "English" | "Tagalog";
export type InterviewCategory = "preGame" | "halftime" | "postGame";

export interface InterviewLine {
  speakerRole: string;
  category: InterviewCategory;
  english: string;
  tagalog: string;
}

export const INTERVIEW_DIALOGUES: Record<string, InterviewLine> = {
  Coach_PreGame_01: {
    speakerRole: "Coach",
    category: "preGame",
    english: "We need to control the paint early on and secure the defensive glass. Transition defense is key tonight.",
    tagalog: "Kailangan nating kontrolin ang ilalim ng ring at kunin ang defensive rebounds. Mahalaga ang depensa natin sa transition ngayong gabi."
  },
  Assistant_Halftime_01: {
    speakerRole: "Assistant Coach",
    category: "halftime",
    english: "Our rotations are late on the pick-and-roll. We must lock up on the perimeter and protect the rim!",
    tagalog: "Nahuhuli ang mga rotation natin sa pick-and-roll. Kailangan nating maghigpit sa perimeter at bantayan ang ring!"
  },
  Player_PostGame_01: {
    speakerRole: "Player",
    category: "postGame",
    english: "It was a total team effort. My teammates trusted me to take the clutch shots, and we executed the play correctly.",
    tagalog: "Tulong-tulong ang buong koponan. Nagtiwala sa akin ang mga kakampi ko sa mahahalagang tira, at naisagawa namin nang tama ang play."
  }
};

export interface InterviewView {
  root: HTMLElement;
  speaker: HTMLElement;
  subtitle: HTMLElement;
  reporterImage?: HTMLImageElement;
}

export class InterviewEngine {
  private language: GameLanguage = "English";
  private currentDialogueKey: string | null = null;

  constructor(private readonly view: InterviewView) {
    this.view.root.hidden = true;
    this.view.root.setAttribute("aria-live", "polite");
  }

  setLanguage(language: GameLanguage): void {
    this.language = language;
    if (this.currentDialogueKey) {
      const line = INTERVIEW_DIALOGUES[this.currentDialogueKey];
      this.view.subtitle.textContent = line ? line[this.language === "English" ? "english" : "tagalog"] : "...";
    }
  }

  toggleLanguage(): GameLanguage {
    this.setLanguage(this.language === "English" ? "Tagalog" : "English");
    return this.language;
  }

  showInterview(speakerName: string, dialogueKey: string, reporterImageUrl?: string): void {
    this.currentDialogueKey = dialogueKey;
    const line = INTERVIEW_DIALOGUES[dialogueKey];
    this.view.speaker.textContent = speakerName.toLocaleUpperCase();
    this.view.subtitle.textContent = line
      ? line[this.language === "English" ? "english" : "tagalog"]
      : "...";
    if (this.view.reporterImage && reporterImageUrl) {
      this.view.reporterImage.src = reporterImageUrl;
      this.view.reporterImage.hidden = false;
    } else if (this.view.reporterImage) {
      this.view.reporterImage.hidden = true;
    }
    this.view.root.hidden = false;
  }

  close(): void {
    this.view.root.hidden = true;
    this.currentDialogueKey = null;
  }

  get activeLanguage(): GameLanguage {
    return this.language;
  }
}
