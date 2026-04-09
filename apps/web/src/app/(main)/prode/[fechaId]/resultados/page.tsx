export default function ResultadosPage({
  params,
}: {
  params: Promise<{ fechaId: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Resultados</h1>
      {/* TODO: Results list with points breakdown */}
    </div>
  );
}
