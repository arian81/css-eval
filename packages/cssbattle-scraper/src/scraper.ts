import { PlaywrightCrawler, KeyValueStore, Dataset } from "crawlee";
import { launchOptions } from "camoufox-js";
import { firefox } from "playwright";
import { MonthlyChallengePageURL, PageTypes } from "./types.js";

const dataset = await Dataset.open("challenges");
const datasetData = await dataset.getData();

// basically use as a cache to avoid fetching the same url twice
const urlCache = new Set(datasetData.items.map((item) => item.url));

export const crawler = new PlaywrightCrawler({
    // Use the requestHandler to process each of the crawled pages.
    async requestHandler({ request, page, enqueueLinks, log }) {
      if (request.label === PageTypes.MONTHLY_CHALLENGES) {
        try {
          await page.waitForSelector('a[href^="/play/"]', { timeout: 5000 });
        } catch {
          log.warning(
            `No challenge links found on ${request.url} - page may be empty or not loaded`,
          );
          return;
        }
        await enqueueLinks({
          selector: 'a[href^="/play/"]',
          label: "CHALLENGE",
          userData: {
            month: request.userData.month,
            year: request.userData.year,
          },
          // remove query paramters
          transformRequestFunction: (req) => {
            try {
              const url = new URL(req.url);
              url.search = "";
              req.url = url.toString();
              return req;
            } catch (err) {
              log.error(err instanceof Error ? err.message : "Uknown Error" );
              // ignore in case removing query paramters fucks up stuff somehow
              return req;
            }
          },
        });
      } else if (request.label === PageTypes.CHALLENGE) {

        if (urlCache.has(request.url)) {
          return;
        }

        const challengeId = request.url.split("/play/")[1];
        const { month, year } = request.userData;
        const title = await page.locator(".level").textContent()
  
        try {
          await page.waitForSelector("img.levelpage__target", { timeout: 5000 });
        } catch {
          log.warning(`Target image not found on ${request.url}`);
          await dataset.pushData({
            name: title ?? "Name not found",
            challengeId,
            url: request.url,
            month: request.userData.month,
            year: request.userData.year,
            imageUrl: null,
            imageFile: null,
            error: "Target image not found",
          }
        );
          return;
        }
        const locator = page.locator("img.levelpage__target");
        const imageData = {
          src: await locator.getAttribute("src"),
          srcset: await locator.getAttribute("srcset"),
        };
  
        let imageFile: string | null = null;
        if (imageData.src) {
          try {
            // Use the 2x image if available for better quality
            const imageUrl = imageData.srcset
              ? imageData.srcset.split(" ")[0]
              : imageData.src;
  
            const paddedMonth = String(month).padStart(2, "0");
            imageFile = `${year}-${paddedMonth}_${challengeId}`;
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const store = await KeyValueStore.open("images");
            await store.setValue(imageFile, Buffer.from(buffer), {
              contentType: "image/png",
            });
            log.info(`Downloaded image: ${imageFile}`);
          } catch (err) {
            log.warning(
              `Failed to download image for ${challengeId}: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
            imageFile = null;
          }
        }
  
        
  
        await dataset.pushData({
          challengeId,
          name: title ?? "Name not found",
          url: request.url,
          month,
          year,
          imageUrl: imageData.src,
          imageFile,
        });
  
        log.debug(request.url);
      } else {
        log.error(
          "not sure how this happened but this is unsupported page type. ",
        );
      }
    },
    browserPoolOptions: {
      // Disable the default fingerprint spoofing to avoid conflicts with Camoufox.
      useFingerprints: false,
    },
    // use undetectable browser
    launchContext: {
      launcher: firefox,
      launchOptions: await launchOptions({
        headless: true,
      }),
    },
  });
  
  export const generateUrls = () => {
    const urls: MonthlyChallengePageURL[] = [];
    const startYear = 2025;
    const startMonth = 6; // June 2023 - first daily challenges
  
    // Get current date to set end boundary
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;
  
      for (let month = monthStart; month <= monthEnd; month++) {
        const url = new URL("https://cssbattle.dev/daily");
        url.searchParams.set("month", String(month));
        url.searchParams.set("year", String(year));
        urls.push({
          url: url.toString(),
          label: "MONTHLY_CHALLENGES",
          userData: { month, year },
        });
      }
    }
  
    return urls;
  }