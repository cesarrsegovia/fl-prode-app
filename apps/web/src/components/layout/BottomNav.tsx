'use client';

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-4 py-2 md:hidden"
      style={{ background: 'var(--surface)', borderColor: '#2a2a3a' }}
    >
      {/* TODO: Home, Prode, Groups, Ranking icons */}
    </nav>
  );
}
