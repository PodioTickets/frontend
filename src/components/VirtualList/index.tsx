"use client";
import { useState, useRef, useMemo, ReactNode, useCallback } from "react";

interface VirtualListProps {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  renderItem: (item: any, index: number) => ReactNode;
  className?: string;
}

export function VirtualList({
  items,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 3,
  renderItem,
  className = "",
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);
  
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex: start, endIndex: end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      index: startIndex + idx,
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${containerHeight}px`, willChange: 'scroll-position' }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            willChange: 'transform',
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div 
              key={index} 
              style={{ 
                height: `${itemHeight}px`,
                minHeight: `${itemHeight}px`,
                maxHeight: `${itemHeight}px`,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

