import { readFileSync } from "fs";
import { join } from "path";

const PROMPTS_DIR = join(process.cwd(), "prompts");

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const content = readFileSync(join(PROMPTS_DIR, `${name}.md`), "utf-8");
  cache.set(name, content);
  return content;
}
