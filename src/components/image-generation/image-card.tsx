'use client';

import type { FC } from 'react';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { GeneratedImage } from '@/app/actions';

interface ImageCardProps {
  image: GeneratedImage;
}

const ImageCard: FC<ImageCardProps> = ({ image }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${image.prompt.substring(0, 20).replace(/\s/g, '_') || 'imaginarium_image'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback for browsers that might block cross-origin downloads this way
      window.open(image.url, '_blank');
    }
  };

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
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
      <CardFooter className="p-4 mt-auto">
        <Button onClick={handleDownload} variant="outline" size="sm" className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ImageCard;
