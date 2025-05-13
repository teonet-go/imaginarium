// src/components/image-generation/image-card.tsx
'use client';

import type { FC } from 'react';
import Image from 'next/image';
import { Download, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeneratedImage } from '@/app/actions';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
  onStartRefine: (image: GeneratedImage) => void;
}

const ImageCard: FC<ImageCardProps> = ({ image, onDelete, onStartRefine }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${image.prompt.substring(0, 20).replace(/\s/g, '_') || 'imaginarium_image'}.jpg`; // Ensure JPG extension for broader compatibility
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      window.open(image.url, '_blank');
    }
  };

  const handleDelete = () => {
    onDelete(image.id);
  };

  const handleStartRefine = () => {
    if (image.url.startsWith('data:')) {
      onStartRefine(image);
    }
  };

  const canRefine = image.url.startsWith('data:');

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <CardHeader>
        <CardTitle className="text-sm font-medium truncate" title={image.prompt}>
          Prompt: {image.prompt.length > 50 ? `${image.prompt.substring(0, 47)}...` : image.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-square relative">
        <Image
          src={image.url}
          alt={image.alt}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 group-hover:scale-105"
          data-ai-hint={image.aiHint || 'abstract art'}
        />
      </CardContent>
      <CardFooter className="p-2 sm:p-4 mt-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Button onClick={handleDownload} variant="outline" size="sm" className="flex-1 w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              {/* The TooltipTrigger needs a direct child that can accept a ref. Button works. 
                  If canRefine is false, the button is disabled, so the TooltipTrigger wraps a span for correct behavior. */}
              <span tabIndex={canRefine ? -1 : 0} className="flex-1 w-full sm:w-auto">
                 <Button 
                    onClick={handleStartRefine} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 w-full"
                    disabled={!canRefine}
                    aria-label={canRefine ? "Refine this image" : "Cannot refine placeholder/error images"}
                  >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Refine
                </Button>
              </span>
            </TooltipTrigger>
            {!canRefine && (
              <TooltipContent>
                <p>Only successfully generated images can be refined. Placeholder or error images cannot be refined.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <Button onClick={handleDelete} variant="destructive" size="sm" className="flex-1 w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ImageCard;
