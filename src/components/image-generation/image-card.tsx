// src/components/image-generation/image-card.tsx
'use client';

import { type FC, useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Trash2, Edit3, UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GeneratedImage } from '@/app/actions';
import { handleUploadImageToS3 } from '@/app/actions';
import { loadS3Config, type S3Config } from '@/lib/s3-config';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
// useRouter is no longer needed as we are removing navigation to view image page
// import { useRouter } from 'next/navigation';


interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
  onStartRefine: (image: GeneratedImage) => void;
  onUpdateName: (id: string, newName: string) => void;
}

function getExtensionFromDataUri(dataUri: string): string {
  if (!dataUri || !dataUri.startsWith('data:')) return '.png'; 
  const mimeTypeMatch = dataUri.match(/^data:(image\/[a-z+.-]+);base64,/);
  if (!mimeTypeMatch || !mimeTypeMatch[1]) return '.png'; 

  const mimeType = mimeTypeMatch[1];
  switch (mimeType) {
    case 'image/png': return '.png';
    case 'image/jpeg': return '.jpeg';
    case 'image/jpg': return '.jpg';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    default: return '.png'; 
  }
}

const ImageCard: FC<ImageCardProps> = ({ image, onDelete, onStartRefine, onUpdateName }) => {
  const [editableName, setEditableName] = useState(image.name || '');
  const [isUploadingToS3, setIsUploadingToS3] = useState(false);
  const { toast } = useToast();
  // const router = useRouter(); // Removed router

  useEffect(() => {
    setEditableName(image.name || '');
  }, [image.name]);

  const handleNameUpdate = () => {
    const finalName = editableName.trim();
    if (finalName !== image.name) {
      onUpdateName(image.id, finalName);
      if(finalName) { 
        toast({ title: "Image Renamed", description: `Image name set to: ${finalName}` });
      } else if (image.name && !finalName) { 
        toast({ title: "Image Name Cleared", description: "Image name has been cleared." });
      }
    }
    setEditableName(finalName); 
  };

  const handleDownload = async () => {
    const currentName = editableName.trim();
    if (!currentName) {
      toast({ title: "Filename Missing", description: "Please enter a filename to download.", variant: "destructive" });
      return;
    }

    if (!image.url) {
      console.error('Image URL is missing.');
      toast({ title: "Download Error", description: "Image URL is missing.", variant: "destructive" });
      return;
    }
    try {
      const baseFilename = currentName;
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
        const link = document.createElement('a');
        let extension = '.png'; 
        const lastDotIndex = image.url.lastIndexOf('.');
        const lastSlashIndex = image.url.lastIndexOf('/');
        if (lastDotIndex > -1 && lastDotIndex > lastSlashIndex) { 
            const possibleExt = image.url.substring(lastDotIndex).toLowerCase();
            const commonImageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
            if (commonImageExtensions.includes(possibleExt)) {
                extension = possibleExt;
            }
        }
        filenameWithExtension = baseFilename + extension;
        link.href = image.url;
        link.download = filenameWithExtension; 
        link.target = '_blank'; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast({ title: "Download Started", description: `Downloading ${filenameWithExtension}` });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({ title: "Download Failed", description: "Could not download image.", variant: "destructive" });
      if (image.url) {
        window.open(image.url, '_blank');
      }
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

  const handleS3Upload = async () => {
    const currentName = editableName.trim();
    if (!currentName) {
      toast({ title: "No filename provided", description: "Please enter a filename for the upload to S3.", variant: "destructive" });
      return;
    }

    const s3Config = loadS3Config();
    if (!s3Config || !s3Config.url || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) {
      toast({
        title: 'S3 Not Configured',
        description: (
          <p>
            Please <Link href="/settings" className="underline hover:text-primary">configure your S3 settings</Link> first.
          </p>
        ),
        variant: 'destructive',
      });
      return;
    }
    

    if (!image.url.startsWith('data:image')) {
      toast({
        title: 'Upload Error',
        description: 'Only generated images (data URIs) can be uploaded to S3.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploadingToS3(true);
    toast({ title: 'Uploading to S3...', description: `Sending "${currentName}" to your S3 bucket.` });

    try {
      const imageToUpload = { ...image, name: currentName };
      const result = await handleUploadImageToS3(imageToUpload, s3Config);
      if (result.success) {
        toast({
          title: 'S3 Upload Successful',
          description: result.message,
          action: result.url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={result.url} target="_blank" rel="noopener noreferrer">View on S3</a>
            </Button>
          ) : undefined,
        });
      } else {
        toast({
          title: 'S3 Upload Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error uploading to S3:', error);
      toast({
        title: 'S3 Upload Error',
        description: error.message || 'An unexpected error occurred during S3 upload.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingToS3(false);
    }
  };

  // handleViewImage function removed
  // const handleViewImage = () => {
  //   if (image.url && image.id) {
  //     router.push(`/view-image/${encodeURIComponent(image.id)}`);
  //   } else {
  //     toast({ title: "Cannot view image", description: "Image URL or ID is missing.", variant: "destructive"});
  //   }
  // };


  const canRefine = image.url.startsWith('data:');
  const canUploadToS3 = image.url.startsWith('data:image'); 
  const isValidImageUrl = image.url && (image.url.startsWith('data:') || image.url.startsWith('http') || image.url.startsWith('https'));


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
                e.preventDefault(); 
                handleNameUpdate(); 
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-9 text-sm mt-1"
            placeholder="Enter image name (required for download/S3)"
          />
        </div>
        <div className="text-xs font-medium text-muted-foreground mb-0.5">Prompt</div>
        <CardTitle className="text-sm font-medium leading-snug" title={image.prompt}>
          {image.prompt.length > 80 ? `${image.prompt.substring(0, 77)}...` : image.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 aspect-square relative mb-3" style={{margin: '15px'}}>
        {/* Removed the button wrapper and onClick for image preview */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={isValidImageUrl ? image.url : `https://placehold.co/512x512.png?text=Invalid+URL`}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-300 group-hover:scale-105 rounded-md" // Changed rounded-t-md to rounded-md
            data-ai-hint={image.aiHint || 'abstract art'}
            priority={false} 
            onError={(e) => {
              e.currentTarget.src = `https://placehold.co/512x512.png?text=Error+Loading`;
              e.currentTarget.srcset = "";
            }}
          />
          {/* Removed the Eye icon and hover effect for view */}
        </div>
      </CardContent>
      <CardFooter className="p-2 sm:p-3 mt-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm" className="w-full" disabled={!isValidImageUrl}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={isUploadingToS3 || !canUploadToS3 ? 0 : -1} className="w-full">
                <Button 
                  onClick={handleS3Upload} 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={isUploadingToS3 || !canUploadToS3}
                  aria-label={canUploadToS3 ? "Upload to S3" : "Cannot upload this image type to S3"}
                >
                  {isUploadingToS3 ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  S3
                </Button>
              </span>
            </TooltipTrigger>
            {(!canUploadToS3 && !isUploadingToS3) && (
              <TooltipContent>
                <p>Only AI-generated images (not placeholders/errors) can be uploaded to S3.</p>
              </TooltipContent>
            )}
             {isUploadingToS3 && (
              <TooltipContent>
                <p>Uploading to S3 in progress...</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={canRefine ? -1 : 0} className="w-full">
                 <Button 
                    onClick={handleStartRefine} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
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

        <Button onClick={handleDelete} variant="destructive" size="sm" className="w-full">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ImageCard;
