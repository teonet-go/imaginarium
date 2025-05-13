// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/header';
import PromptForm from '@/components/image-generation/prompt-form';
import RefinedPromptsDisplay from '@/components/image-generation/refined-prompts-display';
import ImageGallery from '@/components/image-generation/image-gallery';
import { 
  handleGenerateImage, 
  handleRefinePrompt, 
  handleRefineExistingImage, // Import new action
  type GeneratedImage 
} from './actions';
import type { RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

const MAX_STORED_IMAGES = 10; 

export default function ImaginariumPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [refinedData, setRefinedData] = useState<RefinePromptOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // Covers both new and refined image generation
  const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false); // Specifically for text prompt refinement
  const [imageBeingRefined, setImageBeingRefined] = useState<GeneratedImage | null>(null);
  
  const { toast } = useToast();
  const promptFormRef = useRef<HTMLDivElement>(null);


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
        localStorage.removeItem('generatedImages'); 
      }
    }
  }, []);

  useEffect(() => {
    const imagesToPersist = Array.isArray(generatedImages)
      ? generatedImages.slice(0, MAX_STORED_IMAGES)
      : [];
  
    try {
      localStorage.setItem('generatedImages', JSON.stringify(imagesToPersist));
    } catch (error) {
      console.error("Error saving images to local storage:", error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22 || (error.message && error.message.toLowerCase().includes('quota')))) {
        toast({
          title: "Local Storage Full",
          description: "Could not save all recent images as local storage is full. Trying to save just the latest.",
          variant: "destructive",
        });
        try {
          if (imagesToPersist.length > 0) {
            localStorage.setItem('generatedImages', JSON.stringify([imagesToPersist[0]]));
          } else {
            localStorage.removeItem('generatedImages');
          }
        } catch (fallbackError) {
          console.error("Failed to save even the single latest image after quota error:", fallbackError);
          toast({
            title: "Storage Critically Full",
            description: "Unable to save any images. Your browser's local storage is critically full. Please clear some space.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Storage Error",
          description: "An unexpected error occurred while saving images.",
          variant: "destructive",
        });
      }
    }
  }, [generatedImages, toast]);

  const handlePromptInputChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    // If prompt is cleared while in image refinement mode, it doesn't auto-exit.
    // Exiting refinement mode is handled by clicking "Refine Prompt" button.
  };

  const handleGenerateOrUpdateImage = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt empty", description: "Please enter a prompt.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setRefinedData(null); 

    if (imageBeingRefined) { // Refining an existing image
      toast({ title: "Updating Image...", description: "Applying your refinements, please wait." });
      try {
        if (!imageBeingRefined.url.startsWith('data:')) {
          toast({ title: "Refinement Error", description: "Cannot refine this image type (not a data URI).", variant: "destructive" });
          setIsGenerating(false);
          setImageBeingRefined(null); // Exit refinement mode
          return;
        }
        const updatedImage = await handleRefineExistingImage(imageBeingRefined.url, prompt);
        setGeneratedImages((prevImages) => [updatedImage, ...prevImages.filter(img => img.id !== imageBeingRefined.id)]); // Add new, remove old if IDs were same, or just add if new ID
        toast({ title: "Image Updated!", description: "Your refined image has been added to the gallery." });
        setImageBeingRefined(null); // Exit refinement mode
      } catch (error) {
        console.error("Error updating image:", error);
        toast({ title: "Update Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } else { // Generating a new image
      toast({ title: "Generating Image...", description: "Hold tight, your masterpiece is on its way!" });
      try {
        const newImage = await handleGenerateImage(prompt);
        setGeneratedImages((prevImages) => [newImage, ...prevImages]);
        toast({ title: "Image Generated!", description: "Your new image has been added to the gallery." });
      } catch (error) {
        console.error("Error generating image:", error);
        toast({ title: "Generation Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    }
    setIsGenerating(false);
  };

  const handleRefinePromptText = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt empty", description: "Please enter a prompt to refine.", variant: "destructive" });
      return;
    }
    setIsRefiningPrompt(true);
    setRefinedData(null);
    if (imageBeingRefined) {
      setImageBeingRefined(null); // Exit image refinement mode if user clicks "Refine Prompt"
      toast({ title: "Exited Image Refinement", description: "Now refining prompt text for a new image."});
    }
    toast({ title: "Refining Prompt Text...", description: "AI is working its magic on your prompt." });
    try {
      const refinementResult = await handleRefinePrompt(prompt);
      setRefinedData(refinementResult);
      if (refinementResult.refinedPrompt || refinementResult.suggestedPrompts.length > 0) {
        toast({ title: "Prompt Text Refined!", description: "Suggestions are ready for you." });
      } else {
        toast({ title: "No Text Refinements", description: "Could not find specific text refinements for this prompt." });
      }
    } catch (error) {
      console.error("Error refining prompt text:", error);
      toast({ title: "Prompt Text Refinement Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsRefiningPrompt(false);
    }
  };

  const selectRefinedPrompt = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
    setRefinedData(null); 
    toast({ title: "Prompt Updated", description: "The selected suggestion is now in the prompt box." });
    if (imageBeingRefined) {
      // If user was refining an image and selected a text prompt suggestion,
      // assume they still want to refine that image but with the new text.
      // So, imageBeingRefined remains set.
    }
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages((prevImages) => prevImages.filter((img) => img.id !== id));
    if (imageBeingRefined && imageBeingRefined.id === id) {
      setImageBeingRefined(null); // Stop refining if the image being refined is deleted
      setPrompt(''); // Clear prompt as well
      toast({ title: "Image Deleted", description: "The image has been removed and refinement mode exited." });
    } else {
      toast({ title: "Image Deleted", description: "The image has been removed from your gallery." });
    }
  };

  const handleStartImageRefinement = (imageToRefine: GeneratedImage) => {
    setPrompt(imageToRefine.prompt);
    setImageBeingRefined(imageToRefine);
    setRefinedData(null); // Clear any text prompt suggestions
    toast({ title: "Refining Image", description: "Original prompt loaded. Modify it and click 'Update Image'." });
    promptFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <div ref={promptFormRef}>
          <PromptForm
            prompt={prompt}
            onPromptChange={handlePromptInputChange}
            onGenerate={handleGenerateOrUpdateImage}
            onRefine={handleRefinePromptText}
            isGenerating={isGenerating}
            isRefining={isRefiningPrompt}
            isRefinementMode={!!imageBeingRefined}
          />
        </div>
        
        <RefinedPromptsDisplay
          refinedData={refinedData}
          onSelectPrompt={selectRefinedPrompt}
          isLoading={isRefiningPrompt}
        />

        {generatedImages.length > 0 && (
          <>
            <Separator className="my-8" />
            <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Your Creations</h2>
          </>
        )}
      </main>
      <div className="w-full"> 
         <ImageGallery 
            images={generatedImages} 
            onDeleteImage={handleDeleteImage}
            onStartRefineImage={handleStartImageRefinement} 
          />
      </div>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Imaginarium. All rights reserved.</p>
      </footer>
    </div>
  );
}
