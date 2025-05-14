// src/app/view-image/[imageId]/view-image-client.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { GeneratedImage } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';

const MAX_IMAGE_DISPLAY_WIDTH = 1024;
const MAX_IMAGE_DISPLAY_HEIGHT = 768;

export default function ViewImageClient({ params }: { params: { imageId: string } }) {
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageStyle, setImageStyle] = useState<React.CSSProperties>({
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 200px)', // Adjusted for header/footer/padding
    objectFit: 'contain',
    cursor: 'zoom-in',
    transition: 'transform 0.2s ease-out',
  });
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);


  const { toast } = useToast();
  const { imageId } = params;

  useEffect(() => {
    if (imageId) {
      const decodedImageId = decodeURIComponent(imageId);
      const storedImagesRaw = localStorage.getItem('generatedImages');
      if (storedImagesRaw) {
        try {
          const storedImages: GeneratedImage[] = JSON.parse(storedImagesRaw);
          const foundImage = storedImages.find(img => img.id === decodedImageId);
          if (foundImage) {
            setImage(foundImage);
          } else {
            toast({
              title: 'Image Not Found',
              description: `Image with ID "${decodedImageId}" not found in local storage.`,
              variant: 'destructive',
            });
          }
        } catch (e) {
          console.error("Error parsing stored images:", e);
          toast({
            title: 'Error Loading Image',
            description: 'Could not load image data from local storage.',
            variant: 'destructive',
          });
        }
      } else {
         toast({
            title: 'No Images Stored',
            description: 'There are no images in your local gallery to display.',
            variant: 'destructive',
          });
      }
    } else {
      toast({
        title: 'No Image ID Provided',
        description: 'The URL does not specify an image to view.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [imageId, toast]);

  const handleDownload = async () => {
    if (!image || !image.url) {
      toast({ title: 'Error', description: 'Image data is not available for download.', variant: 'destructive' });
      return;
    }
    if (!image.name || image.name.trim() === '') {
        toast({ title: 'Filename Missing', description: 'Please set a name for the image on the main page to download.', variant: "destructive" });
        return;
    }

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      let extension = '.png'; // Default extension
      const mimeTypeMatch = image.url.match(/^data:(image\/[a-z+.-]+);base64,/);
      if (mimeTypeMatch && mimeTypeMatch[1]) {
        const mimeType = mimeTypeMatch[1];
        switch (mimeType) {
            case 'image/png': extension = '.png'; break;
            case 'image/jpeg': extension = '.jpeg'; break;
            case 'image/jpg': extension = '.jpg'; break;
            case 'image/gif': extension = '.gif'; break;
            case 'image/webp': extension = '.webp'; break;
        }
      } else { // Fallback for non-data URLs, try to get from URL
        const urlParts = image.url.split('.');
        if (urlParts.length > 1) {
            const ext = urlParts.pop()?.toLowerCase();
            if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
                extension = '.' + ext;
            }
        }
      }
      
      link.href = objectUrl;
      link.download = `${image.name.trim()}${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast({ title: 'Download Started', description: `Downloading ${image.name.trim()}${extension}` });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({ title: 'Download Failed', description: 'Could not download the image.', variant: 'destructive' });
    }
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
    setImageStyle(prev => ({
      ...prev,
      cursor: !isZoomed ? 'zoom-out' : 'zoom-in',
      transform: !isZoomed ? `scale(1.5) rotate(${rotation}deg)` : `scale(1) rotate(${rotation}deg)`,
      objectFit: !isZoomed ? 'cover' : 'contain', 
    }));
    setScale(!isZoomed ? 1.5 : 1);
  };
  
  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, 3); // Max zoom 3x
    setScale(newScale);
    setImageStyle(prev => ({ ...prev, transform: `scale(${newScale}) rotate(${rotation}deg)`}));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.2, 0.5); // Min zoom 0.5x
    setScale(newScale);
    setImageStyle(prev => ({ ...prev, transform: `scale(${newScale}) rotate(${rotation}deg)`}));
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    setImageStyle(prev => ({ ...prev, transform: `scale(${scale}) rotate(${newRotation}deg)`}));
  };

  const handleActualSize = () => {
    setIsZoomed(false); 
    setScale(1);
    setRotation(0);
    setImageStyle(prev => ({
        ...prev,
        maxWidth: 'none', 
        maxHeight: 'none',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain', 
        cursor: 'zoom-in',
        transform: 'scale(1) rotate(0deg)',
    }));
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Loading image...</p>
        </main>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button variant="outline" asChild>
                    <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Gallery
                    </Link>
                </Button>
            </div>
            <div className="text-center py-10">
                <p className="text-2xl font-semibold text-destructive">Image Not Found</p>
                <p className="text-muted-foreground mt-2">The requested image (ID: {decodeURIComponent(imageId)}) could not be displayed.</p>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex justify-between items-center">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Gallery
              </Link>
            </Button>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRotate} title="Rotate 90°">
                <RotateCcw className="h-5 w-5" />
              </Button>
                <Button variant="outline" size="icon" onClick={handleActualSize} title="Actual Size / Fit to Screen">
                 {isZoomed || scale !== 1 || rotation !== 0 ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" /> }
              </Button>
              <Button variant="outline" onClick={handleDownload} disabled={!image.name || image.name.trim() === ''}>
                <Download className="mr-2 h-4 w-4" />
                Download
                {!image.name && <span className="ml-1 text-xs text-destructive-foreground/70">(Needs Name)</span>}
              </Button>
            </div>
          </div>

          <div 
            className="relative w-full bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ minHeight: 'calc(100vh - 300px)', maxHeight: 'calc(100vh - 200px)' }} 
            onClick={!isZoomed && scale === 1 && rotation === 0 ? toggleZoom : undefined}
          >
            {image.url && (
              <Image
                src={image.url}
                alt={image.alt || `Image for prompt: ${image.prompt}`}
                width={MAX_IMAGE_DISPLAY_WIDTH} 
                height={MAX_IMAGE_DISPLAY_HEIGHT}
                style={imageStyle}
                className="transition-transform duration-200 ease-out"
                priority 
                unoptimized={image.url.startsWith('data:')} 
                onError={(e) => {
                    e.currentTarget.src = `https://placehold.co/600x400.png?text=Error+Loading`;
                    e.currentTarget.srcset = "";
                    toast({ title: "Error loading image", description: "The image source seems to be invalid.", variant: "destructive" });
                }}
              />
            )}
          </div>
          <div className="mt-4 p-4 bg-card rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-1 text-card-foreground">{image.name || 'Untitled Image'}</h2>
            <p className="text-sm text-muted-foreground">
              <strong>Original Prompt:</strong> {image.prompt}
            </p>
             {image.aiHint && <p className="text-xs text-muted-foreground/70 mt-1">AI Hint: {image.aiHint}</p>}
          </div>
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Imaginarium. Image Viewer.</p>
      </footer>
    </div>
  );
}
