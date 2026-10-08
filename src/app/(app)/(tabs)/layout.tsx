import { AppNav } from "@/components/AppNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="page">{children}</main>
      <AppNav />
    </>
  );
}
