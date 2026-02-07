import { processConversation } from "@/app/api/_lib/pipeline";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const id = crypto.randomUUID();

  // Save to data/ for testing
  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, `${id}.wav`);
  await writeFile(filePath, buffer);
  console.log(`Saved recording to ${filePath}`);

  try {
    const analysis = await processConversation(buffer, audioFile.name);
    // TODO: persist analysis to DB via DbHandlers
    return NextResponse.json({ id, status: "completed", analysis });
  } catch (error) {
    console.error("Processing failed:", error);
    return NextResponse.json(
      {
        id,
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 },
    );
  }
}
