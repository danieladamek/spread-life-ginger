import { useEffect, useState } from 'react';
import type { BuildErrors, Concept, Figure, GlossaryEntry, RecipesFile, Reference, Section, SynthesisPassage, TermShort, TodoFile } from '@/types';

/** Full data files as separate chunks in dist/ (no runtime fetch of external content). */
const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}
export const loadSections = () => once('sections', () => import('@/data/sections.json').then((m) => m.default as unknown as Section[]));
export const loadSynthesis = () => once('synthesis', () => import('@/data/synthesis.json').then((m) => m.default as unknown as SynthesisPassage[]));
export const loadTerms = () => once('terms', () => import('@/data/glossary-short.json').then((m) => new Map((m.default as unknown as TermShort[]).map((t) => [t.id, t]))));
export const loadGlossary = () => once('glossary', () => import('@/data/glossary.json').then((m) => m.default as unknown as GlossaryEntry[]));
export const loadConcepts = () => once('concepts', () => import('@/data/concepts.json').then((m) => m.default as unknown as Concept[]));
export const loadFigures = () => once('figures', () => import('@/data/figures.json').then((m) => m.default as unknown as Figure[]));
export const loadReferences = () => once('references', () => import('@/data/references.json').then((m) => m.default as unknown as Reference[]));
export const loadRecipes = () => once('recipes', () => import('@/data/recipes.json').then((m) => m.default as unknown as RecipesFile));
export const loadScope = () => once('scope', () => import('@/data/scope.json').then((m) => m.default as unknown as Record<string, unknown>));
export const loadTodo = () => once('todo', () => import('@/data/todo.json').then((m) => m.default as unknown as TodoFile));
export const loadBuildErrors = () => once('build-errors', () => import('@/data/build-errors.json').then((m) => m.default as unknown as BuildErrors));

/** Resolve a loader into state; `undefined` while loading. */
export function useAsync<T>(load: () => Promise<T>): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => { let live = true; load().then((x) => { if (live) setV(x); }); return () => { live = false; }; }, [load]);
  return v;
}
