import { RecordButton } from "@/components/RecordButton";
import { DailySnapshot } from "@/components/DailySnapshot";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <RecordButton />

      {/* Daily Snapshot Section */}
      <div className="mt-8 w-full flex justify-center">
        <DailySnapshot />
      </div>
    </div>
  );
}
