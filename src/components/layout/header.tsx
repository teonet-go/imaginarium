import { Sparkles } from 'lucide-react';
import type { FC } from 'react';

const Header: FC = () => {
  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex items-center">
        <Sparkles className="h-10 w-10 text-primary mr-3" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Imaginarium
        </h1>
      </div>
    </header>
  );
};

export default Header;
