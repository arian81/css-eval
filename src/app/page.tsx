"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import data from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";

const challenges: ChallengesDictionary = data;
const challengeIds = Object.keys(challenges);

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const randomId =
      challengeIds[Math.floor(Math.random() * challengeIds.length)];
    router.replace(`/challenge/${randomId}`);
  }, [router]);

  return null;
}
