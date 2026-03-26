export function BannerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.4" d="M2 6C2 3.79086 3.79086 2 6 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H6C3.79086 22 2 20.2091 2 18V6Z" fill="currentColor" />
      <path d="M6 21.9989H18C20.2091 21.9989 22 20.208 22 17.9989V13.9989L19.061 11.8828C17.5338 10.7832 15.4467 10.8969 14.0479 12.1558L9.95209 15.842C8.55331 17.1009 6.4662 17.2145 4.93901 16.115L2 13.9989V17.9989C2 20.208 3.79086 21.9989 6 21.9989Z" fill="currentColor" />
      <circle cx="8.5" cy="8.5" r="2.5" fill="currentColor" />
    </svg>

  )
}