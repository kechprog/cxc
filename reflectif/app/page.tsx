import { RecordButton } from "@/components/RecordButton";
import { DailySnapshot } from "@/components/DailySnapshot";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] lg:min-h-[80vh] py-6 lg:py-0">
      <RecordButton />

      {/* Daily Snapshot Section */}
      {/* TODO: API CALL - GET /api/user/progress */}
      <div className="mt-4 lg:mt-8 w-full flex justify-center px-4 lg:px-0">
        <DailySnapshot />
      </div>
    </div>
  );
}
