import { SignInPanel } from "@/components/SignInPanel";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; signedout?: string }> }) {
  const { error, signedout } = await searchParams;
  return (
    <main className="page">
      <SignInPanel failed={Boolean(error)} signedOut={signedout === "1"} />
    </main>
  );
}
