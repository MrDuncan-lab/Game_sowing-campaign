// The training farm runs its projects in one week (engine/tutorial.ts). The pages that show a project's
// length read this flag, so the price tag says what will really happen.
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
export const QuickProjects = createContext(false);
export const useLessonWeeks = () => { const quick = useContext(QuickProjects); return (w: number) => (quick ? Math.min(1, w) : w); };
