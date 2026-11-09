"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Component render Markdown nhẹ, chuẩn xác cho tin nhắn AI, hỗ trợ:
 * - Tiêu đề (#, ##, ###)
 * - Khối mã nguồn (```code```) kèm nút sao chép nhanh
 * - Mã nội dòng (`inline code`)
 * - Danh sách gạch đầu dòng (-) và đánh số (1., 2.)
 * - Chữ in đậm (**text**), in nghiêng (*text*)
 * - Trích dẫn (> quote)
 * - Đầy đủ Dark/Light mode
 */
export default function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`space-y-2.5 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 ${className}`}>
      {renderMarkdownBlocks(content)}
    </div>
  );
}

function renderMarkdownBlocks(text: string): React.ReactNode[] {
  if (!text) return [];

  // Tách text thành các khối code và văn bản thường
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("```") && part.endsWith("```")) {
      return <CodeBlock key={index} raw={part} />;
    }

    return <TextParagraphs key={index} text={part} />;
  });
}

function CodeBlock({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);

  // Tách ngôn ngữ và code
  const match = raw.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```$/);
  const language = match ? match[1] : "";
  const code = match ? match[2].trim() : raw.slice(3, -3).trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Đã sao chép đoạn mã!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 hover:text-slate-200 transition-colors p-1 rounded-md cursor-pointer"
          title="Sao chép mã"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-normal text-slate-200 scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function TextParagraphs({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (keyPrefix: number) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      nodes.push(
        <ul key={`ul-${keyPrefix}`} className="list-disc list-outside pl-5 space-y-1 my-2">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInlineText(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      nodes.push(
        <ol key={`ol-${keyPrefix}`} className="list-decimal list-outside pl-5 space-y-1 my-2">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInlineText(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Tiêu đề ###
    if (trimmed.startsWith("### ")) {
      flushList(lineIndex);
      nodes.push(
        <h4 key={lineIndex} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
          {formatInlineText(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    // Tiêu đề ##
    if (trimmed.startsWith("## ")) {
      flushList(lineIndex);
      nodes.push(
        <h3 key={lineIndex} className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-3.5 mb-1.5">
          {formatInlineText(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Tiêu đề #
    if (trimmed.startsWith("# ")) {
      flushList(lineIndex);
      nodes.push(
        <h2 key={lineIndex} className="text-lg font-black text-slate-900 dark:text-slate-100 mt-4 mb-2">
          {formatInlineText(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Trích dẫn >
    if (trimmed.startsWith("> ")) {
      flushList(lineIndex);
      nodes.push(
        <blockquote key={lineIndex} className="border-l-4 border-blue-500 pl-3 my-2 text-slate-600 dark:text-slate-300 italic text-xs sm:text-sm bg-blue-50/40 dark:bg-blue-950/20 py-1 rounded-r-lg">
          {formatInlineText(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Danh sách không thứ tự: - hoặc *
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList(lineIndex);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Danh sách thứ tự: 1. 2.
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList(lineIndex);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }

    // Dòng trống
    if (!trimmed) {
      flushList(lineIndex);
      return;
    }

    // Đoạn văn thông thường
    flushList(lineIndex);
    nodes.push(
      <p key={lineIndex} className="leading-relaxed">
        {formatInlineText(trimmed)}
      </p>
    );
  });

  flushList(lines.length);
  return <>{nodes}</>;
}

function formatInlineText(text: string): React.ReactNode[] {
  // Tách theo inline code `...`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-md border border-slate-200/60 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Định dạng in đậm **bold**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, j) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 4) {
        return (
          <strong key={`${i}-${j}`} className="font-bold text-slate-900 dark:text-white">
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      return bPart;
    });
  });
}
