
import { redirect,  } from "next/navigation";
import data from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";

const challenges: ChallengesDictionary = data;
const challengeIds = Object.keys(challenges);

export const dynamic = 'force-dynamic';


export default function Page() {
  // const router = useRouter();
  // Server only component, so no useEffect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const randomId = challengeIds[Math.floor(Math.random() * challengeIds.length)];

  redirect(`/challenge/${randomId}`, );

  return <div></div>;
}
