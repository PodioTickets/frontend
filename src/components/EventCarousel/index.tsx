"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { EventCard } from "@/components/Event/Card";
import { useEvents } from "@/hooks/useEvents";

interface EventCarouselProps {
  items?: number;
  itemsPerView?: number;
  itemsPerViewMobile?: number;
  itemsPerViewTablet?: number;
}

export function EventCarousel({
  items = 10,
  itemsPerView = 4,
  itemsPerViewMobile = 1,
  itemsPerViewTablet = 2,
}: EventCarouselProps) {
  const { events, pagination, isLoading } = useEvents({
    page: 1,
    limit: items,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [currentItemsPerView, setCurrentItemsPerView] = useState(itemsPerView);
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const eventItems = Array.from({ length: items }, (_, i) => i);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCurrentItemsPerView(itemsPerViewMobile);
        setIsMobile(true);
      } else if (window.innerWidth < 1024) {
        setCurrentItemsPerView(itemsPerViewTablet);
        setIsMobile(false);
      } else {
        setCurrentItemsPerView(itemsPerView);
        setIsMobile(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [itemsPerView, itemsPerViewMobile, itemsPerViewTablet]);

  const totalSlides = Math.ceil(eventItems.length / currentItemsPerView);
  const maxIndex = Math.max(0, totalSlides - 1);

  const goToSlide = useCallback(
    (index: number) => {
      const newIndex = Math.max(0, Math.min(index, maxIndex));
      setCurrentIndex(newIndex);
    },
    [maxIndex]
  );

  const goNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!carouselRef.current) return;
    const cardWidth = carouselRef.current.offsetWidth / currentItemsPerView;
    const gap = 16; // gap-4 = 16px
    const scrollPosition =
      currentIndex * (cardWidth + gap) * currentItemsPerView;

    carouselRef.current.scrollTo({
      left: scrollPosition,
      behavior: "smooth",
    });
  }, [currentIndex, currentItemsPerView]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [currentItemsPerView]);

  return (
    <div className="relative w-full">
      {/* Hide navigation arrows on mobile, show on desktop */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-10 h-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg"
          aria-label="Previous slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-12"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {currentIndex < maxIndex && (
        <button
          onClick={goNext}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-10 h-10 rounded-full bg-gray-2 border border-gray-6 items-center justify-center hover:bg-gray-4 transition-all duration-200 shadow-lg"
          aria-label="Next slide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-12"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide p-3 md:overflow-x-hidden"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {events?.map((event, index) => (
          <div
            key={index}
            className={`shrink-0 ${
              isMobile 
                ? "w-[85vw] md:w-auto" 
                : ""
            }`}
            style={
              !isMobile
                ? {
                    width: `calc((100% - ${
                      (currentItemsPerView - 1) * 16
                    }px) / ${currentItemsPerView})`,
                  }
                : undefined
            }
          >
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {/* Dots Navigation - Hide on mobile */}
      {totalSlides > 1 && (
        <div className="hidden md:flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                currentIndex === index
                  ? "bg-primary-12 w-8"
                  : "bg-gray-6 hover:bg-gray-8"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
