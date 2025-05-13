// src/components/image-generation/prompt-form.tsx
'use client';

import type { FC } from 'react';
import { ImageIcon, Wand2, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PromptFormProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => Promise<void>;
  onRefine: () => Promise<void>; // This is for refining the text prompt
  isGenerating: boolean;
  isRefining: boolean; // This is for text prompt refinement loading state
  isRefinementMode: boolean; // True if an existing image is being refined
}

const PromptForm: FC<PromptFormProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  onRefine,
  isGenerating,
  isRefining,
  isRefinementMode,
}) => {
  const handleSubmitGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate();
    }
  };

  const handleSubmitRefinePromptText = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onRefine();
    }
  };
  
  const canSubmit = prompt.trim().length > 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          {isRefinementMode ? "Refine Existing Image" : "Create Your Image"}
        </CardTitle>
        {isRefinementMode && (
          <CardDescription>
            You are currently refining an existing image. Modify the prompt below and click &quot;Update Image&quot;. 
            To generate a completely new image or get text prompt suggestions, click &quot;Refine Prompt&quot; first to exit this mode.
          </CardDescription>
        )}
      </CardHeader>
      <form>
        <CardContent>
          <Textarea
            placeholder={
              isRefinementMode 
              ? "Describe the changes you want for the selected image..."
              : "Enter your image prompt, e.g., 'A futuristic cityscape at sunset'"
            }
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={4}
            className="resize-none focus:ring-primary focus:border-primary"
            aria-label={isRefinementMode ? "Image refinement prompt" : "Image generation prompt"}
          />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-3">
          <Button
            type="button"
            onClick={handleSubmitRefinePromptText}
            variant="outline"
            disabled={isRefining || isGenerating || !canSubmit}
            className="w-full sm:w-auto"
          >
            {isRefining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Refine Prompt
          </Button>
          <Button
            type="submit"
            onClick={handleSubmitGenerate}
            disabled={isGenerating || isRefining || !canSubmit}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isRefinementMode ? (
              <RefreshCcw className="mr-2 h-4 w-4" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {isRefinementMode ? "Update Image" : "Generate Image"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PromptForm;
