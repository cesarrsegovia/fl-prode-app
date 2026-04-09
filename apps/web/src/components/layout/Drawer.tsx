'use client';

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative ml-auto h-full w-80 p-6"
        style={{ background: 'var(--surface)' }}
      >
        <h2 className="text-xl font-bold mb-4">Notificaciones</h2>
        {/* TODO: Notification list */}
      </div>
    </div>
  );
}
