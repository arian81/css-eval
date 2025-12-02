import { Dataset } from "crawlee";
import { writeFileSync } from "node:fs";
import { crawler, generateUrls } from "./scraper.js";
import { challegeSchema, Challenge } from "./types.js";

const urls = generateUrls();
await crawler.run(urls);
const dataset = await Dataset.open('challenges');
const { items } = await dataset.getData();

const validatedItems = challegeSchema.array().safeParse(items);
if (!validatedItems.success) {
  console.error(validatedItems.error);
  process.exit(1);
}
// flat object is probably the easiest to process later
const sortedItems = validatedItems.data.sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.challengeId.localeCompare(b.challengeId);
});

writeFileSync(
  "./storage/challenges.json",
  JSON.stringify(sortedItems, null, 2),
);
