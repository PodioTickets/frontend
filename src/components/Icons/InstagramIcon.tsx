export function InstagramIcon({
  className = "w-6 h-6",
}: {
  className?: string;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
