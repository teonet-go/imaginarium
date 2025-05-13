'use client';

import type { FC } from 'react';
import { Lightbulb, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RefinePromptOutput } from '@/ai/flows/refine-prompt';

interface RefinedPromptsDisplayProps {
  refinedData: RefinePromptOutput | null;
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const RefinedPromptsDisplay: FC<RefinedPromptsDisplayProps> = ({ refinedData, onSelectPrompt, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-primary" />
            Refining Prompt...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!refinedData || (!refinedData.refinedPrompt && refinedData.suggestedPrompts.length === 0)) {
    return null;
  }

  return (
    <Card className="mt-6 shadow-md bg-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center text-foreground">
          <Lightbulb className="mr-2 h-5 w-5 text-primary" />
          Prompt Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {refinedData.refinedPrompt && (
          <div>
            <h3 className="font-semibold text-foreground mb-1">Refined Prompt:</h3>
            <p className="text-sm text-muted-foreground p-3 bg-background rounded-md border border-border">
              {refinedData.refinedPrompt}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectPrompt(refinedData.refinedPrompt)}
              className="mt-2"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Use this prompt
            </Button>
          </div>
        )}
        {refinedData.suggestedPrompts.length > 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-2">Suggested Prompts:</h3>
            <ul className="space-y-2">
              {refinedData.suggestedPrompts.map((suggestion, index) => (
                <li key={index} className="flex items-center justify-between text-sm p-2 bg-background rounded-md border border-border group">
                  <span className="text-muted-foreground flex-grow mr-2">{suggestion}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectPrompt(suggestion)}
                    className="opacity-70 group-hover:opacity-100 transition-opacity"
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RefinedPromptsDisplay;
