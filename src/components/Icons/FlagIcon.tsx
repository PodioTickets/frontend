export function FlagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 18.3334V11.6667M2.5 11.6667V2.50008M2.5 11.6667H5.83333M2.5 2.50008V1.66675M2.5 2.50008H12.5C13.4205 2.50008 14.1667 3.24627 14.1667 4.16675V5.83341M14.1667 5.83341H15.8333C16.7538 5.83341 17.5 6.57961 17.5 7.50008V14.1667C17.5 15.0872 16.7538 15.8334 15.8333 15.8334H7.5C6.57953 15.8334 5.83333 15.0872 5.83333 14.1667V11.6667M14.1667 5.83341V10.0001C14.1667 10.9206 13.4205 11.6667 12.5 11.6667H5.83333"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
