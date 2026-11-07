export type AudioChannel = "commentary" | "sfx" | "crowd";
export type AudioVolumeKey = "MasterVol" | "CommentaryVol" | "SFXVol" | "CrowdVol";

const DEFAULTS: Record<AudioVolumeKey, number> = {
  MasterVol: 0.75,
  CommentaryVol: 0.8,
  SFXVol: 0.85,
  CrowdVol: 0.7
};

const CHANNEL_KEYS: Record<AudioChannel, AudioVolumeKey> = {
  commentary: "CommentaryVol",
  sfx: "SFXVol",
  crowd: "CrowdVol"
};

/** Browser Web Audio mixer with persistent master/commentary/SFX/crowd levels. */
export class AudioMixerManager {
  readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly channelGains: Record<AudioChannel, GainNode>;
  private readonly values: Record<AudioVolumeKey, number>;
  private readonly mediaSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  constructor(private readonly storage: Storage = window.localStorage) {
    const AudioContextCtor = window.AudioContext;
    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.channelGains = {
      commentary: this.context.createGain(),
      sfx: this.context.createGain(),
      crowd: this.context.createGain()
    };
    for (const gain of Object.values(this.channelGains)) gain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.values = {
      MasterVol: this.read("MasterVol"),
      CommentaryVol: this.read("CommentaryVol"),
      SFXVol: this.read("SFXVol"),
      CrowdVol: this.read("CrowdVol")
    };
    this.applyAll();
  }

  private read(key: AudioVolumeKey): number {
    const stored = this.storage.getItem(key);
    if (stored === null) return DEFAULTS[key];
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : DEFAULTS[key];
  }

  private toGain(value: number): number {
    const safe = Math.min(1, Math.max(0, value));
    return safe === 0 ? 0 : Math.pow(10, (Math.log10(safe) * 20) / 20);
  }

  setVolumeLevel(key: AudioVolumeKey, sliderValue: number): void {
    const value = Math.min(1, Math.max(0, sliderValue));
    this.values[key] = value;
    this.storage.setItem(key, String(value));
    if (key === "MasterVol") this.masterGain.gain.setTargetAtTime(this.toGain(value), this.context.currentTime, 0.015);
    else {
      const channel = key === "CommentaryVol" ? "commentary" : key === "SFXVol" ? "sfx" : "crowd";
      this.channelGains[channel].gain.setTargetAtTime(this.toGain(value), this.context.currentTime, 0.015);
    }
  }

  getVolumeLevel(key: AudioVolumeKey): number { return this.values[key]; }

  /** Connect an audio element to its dedicated mix channel. */
  connectMediaElement(element: HTMLMediaElement, channel: AudioChannel): void {
    let source = this.mediaSources.get(element);
    if (!source) {
      source = this.context.createMediaElementSource(element);
      this.mediaSources.set(element, source);
    }
    source.connect(this.channelGains[channel]);
  }

  /** Connect a generated or decoded Web Audio node to a channel. */
  connectNode(node: AudioNode, channel: AudioChannel): void {
    node.connect(this.channelGains[channel]);
  }

  async resume(): Promise<void> {
    if (this.context.state !== "running") await this.context.resume();
  }

  private applyAll(): void {
    this.masterGain.gain.value = this.toGain(this.values.MasterVol);
    for (const channel of ["commentary", "sfx", "crowd"] as const) {
      this.channelGains[channel].gain.value = this.toGain(this.values[CHANNEL_KEYS[channel]]);
    }
  }

  createSettingsPanel(parent: HTMLElement): HTMLElement {
    const panel = document.createElement("details");
    panel.style.cssText = "position:fixed;left:10px;bottom:12px;z-index:8;color:white;background:#101a2add;border:1px solid #ffffff66;border-radius:10px;padding:8px 10px;font:11px Arial;max-width:210px";
    const summary = document.createElement("summary");
    summary.textContent = "AUDIO SETTINGS";
    summary.style.cssText = "font-weight:800;cursor:pointer;user-select:none";
    panel.appendChild(summary);

    const rows: Array<{ label: string; key: AudioVolumeKey }> = [
      { label: "Master", key: "MasterVol" },
      { label: "Commentary", key: "CommentaryVol" },
      { label: "Arena SFX", key: "SFXVol" },
      { label: "Crowd", key: "CrowdVol" }
    ];
    for (const row of rows) {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:grid;grid-template-columns:75px 1fr;align-items:center;gap:6px;margin-top:8px";
      const name = document.createElement("span");
      name.textContent = row.label;
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "1";
      slider.step = "0.01";
      slider.value = String(this.getVolumeLevel(row.key));
      slider.setAttribute("aria-label", row.label + " volume");
      slider.addEventListener("input", () => this.setVolumeLevel(row.key, Number(slider.value)));
      slider.addEventListener("pointerdown", () => { void this.resume(); });
      wrap.append(name, slider);
      panel.appendChild(wrap);
    }
    parent.appendChild(panel);
    return panel;
  }

  dispose(): void {
    for (const gain of Object.values(this.channelGains)) gain.disconnect();
    this.masterGain.disconnect();
    void this.context.close();
  }
}
