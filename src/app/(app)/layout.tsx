import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { Toaster } from "@/components/toaster";
import { FlightLayer } from "@/components/flight";

/**
 * HP: konten + tab bar bawah.
 * Tablet: rail ikon di kiri. Desktop: sidebar lengkap di kiri.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-bg min-h-dvh md:flex">
      <SideNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-xl px-4 pb-36 pt-[max(env(safe-area-inset-top),12px)] md:max-w-none md:px-8 md:pb-12 md:pt-8 lg:px-12 xl:max-w-6xl">
          {children}
        </div>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
      <Toaster />
      <FlightLayer />
    </div>
  );
}
