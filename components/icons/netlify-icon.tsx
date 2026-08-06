export default function NetlifyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19.6 12h24.8L52 19.6v24.8L44.4 52H19.6L12 44.4V19.6L19.6 12Z"
        fill="#00C7B7"
      />
      <path
        d="M27.2 24a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm9.6 9.6a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm-9.6 0h6.4V40h-6.4v-6.4Zm9.6-9.6H40v6.4h-3.2a3.2 3.2 0 0 1 0-6.4Z"
        fill="white"
      />
    </svg>
  );
}
