export interface WordFamilyItem {
  word: string;
  partOfSpeech: string;
  meaningVi: string;
}

export interface ToeicWord {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string; // noun, verb, adjective, adverb, ...
  meaningVi: string;
  topic: string;
  exampleEn: string;
  exampleVi: string;
  wordFamily?: WordFamilyItem[];
  collocations?: string[];
  toeicTip?: string;
}

export interface ToeicQuizQuestion {
  id: string;
  targetWord: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0, 1, 2, 3
  explanation: string;
}

export interface DailyVocabSet {
  dateStr: string; // YYYY-MM-DD
  topic: string;
  words: ToeicWord[];
  generatedAt: string;
  modelUsed?: string;
  quiz?: ToeicQuizQuestion[];
}

export interface ToeicStudyProgress {
  masteredWords: string[]; // List of word strings
  streakCount: number;
  lastStudyDate: string;
  quizScores: Record<string, { correct: number; total: number; date: string }>;
}
