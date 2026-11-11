import { SimpleAuthForm } from "../simple-form";

export const metadata = { title: "Password baru · Jajanku" };

export default function ResetPasswordPage() {
  return <SimpleAuthForm kind="reset" />;
}
