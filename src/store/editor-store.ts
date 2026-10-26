"use client"

import { produce, type Draft } from "immer"
import { create } from "zustand"

import type { Resume } from "@/lib/resume/schema"

/*
 * Single source of truth for the open resume. Form fields write here and the
 * preview reads from here, which is why every keystroke shows up instantly.
 * Autosave subscribes to the same store.
 */

type SaveState = "idle" | "saving" | "saved" | "error"

type EditorState = {
  resume: Resume | null
  saveState: SaveState
  revision: number
  past: Resume[]
  future: Resume[]
  lastPush: number
  load: (resume: Resume) => void
  update: (recipe: (draft: Draft<Resume>) => void) => void
  undo: () => void
  redo: () => void
  setSaveState: (s: SaveState) => void
}

const HISTORY_LIMIT = 60
/** Edits closer together than this merge into one undo step. */
const GROUP_MS = 700

export const useEditor = create<EditorState>((set, get) => ({
  resume: null,
  saveState: "idle",
  revision: 0,
  past: [],
  future: [],
  lastPush: 0,
  load: (resume) => set({ resume, past: [], future: [], revision: 0, saveState: "saved" }),
  update: (recipe) => {
    const { resume, past, lastPush, revision } = get()
    if (!resume) return
    const next = produce(resume, recipe)
    if (next === resume) return
    const now = Date.now()
    const grouped = now - lastPush < GROUP_MS
    set({
      resume: next,
      past: grouped ? past : [...past.slice(-HISTORY_LIMIT + 1), resume],
      future: [],
      lastPush: now,
      revision: revision + 1,
    })
  },
  undo: () => {
    const { resume, past, future, revision } = get()
    if (!resume || !past.length) return
    set({
      resume: past[past.length - 1],
      past: past.slice(0, -1),
      future: [resume, ...future],
      lastPush: 0,
      revision: revision + 1,
    })
  },
  redo: () => {
    const { resume, past, future, revision } = get()
    if (!resume || !future.length) return
    set({
      resume: future[0],
      past: [...past, resume],
      future: future.slice(1),
      lastPush: 0,
      revision: revision + 1,
    })
  },
  setSaveState: (saveState) => set({ saveState }),
}))

/** Read the open resume. Only valid inside the editor, where it is loaded. */
export function useResume(): Resume {
  const resume = useEditor((s) => s.resume)
  if (!resume) throw new Error("No resume loaded")
  return resume
}

export const updateResume = (recipe: (draft: Draft<Resume>) => void) => useEditor.getState().update(recipe)
