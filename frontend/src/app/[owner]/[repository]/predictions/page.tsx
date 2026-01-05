interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

export default async function PredictionsPage({ params }: PageProps) {
  return (
    <div className="w-full border border-border p-8 rounded">
      <h1>Predictions List</h1>
    </div>
  );
}
