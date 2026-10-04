// Bilingual UI labels.
import type { Bi, Difficulty, Lang, McqType, Source } from './types';

export const DIFFICULTY: Record<Difficulty, Bi> = {
  easy: { bn: 'সহজ', en: 'Easy' },
  medium: { bn: 'মধ্যম', en: 'Medium' },
  hard: { bn: 'কঠিন', en: 'Hard' },
};

export const MCQ_TYPE: Record<McqType, Bi> = {
  gyanmulok: { bn: 'জ্ঞানমূলক', en: 'Knowledge' },
  onudhabon: { bn: 'অনুধাবনমূলক', en: 'Comprehension' },
  bohupodi: { bn: 'বহুপদী সমাপ্তিসূচক', en: 'Multiple completion' },
  ovinno: { bn: 'অভিন্ন তথ্যভিত্তিক', en: 'Shared stimulus' },
};

export const KIND: Record<'mcq' | 'cq', Bi> = {
  mcq: { bn: 'বহুনির্বাচনি (MCQ)', en: 'MCQ' },
  cq: { bn: 'সৃজনশীল (CQ)', en: 'CQ' },
};

export const SOURCE_KIND: Record<Source['kind'], Bi> = {
  original: { bn: 'অনুশীলনী', en: 'Practice' },
  board: { bn: 'বোর্ড প্রশ্ন', en: 'Board' },
  admission: { bn: 'ভর্তি পরীক্ষা', en: 'Admission' },
};

export const BOARDS: Record<string, Bi> = {
  dhaka: { bn: 'ঢাকা', en: 'Dhaka' },
  rajshahi: { bn: 'রাজশাহী', en: 'Rajshahi' },
  cumilla: { bn: 'কুমিল্লা', en: 'Cumilla' },
  jashore: { bn: 'যশোর', en: 'Jashore' },
  chattogram: { bn: 'চট্টগ্রাম', en: 'Chattogram' },
  barishal: { bn: 'বরিশাল', en: 'Barishal' },
  sylhet: { bn: 'সিলেট', en: 'Sylhet' },
  dinajpur: { bn: 'দিনাজপুর', en: 'Dinajpur' },
  mymensingh: { bn: 'ময়মনসিংহ', en: 'Mymensingh' },
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const digits = (n: number | string, lang: Lang) => (lang === 'bn' ? String(n).replace(/\d/g, (d) => BN_DIGITS[+d]) : String(n));

/** Short source label for a question card, or null for original questions. */
export function sourceLabel(s: Source, lang: Lang): string | null {
  if (s.kind === 'board') return `${BOARDS[s.board]?.[lang] ?? s.board} ${digits(s.year, lang)}`;
  if (s.kind === 'admission') return `${s.institution.toUpperCase()} ${digits(s.session, lang)}${s.unit ? ` · ${s.unit}` : ''}`;
  return null;
}

export const UI = {
  siteName: { bn: 'প্রশ্নব্যাংক', en: 'Question Bank' },
  navBank: { bn: 'প্রশ্নব্যাংক', en: 'Question bank' },
  navBoard: { bn: 'বোর্ড প্রশ্ন', en: 'Board questions' },
  navAdmission: { bn: 'ভর্তি পরীক্ষা', en: 'Admission' },
  showSolution: { bn: 'সমাধান দেখাও', en: 'Show solution' },
  hideSolution: { bn: 'সমাধান লুকাও', en: 'Hide solution' },
  copy: { bn: 'কপি', en: 'Copy' },
  copied: { bn: 'কপি হয়েছে', en: 'Copied' },
  copyFailed: { bn: 'কপি করা যায়নি', en: 'Couldn’t copy' },
  answer: { bn: 'উত্তর', en: 'Answer' },
  explanation: { bn: 'ব্যাখ্যা', en: 'Explanation' },
  filters: { bn: 'ফিল্টার', en: 'Filters' },
  chapters: { bn: 'অধ্যায়', en: 'Chapters' },
  topics: { bn: 'বিষয়বস্তু', en: 'Topics' },
  difficulty: { bn: 'কাঠিন্য', en: 'Difficulty' },
  kind: { bn: 'প্রশ্নের ধরন', en: 'Question type' },
  mcqType: { bn: 'MCQ-এর ধরন', en: 'MCQ type' },
  source: { bn: 'উৎস', en: 'Source' },
  search: { bn: 'প্রশ্ন খুঁজুন', en: 'Search questions' },
  clearSearch: { bn: 'খোঁজা মুছুন', en: 'Clear search' },
  clearAll: { bn: 'সব মুছুন', en: 'Clear all' },
  closeFilters: { bn: 'ফিল্টার বন্ধ করুন', en: 'Close filters' },
  questions: { bn: 'টি প্রশ্ন', en: ' questions' },
  noMatch: { bn: 'এই ফিল্টারে কোনো প্রশ্ন নেই', en: 'No questions match these filters' },
  noMatchHint: { bn: 'শেষ বাছাইটি সরিয়ে আবার দেখুন।', en: 'Remove the last filter you changed to see more.' },
  clearLast: { bn: 'শেষ ফিল্টার মুছুন', en: 'Clear last filter' },
  loadError: { bn: 'অধ্যায়টি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।', en: 'Couldn’t load this chapter. Check your connection and try again.' },
  tryAgain: { bn: 'আবার চেষ্টা করুন', en: 'Try again' },
  showMore: { bn: 'আরও দেখাও', en: 'Show more' },
  draft: { bn: 'খসড়া', en: 'Draft' },
  stimulus: { bn: 'উদ্দীপক', en: 'Stimulus' },
  solution: { bn: 'সমাধান', en: 'Solution' },
  marks: { bn: 'নম্বর', en: 'marks' },
  comingSoon: { bn: 'শীঘ্রই আসছে', en: 'Coming soon' },
} satisfies Record<string, Bi>;
