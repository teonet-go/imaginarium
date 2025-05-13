// src/components/image-generation/image-card.tsx
'use client';

import { type FC, useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GeneratedImage } from '@/app/actions';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
  onStartRefine: (image: GeneratedImage) => void;
  onUpdateName: (id: string, newName: string) => void;
}

function getExtensionFromDataUri(dataUri: string): string {
  if (!dataUri || !dataUri.startsWith('data:')) return '.png'; // Fallback for non-data URIs or malformed
  const mimeTypeMatch = dataUri.match(/^data:(image\/[a-z+.-]+);base64,/);
  if (!mimeTypeMatch || !mimeTypeMatch[1]) return '.png'; // Fallback if MIME type can't be parsed

  const mimeType = mimeTypeMatch[1];
  switch (mimeType) {
    case 'image/png': return '.png';
    case 'image/jpeg': return '.jpeg';
    case 'image/jpg': return '.jpg';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    default: return '.png'; // Fallback for unknown image types
  }
}

function sanitizeFilenameForDefault(prompt: string, id: string): string {
  const baseName = prompt || `image_${id}`;
  return baseName.substring(0, 30).replace(/[^\w.-]/gi, '_').replace(/\s+/g, '_').toLowerCase() || 'untitled_image';
}


const ImageCard: FC<ImageCardProps> = ({ image, onDelete, onStartRefine, onUpdateName }) => {
  const [editableName, setEditableName] = useState(image.name || sanitizeFilenameForDefault(image.prompt, image.id));

  useEffect(() => {
    // Update local editableName if image.name prop changes from parent
    // This ensures consistency if the name is updated externally or on initial load
    const defaultName = sanitizeFilenameForDefault(image.prompt, image.id);
    setEditableName(image.name || defaultName);
  }, [image.name, image.prompt, image.id]);

  const handleNameUpdate = () => {
    const finalName = editableName.trim() || sanitizeFilenameForDefault(image.prompt, image.id);
    if (finalName !== image.name) {
      onUpdateName(image.id, finalName);
    }
    // Ensure local state reflects the potentially sanitized or defaulted name
    setEditableName(finalName); 
  };

  const handleDownload = async () => {
    if (!image.url) {
      console.error('Image URL is missing.');
      // Optionally, show a toast to the user
      return;
    }
    try {
      const baseFilename = (image.name && image.name.trim() !== '') ? image.name.trim() : 'imaginarium_image';
      let filenameWithExtension: string;

      if (image.url.startsWith('data:')) {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const extension = getExtensionFromDataUri(image.url);
        filenameWithExtension = baseFilename + extension;
        link.href = objectUrl;
        link.download = filenameWithExtension;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      } else {
        // For regular URLs, attempt to download
        const link = document.createElement('a');
        
        let extension = '.png'; // Default extension
        const lastDotIndex = image.url.lastIndexOf('.');
        const lastSlashIndex = image.url.lastIndexOf('/');
        if (lastDotIndex > -1 && lastDotIndex > lastSlashIndex) { // Ensure dot is part of filename not path
            const possibleExt = image.url.substring(lastDotIndex).toLowerCase();
            const commonImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
            if (commonImageExtensions.includes(possibleExt)) {
                extension = possibleExt;
            }
        }
        filenameWithExtension = baseFilename + extension;
        link.href = image.url;
        link.download = filenameWithExtension; 
        link.target = '_blank'; // Open in new tab as fallback if direct download fails
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback for any error: try to open in new tab
      if (image.url) {
        window.open(image.url, '_blank');
      }
    }
  };

  const handleDelete = () => {
    onDelete(image.id);
  };

  const handleStartRefine = () => {
    if (image.url.startsWith('data:')) { // Only allow refining data URIs (AI-generated)
      onStartRefine(image);
    }
  };

  const canRefine = image.url.startsWith('data:');

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <CardHeader className="p-4">
        <div className="mb-3">
          <Label htmlFor={`image-name-${image.id}`} className="text-xs font-medium text-muted-foreground">
            Name
          </Label>
          <Input
            id={`image-name-${image.id}`}
            type="text"
            value={editableName}
            onChange={(e) => setEditableName(e.target.value)}
            onBlur={handleNameUpdate}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission if any
                handleNameUpdate(); 
              }
            }}
            className="h-9 text-sm mt-1"
            placeholder="Enter image name"
          />
        </div>
        <div className="text-xs font-medium text-muted-foreground mb-0.5">Prompt</div>
        <CardTitle className="text-sm font-medium leading-snug" title={image.prompt}>
          {image.prompt.length > 80 ? `${image.prompt.substring(0, 77)}...` : image.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-square relative">
        <Image
          src={image.url}
          alt={image.alt}
          fill // Replaces layout="fill" objectFit="cover"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" // Example sizes, adjust as needed
          style={{ objectFit: 'cover' }} // Used with fill
          className="transition-transform duration-300 group-hover:scale-105"
          data-ai-hint={image.aiHint || 'abstract art'}
          priority={false} // Set to true for above-the-fold images
          onError={(e) => {
            // Fallback for broken image URLs
            e.currentTarget.src = `https://picsum.photos/seed/${encodeURIComponent(image.id)}/512/512?text=Image+Error`;
          }}
        />
      </CardContent>
      <CardFooter className="p-2 sm:p-3 mt-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <Button onClick={handleDownload} variant="outline" size="sm" className="flex-1 w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
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
                <p>Only AI-generated images can be refined. Placeholders or error images cannot be refined.</p>
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
