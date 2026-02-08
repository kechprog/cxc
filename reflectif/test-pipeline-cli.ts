// Quick CLI test for the pipeline - run with: npx tsx test-pipeline-cli.ts
import "dotenv/config";
import { readFile } from "fs/promises";
import { processConversation } from "./app/api/_lib/pipeline";

async function main() {
  console.log("Loading audio file...");
  const buffer = Buffer.from(await readFile("dialog.wav"));

  console.log("Running pipeline (AssemblyAI + ffmpeg + Speaker-ID + Hume)...\n");

  try {
    const result = await processConversation(buffer, "dialog.wav", null);

    console.log("=== PIPELINE RESULT ===\n");
    console.log(`Speakers found: ${result.speakers.length}`);

    for (const speaker of result.speakers) {
      console.log(`\n--- ${speaker.displayName} (isUser: ${speaker.isUser}) ---`);
      console.log(`Utterances: ${speaker.utterances.length}`);

      for (const u of speaker.utterances.slice(0, 3)) {
        const topEmotions = u.emotions
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(e => `${e.name}: ${(e.score * 100).toFixed(1)}%`)
          .join(", ");

        console.log(`  [${u.start.toFixed(1)}s] "${u.text.slice(0, 50)}..."`);
        console.log(`    Emotions: ${topEmotions || "none"}`);
      }

      if (speaker.utterances.length > 3) {
        console.log(`  ... and ${speaker.utterances.length - 3} more utterances`);
      }
    }

    console.log("\n=== SUCCESS ===");
  } catch (error) {
    console.error("\n=== PIPELINE FAILED ===");
    console.error(error);
    process.exit(1);
  }
}

main();
