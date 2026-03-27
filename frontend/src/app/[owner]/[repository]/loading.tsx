export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-pulse">
      <div className="lg:col-span-3 border p-8 rounded bg-card min-h-[500px]">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
        </div>
      </div>

      <aside className="lg:col-span-2 space-y-6">
        <div className="h-64 border rounded bg-card p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
        </div>
      </aside>
    </div>
  );
}
