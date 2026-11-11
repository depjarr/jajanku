/** Kerangka berkilau yang langsung tampil saat pindah halaman, sambil menunggu data. */
export default function Loading() {
  return (
    <div className="animate-in" aria-busy="true" aria-label="Memuat">
      <div className="mb-2 h-10" />
      <div className="skeleton mb-2 h-9 w-48 rounded-xl" />
      <div className="skeleton mb-6 h-4 w-32 rounded-lg" />
      <div className="skeleton mb-5 h-44 w-full rounded-[28px]" />
      <div className="skeleton mb-4 h-11 w-full rounded-[14px]" />
      <div className="mb-5 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-36 w-full rounded-[28px]" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}
