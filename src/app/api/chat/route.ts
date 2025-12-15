import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import data from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";
import { z } from "zod";
const challenges: ChallengesDictionary = data;
import fs from "fs";

const aiRequest = z.object({
  // prompt: z.string(),
  challengeId: z.string(),
});

// this function should get prompt which includes the image and should return
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // add zed type check here
    const { challengeId } = aiRequest.parse(body);

    const challenge = challenges[challengeId];
    const imageBuffer = fs.readFileSync(
      `public/challenges/${challenge.imageFile}.png`
    );
    const image = imageBuffer.toString("base64");

    const { text } = await generateText({
      model: "anthropic/claude-3-haiku",
      prompt: [
        {
          role: "user",
          content: [
            { type: "text", text: "what do you see in the image?" },
            { type: "image", image },
          ],
        },
      ],
    });
    return NextResponse.json({ text }, { status: 200 });
  } catch (error) {
    console.error("Ai chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
