export type Mood = 1 | 2 | 3 | 4 | 5;
export type ContextCategory =
  | 'akademik'
  | 'interpersonal'
  | 'internal'
  | 'finansial'
  | 'media'
  | 'tak_terduga';
export type ExperienceDimension = 'emosi' | 'fisik' | 'pikiran' | 'self_esteem';
export type CopingHelped = 'ya' | 'sedikit' | 'tidak' | 'belum_tahu';
export type RiskLevel = 'none' | 'concern' | 'urgent';

/** subTag: id taksonomi atau "custom:<label>" */
export interface ContextTag {
  category: ContextCategory;
  subTag: string | null;
}
/** tag: id taksonomi atau "custom:<label>" */
export interface ExperienceTag {
  dimension: ExperienceDimension;
  tag: string;
}
export interface CopingTag {
  tag: string;
  helped: CopingHelped;
}
/** Semua nilai adalah id taksonomi. */
export interface Suggestions {
  contexts: ContextCategory[];
  experiences: string[];
  copings: string[];
}

export interface Entry {
  id: string;
  createdAt: string; // ISO 8601 dengan offset lokal
  updatedAt: string;
  mood: Mood;
  note: string | null;
  contexts: ContextTag[];
  experiences: ExperienceTag[];
  copings: CopingTag[];
  aiSuggested: string[]; // id yang diterima dari saran AI
  pendingSuggestions: Suggestions | null;
  safetyShownLevel: RiskLevel; // tingkat tertinggi yang sudah ditampilkan untuk catatan ini
}
export type NewEntry = Pick<Entry, 'mood'> &
  Partial<Pick<Entry, 'note' | 'contexts' | 'experiences' | 'copings' | 'createdAt'>>;

export type PatternKind = 'low_mood_context' | 'low_mood_experience' | 'helpful_coping';
export interface Pattern {
  key: string; // `${kind}:${subject}`, mis. "low_mood_context:akademik"
  kind: PatternKind;
  subject: string;
  subjectLabel: string;
  count: number; // catatan yang memuat subject
  hitCount: number; // low-mood (atau "membantu" untuk coping) di antara count
  rate: number; // hitCount / count
  baselineRate: number; // proporsi low-mood di seluruh periode (0 untuk coping)
  previouslyRejected: boolean;
}
export interface PatternSummary {
  periodStart: string;
  periodEnd: string;
  entryCount: number;
  moodDistribution: Record<Mood, number>;
  patterns: Pattern[];
  enoughData: boolean;
}
export interface Insight {
  id: string;
  createdAt: string;
  kind: 'weekly' | 'on_demand';
  weekKey: string | null; // "YYYY-MM-DD" Senin, khusus weekly
  periodStart: string;
  periodEnd: string;
  summary: PatternSummary;
  text: string;
  patternTexts: Record<string, string>;
  questions: string[];
  source: 'ai' | 'local';
  reflection: string | null;
}
export type FeedbackValue = 'sesuai' | 'sebagian' | 'tidak_sesuai';
export interface Contact {
  name: string;
  phone: string | null;
  url: string | null;
}
export interface AppSettings {
  onboardingDone: boolean;
  aiEnabled: boolean;
  aiConsentAt: string | null;
  reminderTime: string | null; // "HH:mm" atau null = mati
  weeklyNudge: boolean;
  weeklyNudgeDay: number; // 1 = Senin (ISO weekday)
  campusContact: Contact | null;
  personalContact: Contact | null;
  lastWorseningPromptAt: string | null;
}
export const DEFAULT_SETTINGS: AppSettings = {
  onboardingDone: false,
  aiEnabled: false,
  aiConsentAt: null,
  reminderTime: null,
  weeklyNudge: true,
  weeklyNudgeDay: 1,
  campusContact: null,
  personalContact: null,
  lastWorseningPromptAt: null,
};
