import { ConsentScreen } from "@/components/ConsentScreen";

export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { updated } = await searchParams;
  return (
    <main className="page">
      <ConsentScreen updated={updated === "1"} />
    </main>
  );
}
