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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import React from "react";
import data from "@/data/challenges.json";
import type { ChallengesDictionary } from "@packages/cssbattle-scraper/src/types";
import { readStreamableValue } from "@ai-sdk/rsc";
import { generate } from "./actions";
import { SUPPORTED_MODELS, type SupportedModel } from "./types";
import {
  IconX,
  IconPlus,
  IconCode,
  IconEye,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";
import { IsolatedContent } from "@/components/isolated-content";

const challenges: ChallengesDictionary = data;
const challengeIds = Object.keys(challenges);

export default function Page() {
  const [selectedModels, setSelectedModels] = React.useState<SupportedModel[]>([
    "anthropic/claude-sonnet-4",
  ]);
  const [outputs, setOutputs] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showCode, setShowCode] = React.useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentChallengeId, setCurrentChallengeId] = React.useState<string>("");

  React.useEffect(() => {
    const randomId =
      challengeIds[Math.floor(Math.random() * challengeIds.length)];
    setCurrentChallengeId(randomId);
  }, []);

  if (!currentChallengeId) return null;

  const currentChallenge = challenges[currentChallengeId];
  const currentChallengeImage = `/challenges/${currentChallenge.imageFile}.png`;

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
  };

  const toggleCode = (model: string) => {
    setShowCode((prev) => ({ ...prev, [model]: !prev[model] }));
  };

  const randomizeChallenge = () => {
    const randomId =
      challengeIds[Math.floor(Math.random() * challengeIds.length)];
    setCurrentChallengeId(randomId);
    setOutputs({});
    setErrors({});
  };

  const handleSubmit = async () => {
    if (selectedModels.length === 0) return;

    setIsLoading(true);
    setOutputs({});
    setErrors({});

    const { streams } = await generate(currentChallengeId, selectedModels);

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
        const message = err instanceof Error ? err.message : "Unknown error";
        setErrors((prev) => ({ ...prev, [modelId]: message }));
      }
    };

    await Promise.allSettled(selectedModels.map(consumeStream));
    setIsLoading(false);
  };

  // Group models by provider for the dropdown
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
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">
              CSS Battle Eval
            </h1>
            <span className="text-sm text-neutral-500">
              {currentChallenge.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={randomizeChallenge}
              className="text-neutral-500 hover:text-neutral-900"
            >
              <IconRefresh className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center gap-1.5 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium rounded-none hover:bg-neutral-100 transition-colors"
              >
                <IconPlus className="size-4" />
                Add Model
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[400px] overflow-y-auto w-[280px]"
              >
                {Object.entries(modelsByProvider).map(([provider, models], index, arr) => (
                  <React.Fragment key={provider}>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="capitalize">
                        {provider}
                      </DropdownMenuLabel>
                      {models.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onClick={() => addModel(model)}
                        >
                          {model.split("/")[1]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    {index < arr.length - 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Target Card */}
          <Card className="bg-white border-neutral-200 border-2 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-neutral-500 text-xs uppercase tracking-wider">
                Target
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                <Image
                  src={currentChallengeImage}
                  fill
                  style={{ objectFit: "contain" }}
                  alt="challenge target"
                  priority
                />
              </div>
            </CardContent>
          </Card>

          {/* Model Cards */}
          {selectedModels.map((modelId) => (
            <Card
              key={modelId}
              className="bg-white border-neutral-200 group"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate">
                  {modelId.split("/")[1]}
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
                <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
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
                    <IsolatedContent
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

          {/* Empty State / Add Model Card */}
          {selectedModels.length === 0 && (
            <Card className="bg-white/50 border-neutral-200 border-dashed">
              <CardContent className="p-0">
                <div className="aspect-[4/3] flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-neutral-500 text-sm">No models selected</p>
                    <p className="text-neutral-400 text-xs">
                      Click &quot;Add Model&quot; to get started
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
