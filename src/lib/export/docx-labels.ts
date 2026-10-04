// Labels shared by the Word export and the print view (kept apart so the print page doesn't load docx).
import type { QuestionSet } from '../set-builder';

export const EXPORT_LABELS = {
  bn: { mcq: 'বহুনির্বাচনি প্রশ্ন', cq: 'সৃজনশীল প্রশ্ন', answerSheet: 'উত্তরপত্র', fullMarks: 'পূর্ণমান', mcqAnswers: 'বহুনির্বাচনি প্রশ্নের উত্তর', cqSolutions: 'সৃজনশীল প্রশ্নের সমাধান' },
  en: { mcq: 'Multiple-choice questions', cq: 'Creative questions', answerSheet: 'Answer Sheet', fullMarks: 'Full marks', mcqAnswers: 'MCQ answers', cqSolutions: 'CQ solutions' },
} as const;

/** Full marks: 1 per MCQ plus 10 per CQ. */
export const fullMarks = (set: QuestionSet) => set.mcqs.length + set.cqs.length * 10;

