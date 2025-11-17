"use client";
import { useState } from "react";
import { ScrollAnimation } from "../ScrollAnimation";
import { FAQIcon } from "../Icons/FAQIcon";
import { useLanguage } from "@/contexts/LanguageContext";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => (
  <div className="border-b-2 border-gray-6 hover:border-primary-8 transition-all duration-300">
    <button
      onClick={onToggle}
      className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-gray-3 transition-colors duration-300 group"
    >
      <span className="text-gray-12 font-medium text-base sm:text-lg group-hover:text-primary-10 transition-colors duration-300">
        {question}
      </span>
      <div
        className={`transform transition-transform duration-300 ${
          isOpen ? "rotate-180" : "-rotate-90"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-gray-11 group-hover:text-primary-10 transition-colors duration-300 sm:w-4 sm:h-4"
        >
          <path
            d="M12 6L8 10L4 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="px-3 sm:px-4 pb-4 sm:pb-6">
        <p className="text-gray-11 leading-relaxed text-sm sm:text-base">
          {answer}
        </p>
      </div>
    </div>
  </div>
);

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const { t } = useLanguage();

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index)
        ? prev.filter((item) => item !== index)
        : [...prev, index]
    );
  };

  const faqData = [
    {
      question: t("faq.question1"),
      answer: t("faq.answer1"),
    },
    {
      question: t("faq.question2"),
      answer: t("faq.answer2"),
    },
    {
      question: t("faq.question3"),
      answer: t("faq.answer3"),
    },
    {
      question: t("faq.question4"),
      answer: t("faq.answer4"),
    },
    {
      question: t("faq.question5"),
      answer: t("faq.answer5"),
    },
    {
      question: t("faq.question6"),
      answer: t("faq.answer6"),
    },
  ];

  const leftColumnData = faqData.filter((_, index) => index % 2 === 0);
  const rightColumnData = faqData.filter((_, index) => index % 2 === 1);

  return (
    <ScrollAnimation type="fade" direction="up" delay={0.2} duration={0.8}>
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <FAQIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-12">
              {t("faq.title")}
            </h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
          <div className="flex-1 space-y-3 sm:space-y-4">
            {leftColumnData.map((faq, index) => {
              const originalIndex = index * 2;
              return (
                <div
                  key={originalIndex}
                  className="bg-gray-3 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <FAQItem
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openItems.includes(originalIndex)}
                    onToggle={() => toggleItem(originalIndex)}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4">
            {rightColumnData.map((faq, index) => {
              const originalIndex = index * 2 + 1;
              return (
                <div
                  key={originalIndex}
                  className="bg-gray-3 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <FAQItem
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openItems.includes(originalIndex)}
                    onToggle={() => toggleItem(originalIndex)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollAnimation>
  );
}
