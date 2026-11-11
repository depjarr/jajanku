import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ daftar?: string }> }) {
  const { daftar } = await searchParams;
  return <AuthForm mode="login" notice={daftar === "ok" ? "Akun berhasil dibuat! Silakan masuk." : undefined} />;
}
