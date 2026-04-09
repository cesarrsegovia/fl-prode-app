export default function PerfilPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Perfil</h1>
      {/* TODO: User stats, achievements, performance chart (Recharts) */}
    </div>
  );
}
