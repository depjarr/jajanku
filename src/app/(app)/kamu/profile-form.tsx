"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "../actions";
import { inputCls } from "@/components/item-fields";

export function ProfileForm({ displayName, diaryName }: { displayName: string; diaryName: string }) {
  const [v, setV] = useState({ display_name: displayName, diary_name: diaryName });
  const [msg, setMsg] = useState<{ ok?: boolean; text: string }>();
  const [pending, start] = useTransition();
  return (
    <form
      className="window space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveProfile(v);
          setMsg(r.error ? { text: r.error } : { ok: true, text: "Tersimpan ✓" });
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-semibold">Nama panggilan</span>
        <input value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} className={`mt-1 ${inputCls}`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Nama diary</span>
        <input value={v.diary_name} onChange={(e) => setV({ ...v, diary_name: e.target.value })} className={`mt-1 ${inputCls}`} />
        <span className="mt-1 block text-xs text-muted">Muncul di header halaman Meja.</span>
      </label>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-strong" : "text-accent-text"}`}>{msg.text}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-ink disabled:opacity-60">
        {pending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}
