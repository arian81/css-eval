"use server";

import data from "@/data/challenges.json";
import { createStreamableValue, type StreamableValue } from "@ai-sdk/rsc";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";
import { stepCountIs, streamText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import type { SupportedModel } from "./types";
import fs from "fs";

const challenges: ChallengesDictionary = data;

const SYSTEM_PROMPT = `You are a CSS/HTML expert. Your task is to replicate the given image using only HTML and CSS.

CRITICAL: The image you receive is 800x600px, but it will be rendered in a 400x300px iframe. You must scale everything by 0.5 (50%) to fit correctly.

Output ONLY the code in this exact format - no explanations, no markdown:

<style>
  body {
    margin: 0;
    padding: 0;
    width: 400px;
    height: 300px;
    overflow: hidden;
  }
  /* your CSS here */
</style>
<div>
  <!-- your HTML here -->
</div>

IMPORTANT RULES:
1. All dimensions should be scaled to 50% of what you see in the 800x600px image
2. Use body as your container - it's already set to 400x300px
3. Never set fixed 800x600px dimensions on any element
4. Position elements relative to the 400x300px viewport
5. Use percentages or viewport units when possible for better scaling`;

export type GenerateResult = {
  streams: Record<string, StreamableValue<string, unknown>>;
};

export async function generate(
  challengeId: string,
  models: SupportedModel[],
): Promise<GenerateResult> {
  const challenge = challenges[challengeId];
  const imageBuffer = fs.readFileSync(
    `public/challenges/${challenge.imageFile}.png`,
  );
  const image = imageBuffer.toString("base64");

  const streams: Record<string, StreamableValue<string, unknown>> = {};

  for (const modelId of models) {
    const stream = createStreamableValue("");
    streams[modelId] = stream.value;

    (async () => {
      let hasErrored = false;
      try {
        const { textStream } = streamText({
          onError: (error) => {
            hasErrored = true;
            stream.error(error.error);
          },
          model: gateway(modelId),
          system: SYSTEM_PROMPT,
          stopWhen: stepCountIs(20),
          messages: [{ role: "user", content: [{ type: "image", image }] }],
        });

        for await (const partial of textStream) {
          stream.update(partial);
        }
        if (!hasErrored) {
          stream.done();
        }
      } catch (error) {
        console.error(`Error streaming from ${modelId}:`, error);
        if (!hasErrored) {
          stream.error(error);
        }
      }
    })();
  }

  return { streams };
}
