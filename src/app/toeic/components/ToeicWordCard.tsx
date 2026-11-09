"use client";

import React, { useState } from 'react';
import { Volume2, Volume1, CheckCircle2, Circle, Lightbulb, Sparkles, BookOpen } from 'lucide-react';
import { ToeicWord } from '../types';

interface ToeicWordCardProps {
  word: ToeicWord;
  isMastered: boolean;
  onToggleMastered: (word: string) => void;
}

export function ToeicWordCard({ word, isMastered, onToggleMastered }: ToeicWordCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const playAudio = (rate = 1.0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    
    setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const getPosBadgeColor = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes('verb')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (p.includes('noun')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (p.includes('adj')) return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (p.includes('adv')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className={`group relative rounded-2xl p-5 border transition-all duration-200 ${
      isMastered 
        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs' 
        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-xs hover:shadow-md'
    }`}>
      {/* Header: Từ vựng, Phiên âm, Audio & Nút Đánh dấu */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {word.word}
            </h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPosBadgeColor(word.partOfSpeech)}`}>
              {word.partOfSpeech}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {word.ipa}
            </span>
          </div>

          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {word.meaningVi}
          </p>
        </div>

        {/* Audio buttons & Mastered toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => playAudio(1.0)}
            title="Phát âm chuẩn (Tốc độ chuẩn)"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isPlaying 
                ? 'bg-blue-600 text-white animate-pulse' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600'
            }`}
          >
            <Volume2 size={18} />
          </button>

          <button
            onClick={() => playAudio(0.75)}
            title="Phát âm chậm 0.75x"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 transition-all cursor-pointer text-xs font-medium"
          >
            <Volume1 size={18} />
          </button>

          <button
            onClick={() => onToggleMastered(word.word)}
            title={isMastered ? "Đã thuộc (Nhấn để bỏ)" : "Đánh dấu đã thuộc"}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isMastered 
                ? 'bg-emerald-500 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
            }`}
          >
            {isMastered ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
        </div>
      </div>

      {/* TOEIC Exam Context Example */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <BookOpen size={14} className="text-blue-500" />
          <span>Ví dụ ngữ cảnh TOEIC:</span>
        </div>
        <p className="text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
          &ldquo;{word.exampleEn}&rdquo;
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          👉 {word.exampleVi}
        </p>
      </div>

      {/* Word Family & Collocations */}
      <div className="mt-3.5 space-y-2">
        {word.wordFamily && word.wordFamily.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Họ từ:
            </span>
            {word.wordFamily.map((wf, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
              >
                <strong className="font-semibold">{wf.word}</strong>
                <span className="text-slate-400 text-[10px] ml-1">({wf.partOfSpeech})</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">- {wf.meaningVi}</span>
              </span>
            ))}
          </div>
        )}

        {word.collocations && word.collocations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Cụm hay gặp:
            </span>
            {word.collocations.map((col, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40"
              >
                {col}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TOEIC Real Exam Tip */}
      {word.toeicTip && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setShowTip(!showTip)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
          >
            <Lightbulb size={14} />
            <span>Mẹo thi TOEIC cho từ này</span>
            <Sparkles size={12} className="animate-pulse" />
          </button>
          {showTip && (
            <div className="mt-2 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 p-2.5 rounded-xl leading-relaxed">
              {word.toeicTip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
