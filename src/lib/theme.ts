'use client'

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'gymfit-theme'

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Safari private mode throws on storage access; theme is never worth a crash. */
function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Preference simply won't persist across reloads.
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  // Follow the OS only while the user hasn't made an explicit choice.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = (event: MediaQueryListEvent) => {
    if (readStoredTheme() !== null) return
    applyTheme(event.matches ? 'dark' : 'light')
    notify()
  }
  media.addEventListener('change', onSystemChange)

  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystemChange)
  }
}

/**
 * The <html data-theme> attribute is the single source of truth -- the inline
 * boot script in the root layout sets it before first paint, so reading it here
 * avoids a flash and keeps CSS and JS consumers (charts) in agreement.
 */
function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function getServerSnapshot(): Theme {
  return 'light'
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function setTheme(theme: Theme) {
  writeStoredTheme(theme)
  applyTheme(theme)
  notify()
}

/**
 * Runs blocking in <head> before first paint. Inlined as a string because
 * next/script defers, which would show a light flash on every load.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`
