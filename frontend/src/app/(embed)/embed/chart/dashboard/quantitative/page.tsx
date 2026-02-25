import EmbeddedQuantitativeLineChart from "@/components/dashboard/Embed";

interface EmbedPageProps {
  params: { category: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function Embed({ params, searchParams }: EmbedPageProps) {
  const s = await searchParams;

  const predictionIds = typeof s.preds === "string"
    ? s.preds.split(",").map(Number).filter(n => !isNaN(n))
    : [];

  return (
    <div className="w-full h-screen p-2 bg-white">
      <EmbeddedQuantitativeLineChart
        baseUrl={process.env.NEXT_PUBLIC_API_URL || ""}
        disease={s.disease as string}
        admLevel={Number(s.admLevel || 0)}
        adm0={s.adm0 as string}
        adm1={s.adm1 as string}
        adm2={s.adm2 as string}
        start={s.start as string}
        end={s.end as string}
        caseDefinition={(s.caseDefinition as "reported" | "probable") || "reported"}
        predictionIds={predictionIds}
        sprint={s.sprint === "true"}
      />
    </div>
  );
}
