import { redirect } from "next/navigation";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  // Keep legacy emailed links working, but route all recovery through the
  // session-verified page. Never allow an email address alone to reset a password.
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    }
  }

  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  redirect(`/update-password${suffix}`);
}
