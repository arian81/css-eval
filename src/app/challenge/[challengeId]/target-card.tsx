import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface TargetCardProps {
  imageUrl: string;
  challengeName: string;
}

export function TargetCard({ imageUrl, challengeName }: TargetCardProps) {
  return (
    <Card className="bg-white border-neutral-200 border-2 border-dashed w-[400px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-neutral-500 text-xs uppercase tracking-wider">
          Target
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative w-[400px] h-[300px] bg-neutral-100 overflow-hidden">
          <Image
            src={imageUrl}
            fill
            style={{ objectFit: "contain" }}
            alt={`${challengeName} target`}
            priority
          />
        </div>
      </CardContent>
    </Card>
  );
}

