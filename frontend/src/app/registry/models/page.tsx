"use client";

import Thumbnail from "./components/Model";

export default function RegistryModels() {
  const models = [
    {
      repo: "Mosqlimate-project/Data-Platform",
      type: "Nowcast",
      predictions: 4,
      lastUpdate: new Date("2025-10-27T12:00:00Z"),
    },
    {
      repo: "InfoDengue/AlertaDengue",
      type: "Forecast",
      predictions: 10,
      lastUpdate: new Date("2025-10-26T08:30:00Z"),
    },
  ];

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <h1 className="text-2xl font-bold mb-6">Models</h1>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {models.map((model) => (
              <Thumbnail
                key={model.repo}
                repo={model.repo}
                type={model.type}
                predictions={model.predictions}
                lastUpdate={model.lastUpdate}
                onClick={() => console.log(`Clicked ${model.repo}`)}
              />
            ))}
          </div>
        </div>

        <div className="w-72 border-l pl-6">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
        </div>
      </div>
    </div>
  );

}
