'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import PromptForm from '@/components/image-generation/prompt-form';
import RefinedPromptsDisplay from '@/components/image-generation/refined-prompts-display';
import ImageGallery from '@/components/image-generation/image-gallery';
import { handleGenerateImage, handleRefinePrompt, type GeneratedImage } from './actions';
import type { RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

export default function ImaginariumPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [refinedData, setRefinedData] = useState<RefinePromptOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const { toast } = useToast();

  // Load images from local storage on mount
  useEffect(() => {
    const storedImages = localStorage.getItem('generatedImages');
    if (storedImages) {
      try {
        const parsedImages = JSON.parse(storedImages);
        if (Array.isArray(parsedImages)) {
           setGeneratedImages(parsedImages);
        }
      } catch (error) {
        console.error("Error parsing images from local storage:", error);
        localStorage.removeItem('generatedImages'); // Clear corrupted data
      }
    }
  }, []);

  // Save images to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('generatedImages', JSON.stringify(generatedImages));
  }, [generatedImages]);


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt empty", description: "Please enter a prompt to generate an image.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setRefinedData(null); // Clear previous refinements
    toast({ title: "Generating Image...", description: "Hold tight, your masterpiece is on its way!" });
    try {
      const newImage = await handleGenerateImage(prompt);
      setGeneratedImages((prevImages) => [newImage, ...prevImages]);
      toast({ title: "Image Generated!", description: "Your new image has been added to the gallery." });
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Generation Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt empty", description: "Please enter a prompt to refine.", variant: "destructive" });
      return;
    }
    setIsRefining(true);
    setRefinedData(null); // Clear previous refinements first
    toast({ title: "Refining Prompt...", description: "AI is working its magic on your prompt." });
    try {
      const refinementResult = await handleRefinePrompt(prompt);
      setRefinedData(refinementResult);
      if (refinementResult.refinedPrompt || refinementResult.suggestedPrompts.length > 0) {
        toast({ title: "Prompt Refined!", description: "Suggestions are ready for you." });
      } else {
        toast({ title: "No Refinements", description: "Could not find specific refinements for this prompt." });
      }
    } catch (error) {
      console.error("Error refining prompt:", error);
      toast({ title: "Refinement Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsRefining(false);
    }
  };

  const selectRefinedPrompt = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setRefinedData(null); // Clear suggestions once one is selected
    toast({ title: "Prompt Updated", description: "The selected suggestion is now in the prompt box." });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <PromptForm
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          onRefine={handleRefine}
          isGenerating={isGenerating}
          isRefining={isRefining}
        />
        
        <RefinedPromptsDisplay
          refinedData={refinedData}
          onSelectPrompt={selectRefinedPrompt}
          isLoading={isRefining}
        />

        {generatedImages.length > 0 && (
          <>
            <Separator className="my-8" />
            <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Your Creations</h2>
          </>
        )}
      </main>
      {/* Gallery outside the max-w-4xl container for wider display if needed */}
      <div className="w-full"> 
         <ImageGallery images={generatedImages} />
      </div>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Imaginarium. All rights reserved.</p>
      </footer>
    </div>
  );
}
