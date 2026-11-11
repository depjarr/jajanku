import { LargeTitle } from "@/components/ui/large-title";

/** Header halaman: judul besar ala iOS yang mengecil ke nav bar saat di-scroll. */
export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: string }) {
  return <LargeTitle title={title} subtitle={subtitle} back={back} />;
}
