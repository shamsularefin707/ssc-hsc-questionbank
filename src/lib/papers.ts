// Board and admission papers: resolving a paper's question ids to questions, and grouping papers for browsing.
import type { ChapterData, Cq, Mcq, PaperIndex, RichBi } from './types';

/** Distinct chapters a paper draws from, in first-seen order. */
export function paperChapters(p: PaperIndex): string[] {
  return [...new Set([...p.mcq, ...p.cq].map((id) => p.chapterOf?.[id]).filter((c): c is string => !!c))];
}

/** The paper's questions in the paper's own order. Ids missing from the data are skipped. */
export async function resolvePaper(p: PaperIndex, load: (chapter: string) => Promise<ChapterData>): Promise<{ mcqs: Mcq<RichBi>[]; cqs: Cq<RichBi>[] }> {
  const data = await Promise.all(paperChapters(p).map(load));
  const byId = new Map(data.flatMap((c) => c.questions.map((q) => [q.id, q] as const)));
  return {
    mcqs: p.mcq.map((id) => byId.get(id)).filter((q): q is Mcq<RichBi> => q?.kind === 'mcq'),
    cqs: p.cq.map((id) => byId.get(id)).filter((q): q is Cq<RichBi> => q?.kind === 'cq'),
  };
}

export interface AdmissionGroup {
  institution: string;
  papers: PaperIndex[];
}

/** Admission papers of one category, grouped by institution (A–Z), newest session first, then unit. */
export function groupAdmission(papers: PaperIndex[], category: 'medical' | 'engineering' | 'varsity'): AdmissionGroup[] {
  const groups = new Map<string, PaperIndex[]>();
  for (const p of papers) {
    if (p.source.kind !== 'admission' || p.source.category !== category) continue;
    groups.set(p.source.institution, [...(groups.get(p.source.institution) ?? []), p]);
  }
  const key = (p: PaperIndex) => (p.source.kind === 'admission' ? p.source : { session: '', unit: '' });
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([institution, ps]) => ({
      institution,
      papers: ps.sort((a, b) => key(b).session.localeCompare(key(a).session) || (key(a).unit ?? '').localeCompare(key(b).unit ?? '')),
    }));
}
