import { notFound } from "next/navigation";

interface ModelPageProps {
  params: { id: string };
}

const models = {
  "my-model1": {
    name: "My Model 1",
    description: "This model predicts weather patterns using neural networks.",
  },
  "my-model2": {
    name: "My Model 2",
    description: "This model analyzes customer sentiment from reviews.",
  },
};

export default function ModelPage({ params }: ModelPageProps) {
  const model = models[params.id as keyof typeof models];

  if (!model) return notFound();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{model.name}</h1>
      <p className="text-lg text-gray-700">{model.description}</p>
    </div>
  );
}
