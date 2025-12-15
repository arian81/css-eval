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
Output ONLY the code in this exact format - no explanations, no markdown:

<style>
  /* your CSS here */
</style>
<div>
  <!-- your HTML here -->
</div>

The output will be rendered in a 400x300 iframe. The image given to you has a size of 800x600px. Use that to correctly align the elements.`;

export type GenerateResult = {
  streams: Record<string, StreamableValue<string, unknown>>;
};

export async function generate(
  challengeId: string,
  models: SupportedModel[]
): Promise<GenerateResult> {
  const challenge = challenges[challengeId];
  const imageBuffer = fs.readFileSync(
    `public/challenges/${challenge.imageFile}.png`
  );
  const image = imageBuffer.toString("base64");

  const streams: Record<string, StreamableValue<string, unknown>> = {};

  for (const modelId of models) {
    const stream = createStreamableValue("");
    streams[modelId] = stream.value;

    (async () => {
      try {
        const { textStream } = streamText({
          model: gateway(modelId),
          system: SYSTEM_PROMPT,
          stopWhen: stepCountIs(5),
          messages: [{ role: "user", content: [{ type: "image", image }] }],
        });

        for await (const partial of textStream) {
          stream.update(partial);
        }
        stream.done();
      } catch (error) {
        console.error(`Error streaming from ${modelId}:`, error);
        stream.error(error);
      }
    })();
  }

  return { streams };
}
