"use client";

import React, { useState } from 'react';
import { X, CheckCircle, XCircle, RotateCcw, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { ToeicQuizQuestion } from '../types';

interface ToeicQuizModalProps {
  quiz: ToeicQuizQuestion[];
  isOpen: boolean;
  onClose: () => void;
  onSaveScore?: (score: number, total: number) => void;
}

export function ToeicQuizModal({ quiz, isOpen, onClose, onSaveScore }: ToeicQuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen || !quiz || quiz.length === 0) return null;

  const currentQ = quiz[currentIndex];
  const selectedOption = selectedAnswers[currentIndex];
  const hasAnsweredCurrent = selectedOption !== undefined;

  const handleSelectOption = (idx: number) => {
    if (hasAnsweredCurrent) return; // Không cho đổi sau khi đã chọn
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: idx }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIndex < quiz.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      // Tính điểm
      const correctCount = quiz.reduce(
        (acc, q, idx) => (selectedAnswers[idx] === q.correctAnswer ? acc + 1 : acc),
        0
      );
      onSaveScore?.(correctCount, quiz.length);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowExplanation(false);
    setIsFinished(false);
  };

  const correctTotal = quiz.reduce(
    (acc, q, idx) => (selectedAnswers[idx] === q.correctAnswer ? acc + 1 : acc),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles size={16} />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Thử thách TOEIC Part 5
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {!isFinished ? (
          <>
            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Câu {currentIndex + 1} / {quiz.length}</span>
                <span>Từ khóa: <strong className="text-blue-600 dark:text-blue-400">{currentQ.targetWord}</strong></span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentIndex + 1) / quiz.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* 4 Options */}
            <div className="space-y-2">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === currentQ.correctAnswer;
                
                let btnStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 text-slate-800 dark:text-slate-200";

                if (hasAnsweredCurrent) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold";
                  } else if (isSelected) {
                    btnStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold";
                  } else {
                    btnStyle = "opacity-50 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={hasAnsweredCurrent}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {hasAnsweredCurrent && isCorrect && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
                    {hasAnsweredCurrent && isSelected && !isCorrect && <XCircle size={18} className="text-rose-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Next */}
            {showExplanation && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-xs space-y-1 animate-in fade-in duration-200">
                <span className="font-bold text-blue-700 dark:text-blue-300">Giải thích chi tiết:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Next button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleNext}
                disabled={!hasAnsweredCurrent}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <span>{currentIndex === quiz.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          // FINISHED SUMMARY SCREEN
          <div className="text-center py-6 space-y-5">
            <div className="inline-flex p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/60 dark:border-amber-900/40 shadow-xs">
              <Trophy size={48} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Hoàn thành bài kiểm tra!
              </h3>
              <p className="text-sm text-slate-500">
                Bạn đã trả lời đúng <strong className="text-emerald-600 text-base">{correctTotal}/{quiz.length}</strong> câu
                ({Math.round((correctTotal / quiz.length) * 100)}%)
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Làm lại</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
