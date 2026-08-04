import { AuthErrorView } from "./AuthErrorView";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <AuthErrorView error={error ?? null} />;
}
