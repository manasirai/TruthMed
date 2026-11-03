'use client'; // needed for Next.js App Router, harmless elsewhere

import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import type { PetMood, WebPetAPI, WebPetConfig } from './webpet-core';

/* ---------- Safe handle: import anywhere, no-ops if the pet isn’t mounted ---------- */

export const pet = {
  react: (mood: PetMood, text?: string | null) => window.WebPet?.react(mood, text),
  say: (text: string, durationMs?: number) => window.WebPet?.say(text, durationMs),
  celebrate: (text?: string) => window.WebPet?.celebrate(text),
  jump: (height?: number) => window.WebPet?.jump(height),
  walkTo: (x: number) => window.WebPet?.walkTo(x),
  runTo: (x: number) => window.WebPet?.runTo(x),
  sleep: () => window.WebPet?.sleep(),
  wake: () => window.WebPet?.wake(),
  hide: () => window.WebPet?.hide(),
  show: () => window.WebPet?.show(),
  toggle: () => window.WebPet?.toggle(),
  work: (text?: string | null) => window.WebPet?.work(text),
  stopWork: (mood?: PetMood, text?: string) => window.WebPet?.stopWork(mood, text),
  readAloud: (text?: string | null) => window.WebPet?.readAloud(text),
  stopReading: (mood?: PetMood, text?: string) => window.WebPet?.stopReading(mood, text),
  get instance(): WebPetAPI | undefined {
    return window.WebPet;
  },
};

export type Pet = typeof pet;

export function usePet(): Pet {
  return pet;
}

/* ---------- Mount once near the root ---------- */

export interface WebPetProps extends Omit<WebPetConfig, 'autoStart'> {
  enabled?: boolean;
}

export function WebPet({ enabled = true, ...config }: WebPetProps): null {
  const configKey = JSON.stringify(config);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    window.WebPetConfig = { ...(JSON.parse(configKey) as WebPetConfig), autoStart: false };
    void import('./webpet-core.js').then(() => {
      if (!cancelled) window.WebPetBoot?.();
    });

    return () => {
      cancelled = true;
      window.WebPet?.destroy();
    };
  }, [enabled, configKey]);

  return null;
}

/* ---------- Render errors don’t reach window.onerror, so catch them here ---------- */

interface PetErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface PetErrorBoundaryState {
  hasError: boolean;
}

export class PetErrorBoundary extends Component<PetErrorBoundaryProps, PetErrorBoundaryState> {
  state: PetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    pet.react('sad', 'Uh-oh… something broke.');
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

export default WebPet;
