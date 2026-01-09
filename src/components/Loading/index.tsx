"use client";

export function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-2/80 backdrop-blur-sm">
      <div className="loading-container">
        <div className="loading-dot"></div>
        <div className="loading-dot"></div>
        <div className="loading-dot"></div>
      </div>
    </div>
  );
}

