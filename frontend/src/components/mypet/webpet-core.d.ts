export type PetMood =
  | 'happy' | 'love' | 'sad' | 'surprised' | 'confused'
  | 'dizzy' | 'angry' | 'celebrate' | 'sleep';

export interface WebPetConfig {
  name?: string;
  size?: number;
  sleepAfter?: number;
  chatty?: boolean;
  persist?: boolean;
  watchRoutes?: boolean;
  zIndex?: number;
  autoStart?: boolean;
  colors?: Partial<Record<'body' | 'shade' | 'belly' | 'ink' | 'leaf' | 'stem' | 'blush', string>>;
  phrases?: Partial<Record<string, string[]>>;
}

export interface WebPetAPI {
  react(mood: PetMood, text?: string | null): void;
  say(text: string, durationMs?: number): void;
  celebrate(text?: string): void;
  jump(height?: number): void;
  walkTo(x: number): void;
  runTo(x: number): void;
  sleep(): void;
  wake(): void;
  hide(): void;
  show(): void;
  toggle(): void;
  destroy(): void;
  /** Sit at the desk and work on the computer until stopWork(). Pass null for no speech bubble. */
  work(text?: string | null): void;
  /** Leave the desk, optionally reacting with a mood and/or text. */
  stopWork(mood?: PetMood, text?: string): void;
  readonly working: boolean;
  /** Put on shades, grab the mic and read aloud until stopReading(). Pass null for no speech bubble. */
  readAloud(text?: string | null): void;
  /** Put the mic down, optionally reacting with a mood and/or text. */
  stopReading(mood?: PetMood, text?: string): void;
  readonly reading: boolean;
  readonly state: 'idle' | 'walk' | 'sit' | 'sleep' | 'drag' | 'air' | 'work' | 'read';
  readonly mood: string | null;
  readonly element: HTMLElement;
}

declare global {
  interface Window {
    WebPet?: WebPetAPI;
    WebPetConfig?: WebPetConfig;
    WebPetBoot?: (config?: WebPetConfig) => WebPetAPI | null;
  }
}
