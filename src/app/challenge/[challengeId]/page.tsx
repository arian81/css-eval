import data from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";
import { ChallengeClient } from "./challenge-client";
import { TargetCard } from "./target-card";
import { redirect } from "next/navigation";

const challenges: ChallengesDictionary = data;

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = challenges[challengeId];

  if (!challenge) {
    redirect("/");
  }

  const imageUrl = `/challenges/${challenge.imageFile}.png`;

  return (
    <ChallengeClient challenge={challenge} targetImageUrl={imageUrl}>
      <TargetCard imageUrl={imageUrl} challengeName={challenge.name} />
    </ChallengeClient>
  );
}
