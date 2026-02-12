"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

const NetworkBackground = dynamic(() => import("@/components/NetworkBackground"), {
  ssr: false,
});

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

          if (scrollTop + windowHeight >= docHeight - 20) {
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
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
        const sections = Array.from(
          document.querySelectorAll<HTMLElement>("[data-scroll-section]")
        );

        const currentScroll = window.scrollY + 10;

        const nextSection = sections.find(
          (section) => section.offsetTop > currentScroll
        );

        if (nextSection) {
          nextSection.scrollIntoView({ behavior: "smooth" });
        }
      }}
      
      className="fixed bottom-6 left-8 w-14 h-14 bg-accent text-white rounded-full flex flex-col items-center justify-center shadow-xl cursor-pointer animate-bounce hover:scale-110 transition z-50"
    >
      <span className="text-[10px] font-semibold leading-none -mb-1">
        {label}
      </span>
      <span className="text-xl leading-none">⌄</span>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation("common");

  return (
    <div className="relative w-full min-h-screen bg-[var(--color-bg)] text-text transition-colors duration-300">
      <div className="relative">
        <section data-scroll-section className="py-32 px-6 text-center bg-[var(--color-bg)] min-h-[90vh] flex flex-col justify-center">
          <Image
            src="/mosquito.svg"
            alt="Logo"
            width={500}
            height={60}
            className="mx-auto"
            priority
          />
          <NetworkBackground />
          <FadeInSection>
            <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-text">
              {t("home.hero.title")}
            </h1>
            <p className="text-2xl text-text/60 mx-auto leading-relaxed">
              {t("home.hero.subtitle")}
            </p>
          </FadeInSection>
          <ScrollIndicator label={t("home.scroll")} />
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">
                {t("home.project.title")}
              </h2>
              <p className="text-xl text-text/80 max-w-4xl leading-relaxed">
                {t("home.project.description")}
                <br />
                <b>{t("home.project.products")}</b>
              </p>

              <div className="flex justify-center items-center gap-8 flex-wrap mt-8">
                <div className="flex flex-col items-center">
                  <a
                    href="#explore-nossos-dados"
                    className="transition-transform hover:scale-105"
                  >
                    <Image
                      src="/data_icon.png"
                      alt="Data icon"
                      width={180}
                      height={90}
                      className="rounded-2xl"
                      sizes="(max-width: 768px) 100px, 180px"
                    />
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">
                    {t("home.project.btn_data")}
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <a
                    href="#analise-nossos-modelos"
                    className="transition-transform hover:scale-105"
                  >
                    <Image
                      src="/models_icon.png"
                      alt="Models icon"
                      width={180}
                      height={90}
                      className="rounded-2xl"
                      sizes="(max-width: 768px) 100px, 180px"
                    />
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">
                    {t("home.project.btn_models")}
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section id="explore-nossos-dados" className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-10 text-text">
                {t("home.data.title")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl">
                <FadeInSection>
                  <div className="relative p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-2 right-8">
                      <Image
                        src="/info_dengue_logo.png"
                        alt="Logo Infodengue"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">
                      {t("home.data.cases_title")}
                    </h3>
                    <p
                      className="text-lg text-text/60 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: t("home.data.cases_desc"),
                      }}
                    />
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-3 right-8">
                      <Image
                        src="/copernicus_logo.png"
                        alt="Logo Copernicus"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">
                      {t("home.data.climate_title")}
                    </h3>
                    <p
                      className="text-lg text-text/60 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: t("home.data.climate_desc"),
                      }}
                    />
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-3 right-8">
                      <Image
                        src="/contaovos_icon.png"
                        alt="Icon Contaovos"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">
                      {t("home.data.mosquito_title")}
                    </h3>
                    <p
                      className="text-lg text-text/60 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: t("home.data.mosquito_desc"),
                      }}
                    />
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-3 right-8">
                      <Image
                        src="/episcanner_icon.svg"
                        alt="Icon Epi-Scanner"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">
                      {t("home.data.epi_title")}
                    </h3>
                    <p
                      className="text-lg text-text/60 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: t("home.data.epi_desc"),
                      }}
                    />
                  </div>
                </FadeInSection>
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section id="analise-nossos-modelos" className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">
                {t("home.models.title")}
              </h2>
              <p className="text-xl text-text/80 max-w-5xl mb-8 leading-relaxed">
                {t("home.models.description")}
              </p>

              <a href="/models" className="group relative inline-block">
                <Image
                  src="/models.png"
                  alt="Models"
                  width={1600}
                  height={1200}
                  className="mx-auto transition group-hover:opacity-80"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
                />

                <div className="absolute inset-0 flex items-center justify-center
                                bg-black/40 opacity-0 group-hover:opacity-100
                                transition-opacity">
                  <span className="text-white text-lg font-medium px-4 text-center">
                    {t("home.models.image_message")}
                  </span>
                </div>
              </a>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="max-w-[1400px] mx-auto text-center">
              <h2 className="text-5xl font-bold mb-16 text-text">
                {t("home.differentials.title")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">
                      {t("home.differentials.integration_title")}
                    </h3>
                    <div className="w-16 h-1 bg-emerald-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      {t("home.differentials.integration_desc")}
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-3">
                      {t("home.differentials.comparison_title")}
                    </h3>
                    <div className="w-16 h-1 bg-blue-400 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      {t("home.differentials.comparison_desc")}
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">
                      {t("home.differentials.team_title")}
                    </h3>
                    <div className="w-16 h-1 bg-rose-400 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      {t("home.differentials.team_desc")}
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">
                      {t("home.differentials.quality_title")}
                    </h3>
                    <div className="w-16 h-1 bg-amber-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      {t("home.differentials.quality_desc")}
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">
                      {t("home.differentials.community_title")}
                    </h3>
                    <div className="w-16 h-1 bg-teal-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      {t("home.differentials.community_desc")}
                    </p>
                  </div>
                </FadeInSection>
              </div>
            </div>
          </FadeInSection>
        </section>

        <section data-scroll-section className="py-32 px-6 bg-[var(--color-bg)]">
          <FadeInSection>
            <div className="w-full mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">
                {t("home.team.title")}
              </h2>
              <a href="/about" className="group relative inline-block">
                <Image
                  src="/team.svg"
                  alt="Team"
                  width={650}
                  height={100}
                  className="mx-auto transition group-hover:opacity-80"
                  sizes="(max-width: 768px) 300px, 650px"
                />
                <div className="absolute inset-0 flex items-center justify-center
                                bg-black/40 opacity-0 group-hover:opacity-100
                                transition-opacity">
                  <span className="text-white text-lg font-medium px-4 text-center">
                    {t("home.team.image_message")}
                  </span>
                </div>
              </a>
            </div>
          </FadeInSection>
        </section>
      </div>
    </div>
  );
}
