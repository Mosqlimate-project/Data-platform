interface PageProps {
  searchParams: Promise<{
    category?: string;
    disease?: string;
    date?: string;
  }>;
}

export default async function DashboardMunicipal({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="h-full flex flex-col space-y-4">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Municipal Analysis</h1>
        </div>
      </header>
    </div>
  );
}
