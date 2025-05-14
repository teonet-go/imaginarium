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
  originalPromptForRefinement?: string; // The original prompt of the image being refined
}

const PromptForm: FC<PromptFormProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  onRefine,
  isGenerating,
  isRefining,
  isRefinementMode,
  originalPromptForRefinement,
}) => {
  const handleSubmitGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() || (isRefinementMode && originalPromptForRefinement)) { // Allow update if original prompt exists
      onGenerate();
    }
  };

  const handleSubmitRefinePromptText = (e: React.FormEvent) => {
    e.preventDefault();
    // Refine prompt text always uses the current content of the textarea
    const textToRefine = prompt.trim() || (isRefinementMode ? originalPromptForRefinement : '');
    if (textToRefine) {
      if (!prompt.trim() && isRefinementMode && originalPromptForRefinement) {
        onPromptChange(originalPromptForRefinement); // Load original prompt if textarea is empty in refine mode
        // Then call onRefine in a timeout to allow state to update
        setTimeout(() => onRefine(), 0);
      } else {
        onRefine();
      }
    }
  };
  
  const canSubmitGeneration = prompt.trim().length > 0 || (isRefinementMode && !!originalPromptForRefinement);
  const canSubmitRefinement = prompt.trim().length > 0 || (isRefinementMode && !!originalPromptForRefinement);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          {isRefinementMode ? "Refine Existing Image" : "Create Your Image"}
        </CardTitle>
        {isRefinementMode && originalPromptForRefinement && (
          <CardDescription>
            Original prompt: &quot;{originalPromptForRefinement}&quot;. <br/>
            Enter your refinement instructions below (e.g., &quot;make it blue&quot;, &quot;add a cat&quot;).
            Click &quot;Refine Prompt&quot; to get suggestions for a new image based on current text.
          </CardDescription>
        )}
         {!isRefinementMode && (
            <CardDescription>
                Enter a prompt to generate a new image, or get AI suggestions to improve your prompt.
            </CardDescription>
         )}
      </CardHeader>
      <form>
        <CardContent>
          <Textarea
            placeholder={
              isRefinementMode 
              ? "Describe the changes for the selected image (e.g., 'add sunglasses', 'change background to a beach')"
              : "Enter your image prompt, e.g., 'A futuristic cityscape at sunset'"
            }
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={4}
            className="resize-none focus:ring-primary focus:border-primary"
            aria-label={isRefinementMode ? "Image refinement instructions" : "Image generation prompt"}
          />
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-3">
          <Button
            type="button"
            onClick={handleSubmitRefinePromptText}
            variant="outline"
            disabled={isRefining || isGenerating || !canSubmitRefinement}
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
            disabled={isGenerating || isRefining || !canSubmitGeneration}
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
