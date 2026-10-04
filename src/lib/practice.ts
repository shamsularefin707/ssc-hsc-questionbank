// MCQ practice scoring.
import type { Mcq, RichBi } from './types';

export interface PracticeScore {
  correct: number;
  answered: number;
  total: number;
  done: boolean;
}

/** `answers` maps question id → chosen option index. */
export function scorePractice(mcqs: Mcq<RichBi>[], answers: Record<string, number>): PracticeScore {
  let correct = 0;
  let answered = 0;
  for (const q of mcqs) {
    if (!(q.id in answers)) continue;
    answered++;
    if (answers[q.id] === q.answer) correct++;
  }
  return { correct, answered, total: mcqs.length, done: mcqs.length > 0 && answered === mcqs.length };
}

/** Ids of the first question in each অভিন্ন set, so list views show each stimulus once. */
export function stimulusLeaders(mcqs: Mcq<RichBi>[]): Set<string> {
  const seen = new Set<string>();
  const leaders = new Set<string>();
  for (const q of mcqs) {
    if (!q.stimulus_id) continue;
    const key = `${q.chapter}/${q.stimulus_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leaders.add(q.id);
  }
  return leaders;
}
