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
/** "Only N matching MCQs exist. Showing all N." */
export const shortfallText = (n: number, kind: 'MCQ' | 'CQ', lang: Lang) =>
  lang === 'bn' ? `মিলে যাওয়া ${kind} আছে মাত্র ${digits(n, 'bn')}টি। সবগুলো দেখানো হলো।` : `Only ${n} matching ${kind}s exist. Showing all ${n}.`;

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
  bookmark: { bn: 'বুকমার্ক করুন', en: 'Bookmark' },
  unbookmark: { bn: 'বুকমার্ক সরান', en: 'Remove bookmark' },
  navBuild: { bn: 'প্রশ্নসেট তৈরি', en: 'Build a set' },
  buildTitle: { bn: 'প্রশ্নসেট তৈরি করুন', en: 'Build a question set' },
  buildIntro: { bn: 'অধ্যায়, কাঠিন্য ও সংখ্যা বেছে নিন। প্রশ্ন শুধু ব্যাংক থেকেই নেওয়া হয়।', en: 'Pick chapters, difficulty and how many questions. Questions only come from the bank.' },
  allChapters: { bn: 'কোনো অধ্যায় না বাছলে সব অধ্যায় থেকে নেওয়া হবে।', en: 'Leave chapters empty to use every chapter.' },
  mcqCount: { bn: 'MCQ সংখ্যা', en: 'Number of MCQs' },
  cqCount: { bn: 'CQ সংখ্যা', en: 'Number of CQs' },
  buildSet: { bn: 'সেট তৈরি করুন', en: 'Build set' },
  reshuffle: { bn: 'আবার এলোমেলো করুন', en: 'Reshuffle' },
  practise: { bn: 'অনুশীলন শুরু করুন', en: 'Start practice' },
  printPdf: { bn: 'প্রিন্ট / PDF', en: 'Print or save as PDF' },
  downloadWord: { bn: 'Word ডাউনলোড', en: 'Download Word' },
  emptySet: { bn: 'এই বাছাইয়ে কোনো প্রশ্ন নেই', en: 'No questions match this set' },
  emptySetHint: { bn: 'কাঠিন্য বা ধরন কমিয়ে আবার চেষ্টা করুন।', en: 'Loosen the difficulty or type and build again.' },
  badLink: { bn: 'এই লিংকটি অসম্পূর্ণ', en: 'This link is incomplete' },
  badLinkHint: { bn: 'প্রশ্নসেট তৈরির পাতা থেকে নতুন সেট তৈরি করুন।', en: 'Build a new set from the set builder.' },
  goHome: { bn: 'হোম পেজে যান', en: 'Go to the home page' },
  practiceTitle: { bn: 'MCQ অনুশীলন', en: 'MCQ practice' },
  practiceNoMcq: { bn: 'এই সেটে কোনো MCQ নেই', en: 'This set has no MCQs' },
  questionOf: { bn: 'প্রশ্ন', en: 'Question' },
  of: { bn: '/', en: 'of' },
  previous: { bn: 'আগের প্রশ্ন', en: 'Previous question' },
  next: { bn: 'পরের প্রশ্ন', en: 'Next question' },
  showAll: { bn: 'সব প্রশ্ন একসাথে দেখাও', en: 'Show all questions' },
  showOne: { bn: 'একটি করে দেখাও', en: 'Show one at a time' },
  correct: { bn: 'সঠিক', en: 'Correct' },
  incorrect: { bn: 'ভুল', en: 'Incorrect' },
  correctAnswer: { bn: 'সঠিক উত্তর', en: 'Correct answer' },
  score: { bn: 'আপনার স্কোর', en: 'Your score' },
  newSet: { bn: 'নতুন সেটে অনুশীলন', en: 'Practise a new set' },
  editSet: { bn: 'সেট বদলান', en: 'Change the set' },
  answered: { bn: 'উত্তর দেওয়া হয়েছে', en: 'answered' },
} satisfies Record<string, Bi>;
