// src/components/image-generation/image-gallery.tsx
'use client';

import type { FC } from 'react';
import ImageCard from './image-card';
import type { GeneratedImage } from '@/app/actions';

interface ImageGalleryProps {
  images: GeneratedImage[];
  onDeleteImage: (id: string) => void;
  onStartRefineImage: (image: GeneratedImage) => void;
  onUpdateImageName: (id: string, newName: string) => void;
}

const ImageGallery: FC<ImageGalleryProps> = ({ images, onDeleteImage, onStartRefineImage, onUpdateImageName }) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>No images generated yet. Try creating one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4">
      {images.map((image) => (
        <ImageCard 
          key={image.id} 
          image={image} 
          onDelete={onDeleteImage} 
          onStartRefine={onStartRefineImage} 
          onUpdateName={onUpdateImageName}
        />
      ))}
    </div>
  );
};

export default ImageGallery;
