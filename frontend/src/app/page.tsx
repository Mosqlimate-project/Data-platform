"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import HomeChart from "@/components/HomeChart";
import { fetchPredictionMetadata, PredictionMetadata } from "@/lib/dashboard/api";

const NetworkBackground = dynamic(() => import("@/components/NetworkBackground"), {
  ssr: false,
});

const roleColorMap: Record<string, string> = {
  "coordination": "bg-emerald-500",
  "data_scientist": "bg-sky-400",
  "postdoc": "bg-amber-500",
  "undergrad": "bg-teal-500",
  "grad": "bg-teal-500",
  "associated": "bg-rose-400",
  "developer_data_scientist": "bg-indigo-400"
}

const team = [
  { id: "flavio", name: "Flávio Codeço Coelho", roleKey: "coordination", image: "/team/flavio.png" },
  { id: "leonardo", name: "Leonardo Bastos", roleKey: "coordination", image: "/team/leo.png" },
  { id: "luiz", name: "Luiz Max Carvalho", roleKey: "coordination", image: "/team/luiz.png" },
  { id: "leon", name: "Leon Alves", roleKey: "coordination", image: "/team/leon.png" },
  { id: "eduardo", name: "Eduardo Corrêa Araujo", roleKey: "coordination", image: "/team/eduardo.jpg" },
  { id: "iasmim", name: "Iasmim Ferreira de Almeida", roleKey: "coordination", image: "/team/Iasmim.jpg" },
  { id: "lua", name: "Luã Vacaro", roleKey: "developer_data_scientist", image: "/team/lua.png" },
  { id: "fabiana", name: "Fabiana Ganem", roleKey: "postdoc", image: "/team/Fabiana.png" },
  { id: "beatriz", name: "Beatriz Laiate", roleKey: "postdoc", image: "/team/Beatriz.webp" },
  { id: "marcio", name: "Marcio Maciel Bastos", roleKey: "postdoc", image: "/team/marcio.png" },
  { id: "davi", name: "Davi Sales Barreira", roleKey: "postdoc", image: "/team/Davi.webp" },
  { id: "julie", name: "Julie Souza", roleKey: "postdoc", image: "/team/Julie.webp" },
  { id: "joyce", name: "Joyce Figueiró Braga", roleKey: "grad", image: "/team/joyce.jpeg" },
  { id: "ezequiel", name: "Ezequiel Braga", roleKey: "grad", image: "/team/Ezequiel.png" },
  { id: "zuilho", name: "Zuilho Segundo", roleKey: "undergrad", image: "/team/Zuilho.webp" },
  { id: "sillas", name: "Sillas Rocha", roleKey: "undergrad", image: "/team/Sillas.jpg" },
  { id: "ana", name: "Ana Júlia Amaro", roleKey: "undergrad", image: "/team/ana.jpg" },
  { id: "raquel", name: "Raquel Martins Lana", roleKey: "associated", image: "/team/raquel.png" },
  { id: "thais", name: "Thais Riback", roleKey: "associated", image: "/team/thais.jpg" },
  { id: "lais", name: "Laís Picinini Freitas", roleKey: "associated", image: "/team/Lais.webp" },
  { id: "bruno", name: "Bruno Carvalho", roleKey: "associated", image: "/team/Bruno.webp" },
];

function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform will-change-transform ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
    >
      {children}
    </div>
  );
}

function ScrollIndicator({ label }: { label: string }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const windowHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          setIsVisible(scrollTop + windowHeight < docHeight - 20);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      onClick={() => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-section]"));
        const currentScroll = window.scrollY + 10;
        const nextSection = sections.find((section) => section.offsetTop > currentScroll);
        if (nextSection) nextSection.scrollIntoView({ behavior: "smooth" });
      }}
      className="fixed bottom-6 left-8 w-14 h-14 bg-accent text-white rounded-full flex flex-col items-center justify-center shadow-xl cursor-pointer animate-bounce hover:scale-110 transition z-50"
    >
      <span className="text-[10px] font-semibold leading-none -mb-1">{label}</span>
      <span className="text-xl leading-none">⌄</span>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation("common");
  const [meta, setMeta] = useState<PredictionMetadata | null>(null);
  const isProd = process.env.NODE_ENV === 'production';

  const PREDICTION_ID = isProd ? "2085" : "4415";

  useEffect(() => {
    async function getMeta() {
      try {
        const data = await fetchPredictionMetadata(PREDICTION_ID);
        setMeta(data);
      } catch (e) {
        console.error("Error fetching homepage metadata", e);
      }
    }
    getMeta();
  }, []);

  const dashboardHref = useMemo(() => {
    if (!meta) return "/dashboard";

    const p = new URLSearchParams();

    p.set("sprint", meta.sprint ? "true" : "false");
    p.set("adm_level", meta.adm_level.toString());
    p.set("disease", meta.disease_code);
    p.set("prediction_id", PREDICTION_ID);
    p.set("case_definition", meta.case_definition);

    if (meta.adm_level === 0 && meta.adm_0_code) {
      p.set("adm_0", meta.adm_0_code);
    } else if (meta.adm_level === 1 && meta.adm_1_code) {
      p.set("adm_1", meta.adm_1_code);
    } else if (meta.adm_level === 2 && meta.adm_2_code) {
      p.set("adm_2", meta.adm_2_code);
    }

    return `/dashboard/quantitative?${p.toString()}`;
  }, [meta]);

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg)] text-text transition-colors duration-300">
      <div className="relative">
        <section data-scroll-section className="py-32 px-6 text-center bg-[var(--color-bg)] min-h-[90vh] flex flex-col justify-center">
          <Image src="/mosquito.svg" alt="Logo" width={500} height={60} className="mx-auto" priority />
          <NetworkBackground />
          <FadeInSection>
            <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-text">{t("home.hero.title")}</h1>
            <p className="text-2xl text-text/60 mx-auto leading-relaxed">{t("home.hero.subtitle")}</p>
          </FadeInSection>
          <ScrollIndicator label={t("home.scroll")} />
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">{t("home.project.title")}</h2>
              <p className="text-xl text-text/80 max-w-4xl leading-relaxed">
                {t("home.project.description")}<br />
                <b>{t("home.project.products")}</b>
              </p>
              <div className="flex justify-center items-center gap-8 flex-wrap mt-8">
                <div className="flex flex-col items-center">
                  <a href="#explore-nossos-dados" className="transition-transform hover:scale-105">
                    <Image src="/data_icon.png" alt="Data icon" width={180} height={90} className="rounded-2xl" />
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">{t("home.project.btn_data")}</p>
                </div>
                <div className="flex flex-col items-center">
                  <a href="#analise-nossos-modelos" className="transition-transform hover:scale-105">
                    <Image src="/models_icon.png" alt="Models icon" width={180} height={90} className="rounded-2xl" />
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">{t("home.project.btn_models")}</p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section id="explore-nossos-dados" className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-6xl mx-auto text-center">
              <Link href="/datastore" className="block w-fit mx-auto group">
                <h2 className="text-5xl font-bold mb-10 text-text group-hover:text-primary transition-colors cursor-pointer">
                  {t("home.data.title")}
                </h2>
              </Link>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl">
                <FadeInSection>
                  <a
                    href="/datastore?endpoint=infodengue"
                    className="block group"
                  >
                    <div className="relative p-6 rounded-xl bg-border shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300 cursor-pointer">
                      <div className="absolute top-2 right-8">
                        <Image
                          src="/info_dengue_logo.png"
                          alt="Logo Infodengue"
                          width={100}
                          height={50}
                        />
                      </div>
                      <h3 className="text-3xl font-semibold mb-3 text-text group-hover:text-primary transition-colors">
                        {t("home.data.cases_title")}
                      </h3>
                      <p
                        className="text-lg text-text/60 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: t("home.data.cases_desc"),
                        }}
                      />
                    </div>
                  </a>
                </FadeInSection>

                <FadeInSection>
                  <a
                    href="/datastore?endpoint=climate"
                    className="block group"
                  >
                    <div className="relative p-6 rounded-xl bg-border shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
                      <div className="absolute top-3 right-8">
                        <Image
                          src="/copernicus_logo.png"
                          alt="Logo Copernicus"
                          width={100}
                          height={50}
                        />
                      </div>
                      <h3 className="text-3xl font-semibold mb-3 text-text group-hover:text-primary transition-colors">
                        {t("home.data.climate_title")}
                      </h3>
                      <p
                        className="text-lg text-text/60 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: t("home.data.climate_desc"),
                        }}
                      />
                    </div>
                  </a>
                </FadeInSection>

                <FadeInSection>
                  <a
                    href="/datastore?endpoint=mosquito"
                    className="block group"
                  >
                    <div className="relative p-6 rounded-xl bg-border shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
                      <div className="absolute top-3 right-8">
                        <Image
                          src="/contaovos_icon.png"
                          alt="Icon Contaovos"
                          width={100}
                          height={50}
                        />
                      </div>
                      <h3 className="text-3xl font-semibold mb-3 text-text group-hover:text-primary transition-colors">
                        {t("home.data.mosquito_title")}
                      </h3>
                      <p
                        className="text-lg text-text/60 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: t("home.data.mosquito_desc"),
                        }}
                      />
                    </div>
                  </a>
                </FadeInSection>

                <FadeInSection>
                  <a
                    href="/datastore?endpoint=episcanner"
                    className="block group"
                  >
                    <div className="relative p-6 rounded-xl bg-border shadow-lg group-hover:-translate-y-2 group-hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
                      <div className="absolute top-3 right-8">
                        <Image
                          src="/episcanner_icon.svg"
                          alt="Icon Episcanner"
                          width={100}
                          height={50}
                        />
                      </div>
                      <h3 className="text-3xl font-semibold mb-3 text-text group-hover:text-primary transition-colors">
                        Episcanner
                      </h3>
                      <p
                        className="text-lg text-text/60 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: t("home.data.epi_desc"),
                        }}
                      />
                    </div>
                  </a>
                </FadeInSection>
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section id="analise-nossos-modelos" className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">{t("home.models.title")}</h2>
              <p className="text-xl text-text/80 max-w-5xl mb-12 mx-auto leading-relaxed">{t("home.models.description")}</p>

              <div className="relative group">
                {meta && (
                  <>
                    <HomeChart
                      predictionId={meta.id}
                      disease={meta.disease_code}
                      admLevel={meta.adm_level}
                      sprint={meta.sprint}
                      caseDefinition={meta.case_definition}
                      adm0={meta.adm_0_code || ""}
                      adm1={meta.adm_1_code || undefined}
                      adm2={meta.adm_2_code || undefined}
                    />
                    <Link
                      href={dashboardHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-10 inline-flex items-center gap-3 px-8 py-4 bg-primary text-text rounded-full font-bold hover:bg-primary/90 transition-all shadow-xl hover:scale-105 active:scale-95"
                    >
                      {t("home.models.image_message")}
                      <MoveRight className="w-5 h-5" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-[1400px] mx-auto text-center">
              <h2 className="text-5xl font-bold mb-16 text-text">{t("home.differentials.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {['integration', 'comparison', 'team', 'quality', 'community'].map((key, i) => (
                  <div key={key} className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">{t(`home.differentials.${key}_title`)}</h3>
                    <div className={`w-16 h-1 rounded-full mb-5 mx-auto ${['bg-emerald-500', 'bg-blue-400', 'bg-rose-400', 'bg-amber-500', 'bg-teal-500'][i]}`}></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">{t(`home.differentials.${key}_desc`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)] overflow-hidden">
          <FadeInSection>
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-20 text-text">{t("home.team.title")}</h2>
              <Link href="/about" className="group block relative">
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-0 max-w-6xl mx-auto relative min-h-[500px]">
                  {team.map((person, idx) => (
                    <div
                      key={person.id}
                      className="relative transition-all duration-700 ease-in-out md:absolute group-hover:scale-110 group-hover:z-[100]"
                      style={{
                        left: `calc(50% + ${(idx % 7 - 3) * 115}px)`,
                        top: `${Math.floor(idx / 7) * 140}px`,
                        zIndex: 10 + idx,
                        transform: `rotate(${(idx % 2 === 0 ? 1 : -1) * (idx % 5 + 2)}deg)`,
                      }}
                    >
                      <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-[var(--color-bg)] shadow-xl transition-all duration-500 group-hover:rotate-0 group-hover:shadow-2xl">
                        <Image src={person.image} alt={person.name} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-[var(--color-bg)] shadow-sm ${roleColorMap[person.roleKey] || 'bg-gray-400'}`} />
                    </div>
                  ))}
                  <div className="absolute inset-0 z-[110] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-full border border-white/20 shadow-2xl flex items-center gap-3">
                      <span className="text-text font-bold text-xl uppercase tracking-widest">{t("home.team.image_message")}</span>
                      <MoveRight className="text-primary animate-pulse" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </FadeInSection>
        </section>
      </div>
    </div>
  );
}
