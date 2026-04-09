import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full py-12 bg-background flex flex-col items-center justify-center space-y-4 border-t border-outline-variant/5">
      <div className="flex gap-8">
        <Link 
          href="/terms" 
          className="text-muted-foreground hover:text-white font-label text-xs uppercase tracking-widest transition-colors"
        >
          Terms
        </Link>
        <Link 
          href="/privacy" 
          className="text-muted-foreground hover:text-white font-label text-xs uppercase tracking-widest transition-colors"
        >
          Privacy
        </Link>
        <Link 
          href="/support" 
          className="text-muted-foreground hover:text-white font-label text-xs uppercase tracking-widest transition-colors"
        >
          Support
        </Link>
      </div>
      <p className="text-muted-foreground font-label text-xs uppercase tracking-widest text-center px-4">
        © 2026 FL-Prode. The Emerald Precision is Yours.
      </p>
    </footer>
  );
}
