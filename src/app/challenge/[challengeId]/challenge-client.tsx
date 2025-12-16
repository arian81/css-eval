"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import React from "react";
import { useRouter } from "next/navigation";
import type { Challenge } from "@packages/cssbattle-scraper/src/types";
import { readStreamableValue } from "@ai-sdk/rsc";
import { generate } from "../../actions";
import { SUPPORTED_MODELS, type SupportedModel } from "../../types";
import challengesData from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";
import {
  IconX,
  IconCode,
  IconEye,
  IconPlayerPlay,
  IconRefresh,
  IconPlus,
  IconScale,
} from "@tabler/icons-react";
import { IframePreview, type IframePreviewHandle } from "@/components/iframe-preview";
import { compareIframeToImage, type CompareResult } from "@/lib/image-compare";


interface ChallengeClientProps {
  challenge: Challenge;
  targetImageUrl: string;
  children: React.ReactNode;
}

const challenges: ChallengesDictionary = challengesData;
const challengeIds = Object.keys(challenges);

export function ChallengeClient({ challenge, targetImageUrl, children }: ChallengeClientProps) {
  const router = useRouter();
  const [selectedModels, setSelectedModels] = React.useState<SupportedModel[]>([]);
  const [outputs, setOutputs] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showCode, setShowCode] = React.useState<Record<string, boolean>>({});
  const [scores, setScores] = React.useState<Record<string, CompareResult>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [comboboxOpen, setComboboxOpen] = React.useState(false);

  const iframeRefs = React.useRef<Record<string, IframePreviewHandle | null>>({});

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const availableModels = SUPPORTED_MODELS.filter(
    (m) => !selectedModels.includes(m)
  );

  const addModel = (model: SupportedModel) => {
    setSelectedModels((prev) => [...prev, model]);
  };

  const removeModel = (model: SupportedModel) => {
    setSelectedModels((prev) => prev.filter((m) => m !== model));
    setOutputs((prev) => {
      const next = { ...prev };
      delete next[model];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[model];
      return next;
    });
    setScores((prev) => {
      const next = { ...prev };
      delete next[model];
      return next;
    });
    delete iframeRefs.current[model];
  };

  const compareModel = async (modelId: string) => {
    const handle = iframeRefs.current[modelId];
    if (!handle) return;

    const iframe = handle.getIframe();
    if (!iframe) return;

    try {
      const result = await compareIframeToImage(iframe, targetImageUrl);
      setScores((prev) => ({ ...prev, [modelId]: result }));
    } catch (err) {
      console.error(`Failed to compare ${modelId}:`, err);
    }
  };

  const compareAllModels = async () => {
    await Promise.all(
      selectedModels
        .filter((modelId) => outputs[modelId] && !errors[modelId])
        .map(compareModel)
    );
  };

  const toggleCode = (model: string) => {
    setShowCode((prev) => ({ ...prev, [model]: !prev[model] }));
  };

  const goToRandomChallenge = () => {
    const randomId = challengeIds[Math.floor(Math.random() * challengeIds.length)];
    router.push(`/challenge/${randomId}`);
  };

  const handleSubmit = async () => {
    if (selectedModels.length === 0) return;

    setIsLoading(true);
    setOutputs({});
    setErrors({});
    setScores({});

    
    const { streams } = await generate(challenge.challengeId, selectedModels);

    const consumeStream = async (modelId: string) => {
      try {
        for await (const chunk of readStreamableValue(streams[modelId])) {
          if (chunk) {
            setOutputs((prev) => ({
              ...prev,
              [modelId]: (prev[modelId] || "") + chunk,
            }));
          }
        }
      } catch (err) {
        const baseMessage = err instanceof Error ? err.message : "Unknown error";
        const message = `${baseMessage}(Most likely because this model does not support image inputs.)`;
        setErrors((prev) => ({ ...prev, [modelId]: message }));
      }
    };

    await Promise.allSettled(selectedModels.map(consumeStream));
    setIsLoading(false);
  };

  const modelsByProvider = availableModels.reduce(
    (acc, model) => {
      const [provider] = model.split("/");
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, SupportedModel[]>
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              CSS Battle Eval
            </h1>
            <span className="text-sm text-neutral-500">
              {challenge.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToRandomChallenge}
              className="text-neutral-500 hover:text-neutral-900"
            >
              <IconRefresh className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={compareAllModels}
              disabled={isLoading || selectedModels.filter(m => outputs[m] && !errors[m]).length === 0}
              size="sm"
              variant="outline"
            >
              <IconScale className="size-4 mr-1.5" />
              Evaluate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || selectedModels.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <IconPlayerPlay className="size-4 mr-1.5" />
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, 400px)", justifyContent: "center" }}>
          {children}

          {selectedModels.map((modelId) => (
            <Card
              key={modelId}
              className="bg-white border-neutral-200 group w-[400px]"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
                  {modelId.split("/")[1]}
                  {scores[modelId] && (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        scores[modelId].score >= 99
                          ? "bg-green-100 text-green-700"
                          : scores[modelId].score >= 90
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {scores[modelId].score.toFixed(1)}%
                    </span>
                  )}
                </CardTitle>
                <CardAction className="flex items-center gap-1">
                  {outputs[modelId] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCode(modelId)}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      {showCode[modelId] ? (
                        <IconEye className="size-3.5" />
                      ) : (
                        <IconCode className="size-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeModel(modelId)}
                    className="h-6 w-6 p-0 text-neutral-400 hover:text-red-500"
                  >
                    <IconX className="size-3.5" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-[400px] h-[300px] bg-neutral-100 overflow-hidden">
                  {errors[modelId] ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <p className="text-red-500 text-xs text-center">
                        {errors[modelId]}
                      </p>
                    </div>
                  ) : showCode[modelId] ? (
                    <pre className="p-3 text-[10px] leading-relaxed overflow-auto h-full text-neutral-700 font-mono bg-neutral-50">
                      {outputs[modelId]}
                    </pre>
                  ) : outputs[modelId] ? (
                    <IframePreview
                      ref={(el) => { iframeRefs.current[modelId] = el; }}
                      htmlContent={outputs[modelId]}
                      className="w-full h-full bg-white"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-400 text-xs">
                        Click Generate to start
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Ghost Card for adding new models */}
          <Card className="bg-white/50 border-neutral-200 border-dashed w-[400px] hover:bg-white/80 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-400">
                Add Model
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-[400px] h-[300px] flex items-center justify-center">
                <div className="text-center space-y-3">
                  {mounted ? (
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger className="h-24 w-24 rounded-full border-2 border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100 inline-flex items-center justify-center transition-colors">
                        <IconPlus className="size-8 text-neutral-400" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="center">
                        <Command>
                          <CommandInput placeholder="Search models..." />
                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No model found.</CommandEmpty>
                            {Object.entries(modelsByProvider).map(([provider, models]) => (
                              <CommandGroup key={provider} heading={provider}>
                                {models.map((model) => (
                                  <CommandItem
                                    key={model}
                                    value={model}
                                    onSelect={() => {
                                      addModel(model);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    {model.split("/")[1]}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="h-24 w-24 rounded-full border-2 border-dashed border-neutral-300 inline-flex items-center justify-center">
                      <IconPlus className="size-8 text-neutral-400" />
                    </div>
                  )}
                  <p className="text-sm text-neutral-500">Add a model to compare</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

