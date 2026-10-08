import { HistoryList } from "@/components/HistoryList";
import { th } from "@/copy/th";

export default function HistoryPage() {
  return (
    <>
      <h1 className="h1">{th.history.title}</h1>
      <HistoryList />
    </>
  );
}
