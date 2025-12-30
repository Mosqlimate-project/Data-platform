interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

export default async function ReadmePage({ params }: PageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 border p-8 rounded">
        <h1>Readme Content</h1>
      </div>
      <aside className="lg:col-span-2">Sidebar</aside>
    </div>
  );
}
