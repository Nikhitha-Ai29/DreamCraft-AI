export default function BrandLogo({ compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/dreamcraft-mark.svg"
        alt=""
        aria-hidden="true"
        className={compact ? 'h-9 w-9' : 'h-11 w-11'}
      />
      <span className="flex flex-col leading-none">
        <span className={`${compact ? 'text-lg' : 'text-xl'} font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-burgundy-600 via-plum-500 to-saffron-500`}>
          DreamCraft
        </span>
        {!compact && <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-gray-400">Made from imagination</span>}
      </span>
    </span>
  );
}
