import { Dataset } from "crawlee";
import fs from "fs";
import { crawler, generateUrls } from "./scraper.js";
import { challegeSchema } from "./types.js";

const urls = generateUrls();
await crawler.run(urls);
const dataset = await Dataset.open("challenges");
const { items } = await dataset.getData();

const validatedItems = challegeSchema.array().safeParse(items);
if (!validatedItems.success) {
  console.error(validatedItems.error);
  process.exit(1);
}
// flat object is probably the easiest to process later
const sortedItems = validatedItems.data.sort(
  (a, b) => new Date(a.name).getTime() - new Date(b.name).getTime(),
);

fs.writeFileSync("./src/challenges.json", JSON.stringify(sortedItems, null, 2));
fs.cpSync("./src/challenges.json", "../../src/data/challenges.json", {recursive: true})
fs.cpSync("./storage/key_value_stores/images", "../../src/data/images", {recursive: true})
