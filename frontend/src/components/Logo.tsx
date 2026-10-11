// Собственный знак раздела «Старт»: стрелка вверх в скруглённом квадрате.
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-[12px] text-white"
        style={{ width: size, height: size, background: 'linear-gradient(135deg, #5b3df5 0%, #ff5fa2 100%)' }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      </div>
      <span className="text-[20px] font-extrabold tracking-tight">Старт</span>
    </div>
  )
}
