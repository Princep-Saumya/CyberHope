export default function JanSunoLogo({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20 3L32 8V18C32 26.5 26.8 34.3 20 37C13.2 34.3 8 26.5 8 18V8L20 3Z"
        className="fill-zinc-950 stroke-amber-500"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M14 20H16V24H14V20Z" className="fill-amber-400" />
      <path d="M18 15H20V29H18V15Z" className="fill-amber-500" />
      <path d="M22 11H24V31H22V11Z" className="fill-amber-400" />
      <path d="M26 17H28V27H26V17Z" className="fill-amber-500" />
      <circle cx="20" cy="20" r="1.5" className="fill-amber-300" />
    </svg>
  );
}
