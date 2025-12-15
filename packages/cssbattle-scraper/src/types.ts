import { Dictionary } from "crawlee";
import z from "zod";

export const PageTypes = {
  MONTHLY_CHALLENGES: "MONTHLY_CHALLENGES",
  CHALLENGE: "CHALLENGE",
} as const;

export type PageType = (typeof PageTypes)[keyof typeof PageTypes];


export interface MonthlyChallengePageURL {
  url: string;
  label: PageType;
  userData: {
    month: number;
    year: number;
  };
}

export interface Challenge extends Dictionary {
  challengeId: string;
  name: string;
  url: string;
  month: number;
  year: number;
  imageUrl: string | null;
  imageFile: string | null;
}

export const challegeSchema = z.object({
  challengeId: z.string(),
  name: z.string(),
  url: z.string(),
  month: z.number(),
  year: z.number(),
  imageUrl: z.string().nullable(),
  imageFile: z.string().nullable(),
});

export type ChallengesDictionary = Record<string, Challenge>;