import { Dataset } from "crawlee";
import fs from "fs";
import { crawler, generateUrls } from "./scraper.js";
import { challegeSchema, ChallengesDictionary } from "./types.js";

const urls = generateUrls();
await crawler.run(urls);
const dataset = await Dataset.open("challenges");
const { items } = await dataset.getData();

const validatedItems = challegeSchema.array().safeParse(items);
if (!validatedItems.success) {
  console.error(validatedItems.error);
  process.exit(1);
}

const challengesDictionary: ChallengesDictionary = {};
for (const item of validatedItems.data) {
  challengesDictionary[item.challengeId] = item;
}

fs.writeFileSync(
  "./src/challenges.json",
  JSON.stringify(challengesDictionary, null, 2),
);
fs.cpSync("./src/challenges.json", "../../src/data/challenges.json", {
  recursive: true,
});
fs.cpSync("./storage/key_value_stores/images", "../../public/challenges", {
  recursive: true,
});
