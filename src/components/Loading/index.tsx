"use client";

export function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-2/80 backdrop-blur-sm">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-11"></div>
    </div>
  );
}

export function LoadingAnimation() {
  return (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-11"></div>
  )
}
