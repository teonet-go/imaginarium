
// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import PromptForm from '@/components/image-generation/prompt-form';
import RefinedPromptsDisplay from '@/components/image-generation/refined-prompts-display';
import ImageGallery from '@/components/image-generation/image-gallery';
import { 
  handleGenerateImage, 
  handleRefinePrompt, 
  handleRefineExistingImage,
  type GeneratedImage 
} from './actions';
import type { RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import LoadingSpinner from '@/components/layout/loading-spinner'; // Import LoadingSpinner

const MAX_STORED_IMAGES = 10; 

export default function ImaginariumPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [refinedData, setRefinedData] = useState<RefinePromptOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false); 
  const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false);
  const [imageBeingRefined, setImageBeingRefined] = useState<GeneratedImage | null>(null);
  
  const { toast } = useToast();
  const promptFormRef = useRef<HTMLDivElement>(null);

  const { user, loading: authLoading } = useAuth(); // Get user and loading state
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login'); // Redirect to login if not authenticated
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) { // Only load/save images if user is logged in
      const storedImages = localStorage.getItem(`generatedImages_${user.uid}`);
      if (storedImages) {
        try {
          const parsedImages: Partial<GeneratedImage>[] = JSON.parse(storedImages);
          if (Array.isArray(parsedImages)) {
             const validatedImages = parsedImages.map(img => {
               const id = (img.id && img.id !== "undefined") ? img.id : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
               const currentPrompt = img.prompt || 'Untitled Prompt';
               const name = (typeof img.name === 'string') ? img.name : '';
               return {
                 id,
                 url: img.url || `https://placehold.co/512x512.png?text=Invalid+Image&seed=${encodeURIComponent(id)}`,
                 prompt: currentPrompt,
                 alt: img.alt || `Image for prompt: ${currentPrompt}`,
                 name: name,
                 aiHint: img.aiHint
               };
             }) as GeneratedImage[];
             setGeneratedImages(validatedImages);
          }
        } catch (error) {
          console.error("Error parsing images from local storage:", error);
          localStorage.removeItem(`generatedImages_${user.uid}`); 
        }
      }
    }
  }, [user]); // Depend on user to load images specific to them

  useEffect(() => {
    if (user && (generatedImages.length > 0 || localStorage.getItem(`generatedImagesInitialLoadAttempted_${user.uid}`))) { 
      const imagesToPersist = generatedImages.slice(0, MAX_STORED_IMAGES);
      try {
        localStorage.setItem(`generatedImages_${user.uid}`, JSON.stringify(imagesToPersist));
        if (!localStorage.getItem(`generatedImagesInitialLoadAttempted_${user.uid}`)) {
           localStorage.setItem(`generatedImagesInitialLoadAttempted_${user.uid}`, 'true');
        }
      } catch (error) {
        console.error("Error saving images to local storage:", error);
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22 || (error.message && error.message.toLowerCase().includes('quota')))) {
          toast({
            title: "Local Storage Full",
            description: "Could not save all recent images. Trying to save just the latest.",
            variant: "destructive",
          });
          try {
            if (imagesToPersist.length > 0) {
              localStorage.setItem(`generatedImages_${user.uid}`, JSON.stringify([imagesToPersist[0]]));
            } else {
              localStorage.removeItem(`generatedImages_${user.uid}`);
            }
          } catch (fallbackError) {
            console.error("Failed to save even the single latest image after quota error:", fallbackError);
            toast({
              title: "Storage Critically Full",
              description: "Unable to save any images. Please clear some space.",
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
    }
  }, [generatedImages, toast, user]);

  const handlePromptInputChange = (newPrompt: string) => {
    setPrompt(newPrompt);
  };

  const handleGenerateOrUpdateImage = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt empty", description: "Please enter a prompt.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setRefinedData(null); 

    if (imageBeingRefined) { 
      toast({ title: "Updating Image...", description: "Applying your refinements, please wait." });
      try {
        const updatedImage = await handleRefineExistingImage(imageBeingRefined, prompt);
        setGeneratedImages((prevImages) => {
            const newImages = prevImages.map(img => img.id === imageBeingRefined.id ? updatedImage : img);
            if (!prevImages.find(img => img.id === imageBeingRefined.id)) {
                 return [updatedImage, ...prevImages];
            }
            return newImages;
        });
        toast({ title: "Image Updated!", description: "Your refined image has been updated in the gallery." });
        setImageBeingRefined(null); 
        setPrompt(''); 
      } catch (error) {
        console.error("Error updating image:", error);
        toast({ title: "Update Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } else { 
      toast({ title: "Generating Image...", description: "Hold tight, your masterpiece is on its way!" });
      try {
        const newImage = await handleGenerateImage(prompt);
        setGeneratedImages((prevImages) => [newImage, ...prevImages]);
        toast({ title: "Image Generated!", description: "Your new image has been added to the gallery." });
        setPrompt(''); 
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
      setImageBeingRefined(null); 
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
  };

  const handleDeleteImage = (id: string) => {
    setGeneratedImages((prevImages) => prevImages.filter((img) => img.id !== id));
    if (imageBeingRefined && imageBeingRefined.id === id) {
      setImageBeingRefined(null); 
      setPrompt(''); 
      toast({ title: "Image Deleted", description: "The image has been removed and refinement mode exited." });
    } else {
      toast({ title: "Image Deleted", description: "The image has been removed from your gallery." });
    }
  };

  const handleStartImageRefinement = (imageToRefine: GeneratedImage) => {
    setPrompt(''); 
    setImageBeingRefined(imageToRefine);
    setRefinedData(null); 
    toast({ title: "Refining Image", description: `Enter changes for "${imageToRefine.name || 'this image'}" and click 'Update Image'.` });
    promptFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateImageName = (id: string, newName: string) => {
    setGeneratedImages(prevImages =>
      prevImages.map(img =>
        img.id === id ? { ...img, name: newName } : img
      )
    );
  };

  if (authLoading || !user) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow flex flex-col">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div ref={promptFormRef}>
            <PromptForm
                prompt={prompt}
                onPromptChange={handlePromptInputChange}
                onGenerate={handleGenerateOrUpdateImage}
                onRefine={handleRefinePromptText}
                isGenerating={isGenerating}
                isRefining={isRefiningPrompt}
                isRefinementMode={!!imageBeingRefined}
                originalPromptForRefinement={imageBeingRefined?.prompt}
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
        </div>
        <div className="w-full flex-grow"> 
            <ImageGallery 
                images={generatedImages} 
                onDeleteImage={handleDeleteImage}
                onStartRefineImage={handleStartImageRefinement} 
                onUpdateImageName={handleUpdateImageName}
            />
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Imaginarium. All rights reserved. User: {user?.email || user?.displayName}</p>
      </footer>
    </div>
  );
}
