"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DailyVocabHeader } from './components/DailyVocabHeader';
import { ToeicWordCard } from './components/ToeicWordCard';
import { ToeicFlashcardModal } from './components/ToeicFlashcardModal';
import { ToeicQuizModal } from './components/ToeicQuizModal';
import { getDailyToeicVocabAI, generateToeicQuizAI } from './actions';
import { DailyVocabSet, ToeicQuizQuestion, ToeicStudyProgress } from './types';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

const CACHE_STORAGE_KEY = 'myspace_toeic_daily_cache_v1';
const PROGRESS_STORAGE_KEY = 'myspace_toeic_progress_v1';
const WORD_COUNT_KEY = 'myspace_toeic_word_count_v1';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ToeicDailyPage() {
  const [currentDate, setCurrentDate] = useState<string>(getTodayString);
  const [vocabSet, setVocabSet] = useState<DailyVocabSet | null>(null);
  const [wordCount, setWordCount] = useState<number>(6);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  // User progress state
  const [progress, setProgress] = useState<ToeicStudyProgress>({
    masteredWords: [],
    streakCount: 1,
    lastStudyDate: getTodayString(),
    quizScores: {},
  });

  // Load progress and preferred word count from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setProgress(parsed);
      }
      const savedCount = localStorage.getItem(WORD_COUNT_KEY);
      if (savedCount) {
        const count = Number(savedCount);
        if ([4, 6, 8, 10, 12].includes(count)) {
          setWordCount(count);
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc tiến độ học từ vựng:", e);
    }
  }, []);

  // Update streak when learning
  const recordStudyActivity = useCallback(() => {
    const today = getTodayString();
    setProgress((prev) => {
      let newStreak = prev.streakCount;
      if (prev.lastStudyDate !== today) {
        const last = new Date(prev.lastStudyDate);
        const now = new Date(today);
        const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 3600 * 24));
        newStreak = diffDays === 1 ? prev.streakCount + 1 : 1;
      }
      const updated: ToeicStudyProgress = {
        ...prev,
        streakCount: newStreak,
        lastStudyDate: today,
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load words for selected date (cache-first)
  const loadDailyWords = useCallback(async (dateStr: string, forceRefresh = false, countOverride?: number) => {
    setIsLoading(true);
    setError(null);
    const targetCount = countOverride || wordCount;
    const cacheKey = `${dateStr}_${targetCount}`;

    try {
      if (!forceRefresh) {
        const cacheRaw = localStorage.getItem(CACHE_STORAGE_KEY);
        if (cacheRaw) {
          const cache: Record<string, DailyVocabSet> = JSON.parse(cacheRaw);
          const cachedSet = cache[cacheKey] || (cache[dateStr]?.words?.length === targetCount ? cache[dateStr] : null);
          if (cachedSet && cachedSet.words?.length === targetCount) {
            setVocabSet(cachedSet);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch from Gemini AI
      const res = await getDailyToeicVocabAI(dateStr, undefined, targetCount);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Không thể sinh từ vựng TOEIC bằng AI.");
      }

      setVocabSet(res.data);
      recordStudyActivity();

      // Save to localStorage cache
      try {
        const cacheRaw = localStorage.getItem(CACHE_STORAGE_KEY);
        const cache: Record<string, DailyVocabSet> = cacheRaw ? JSON.parse(cacheRaw) : {};
        cache[cacheKey] = res.data;
        cache[dateStr] = res.data;
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
      } catch (err) {
        console.warn("Lỗi lưu cache từ vựng:", err);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo bộ từ.");
    } finally {
      setIsLoading(false);
    }
  }, [wordCount, recordStudyActivity]);

  const handleWordCountChange = (newCount: number) => {
    setWordCount(newCount);
    setError(null);
    setVocabSet(null); // Kích hoạt skeleton loading ngay lập tức cho người dùng thấy phản hồi
    try {
      localStorage.setItem(WORD_COUNT_KEY, String(newCount));
    } catch {}
    loadDailyWords(currentDate, true, newCount);
  };

  // Load initial words
  useEffect(() => {
    loadDailyWords(currentDate, false, wordCount);
  }, [currentDate, loadDailyWords, wordCount]);

  // Toggle mastered word
  const handleToggleMastered = (word: string) => {
    setProgress((prev) => {
      const exists = prev.masteredWords.includes(word);
      const updatedWords = exists
        ? prev.masteredWords.filter((w) => w !== word)
        : [...prev.masteredWords, word];

      const updated: ToeicStudyProgress = { ...prev, masteredWords: updatedWords };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    recordStudyActivity();
  };

  // Open Quiz
  const handleOpenQuiz = async () => {
    if (!vocabSet || vocabSet.words.length === 0) return;

    if (vocabSet.quiz && vocabSet.quiz.length > 0) {
      setIsQuizOpen(true);
      return;
    }

    setIsQuizLoading(true);
    try {
      const res = await generateToeicQuizAI(vocabSet.words);
      if (res.success && res.quiz) {
        const updatedVocabSet: DailyVocabSet = { ...vocabSet, quiz: res.quiz };
        setVocabSet(updatedVocabSet);

        // Update cache
        const cacheRaw = localStorage.getItem(CACHE_STORAGE_KEY);
        const cache: Record<string, DailyVocabSet> = cacheRaw ? JSON.parse(cacheRaw) : {};
        cache[currentDate] = updatedVocabSet;
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));

        setIsQuizOpen(true);
      } else {
        alert(res.error || "Không thể tạo câu hỏi trắc nghiệm.");
      }
    } catch (e: unknown) {
      alert("Lỗi khi tạo bài kiểm tra: " + (e instanceof Error ? e.message : ''));
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSaveQuizScore = (score: number, total: number) => {
    recordStudyActivity();
    setProgress((prev) => {
      const updated: ToeicStudyProgress = {
        ...prev,
        quizScores: {
          ...prev.quizScores,
          [currentDate]: { correct: score, total, date: new Date().toISOString() },
        },
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const masteredInCurrentSet = vocabSet?.words.filter((w) =>
    progress.masteredWords.includes(w.word)
  ).length || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header & Daily Controls */}
      <DailyVocabHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        topic={vocabSet?.topic || ''}
        modelUsed={vocabSet?.modelUsed}
        wordCount={wordCount}
        onWordCountChange={handleWordCountChange}
        streakCount={progress.streakCount}
        masteredCount={masteredInCurrentSet}
        totalWords={vocabSet?.words.length || 0}
        isLoading={isLoading || isQuizLoading}
        onRegenerate={() => loadDailyWords(currentDate, true)}
        onOpenFlashcard={() => setIsFlashcardOpen(true)}
        onOpenQuiz={handleOpenQuiz}
      />

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-3xl p-8 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col items-center justify-center space-y-3 py-16">
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 animate-spin">
            <RefreshCw size={28} />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            AI đang tuyển chọn {wordCount} từ vựng TOEIC cho ngày {currentDate}...
          </p>
          <p className="text-xs text-slate-400">
            Tối ưu hoá ví dụ thực chiến Part 5, 6, 7 và cụm từ thông dụng
          </p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="rounded-3xl p-6 border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-rose-500 shrink-0" />
            <span className="text-xs sm:text-sm text-rose-800 dark:text-rose-200 font-medium">{error}</span>
          </div>
          <button
            onClick={() => loadDailyWords(currentDate, true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Words Grid */}
      {!isLoading && !error && vocabSet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              <span>Danh sách {vocabSet.words.length} từ vựng trọng tâm hôm nay</span>
            </h2>
            <span className="text-xs text-slate-500">
              Nhấn loa để nghe phát âm giọng Mỹ bản xứ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vocabSet.words.map((item) => (
              <ToeicWordCard
                key={item.id}
                word={item}
                isMastered={progress.masteredWords.includes(item.word)}
                onToggleMastered={handleToggleMastered}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {vocabSet && (
        <>
          <ToeicFlashcardModal
            words={vocabSet.words}
            isOpen={isFlashcardOpen}
            onClose={() => setIsFlashcardOpen(false)}
            masteredWords={progress.masteredWords}
            onToggleMastered={handleToggleMastered}
          />

          <ToeicQuizModal
            quiz={vocabSet.quiz || []}
            isOpen={isQuizOpen}
            onClose={() => setIsQuizOpen(false)}
            onSaveScore={handleSaveQuizScore}
          />
        </>
      )}
    </div>
  );
}
