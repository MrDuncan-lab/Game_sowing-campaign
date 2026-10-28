// The training farm runs its projects in one week (engine/tutorial.ts). The pages that show a project's
// length read this flag, so the price tag says what will really happen.
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { TutorialArea } from '../engine/tutorial';
export const QuickProjects = createContext(false);
export const useLessonWeeks = () => { const quick = useContext(QuickProjects); return (w: number) => (quick ? Math.min(1, w) : w); };
// The training farm keeps parts of the farm closed until their lesson. A closed part stays where it is,
// with a lock: it can be looked at, not used. The value is why it is closed (null — open).
export const LessonLocks = createContext<(area: TutorialArea) => string | null>(() => null);
export const useLessonLock = () => useContext(LessonLocks);
