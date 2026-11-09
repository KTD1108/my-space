"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCw, Volume2, CheckCircle2, Circle } from 'lucide-react';
import { ToeicWord } from '../types';

interface ToeicFlashcardModalProps {
  words: ToeicWord[];
  isOpen: boolean;
  onClose: () => void;
  masteredWords: string[];
  onToggleMastered: (word: string) => void;
}

export function ToeicFlashcardModal({
  words,
  isOpen,
  onClose,
  masteredWords,
  onToggleMastered,
}: ToeicFlashcardModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentWord = words[currentIndex];
  const isMastered = currentWord ? masteredWords.includes(currentWord.word) : false;

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % words.length);
  }, [words.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
  }, [words.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const playAudio = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  // Keyboard navigation: Space = Flip, ArrowLeft = Prev, ArrowRight = Next, Esc = Close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleFlip, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentWord) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span>Thẻ {currentIndex + 1} / {words.length}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span className="text-[11px] text-slate-400">Phím tắt: [Space] Lật • [← / →] Đổi từ</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>

        {/* Flashcard 3D Container */}
        <div
          onClick={handleFlip}
          className="relative w-full h-80 cursor-pointer select-none perspective-[1000px]"
        >
          <div
            className={`w-full h-full duration-500 transition-transform transform-3d rounded-2xl p-6 flex flex-col justify-between border ${
              isFlipped ? 'rotate-y-180 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
            }`}
          >
            {!isFlipped ? (
              // FRONT FACE
              <div className="h-full flex flex-col justify-between items-center text-center py-4">
                <span className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-3 py-1 rounded-full">
                  {currentWord.partOfSpeech}
                </span>

                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {currentWord.word}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                      {currentWord.ipa}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(currentWord.word);
                      }}
                      className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RotateCw size={13} />
                  <span>Nhấn vào thẻ để xem nghĩa & ví dụ</span>
                </div>
              </div>
            ) : (
              // BACK FACE
              <div className="h-full flex flex-col justify-between py-2 rotate-y-180">
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Định nghĩa tiếng Việt
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{currentWord.word}</span>
                  </div>

                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {currentWord.meaningVi}
                  </p>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300 italic">
                      &ldquo;{currentWord.exampleEn}&rdquo;
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      👉 {currentWord.exampleVi}
                    </p>
                  </div>

                  {currentWord.collocations && currentWord.collocations.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {currentWord.collocations.map((col, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
                  <RotateCw size={13} />
                  <span>Nhấn để quay lại mặt trước</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls: Prev, Flip, Next, Mastered */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>Từ trước</span>
          </button>

          <button
            onClick={() => onToggleMastered(currentWord.word)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isMastered
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600'
            }`}
          >
            {isMastered ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            <span>{isMastered ? 'Đã thuộc' : 'Chưa thuộc'}</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            <span>Từ kế</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
