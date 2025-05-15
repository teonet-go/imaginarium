
// src/components/layout/loading-spinner.tsx
import { Loader2 } from 'lucide-react';
import type { FC } from 'react';

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ text = "Loading...", fullScreen = true }) => {
  if (fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background fixed inset-0 z-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{text}</p>
      </div>
    );
  }
  return (
     <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
      <p className="text-md text-muted-foreground">{text}</p>
    </div>
  )
};

export default LoadingSpinner;
