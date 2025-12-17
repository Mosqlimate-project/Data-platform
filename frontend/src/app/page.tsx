"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import NetworkBackground from "@/components/NetworkBackground";

//Smooth animation component for when each section of the homepage appears
function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform opacity-0 translate-y-8 ${
        visible ? "opacity-100 translate-y-0" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  function ScrollIndicator() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
      function handleScroll() {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;

        //If it has come to an end, then it disappears
        if (scrollTop + windowHeight >= docHeight - 10) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      }

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!isVisible) return null;

    return (
      <div
        onClick={() =>
          window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
        }
        className="
          fixed bottom-6 left-8 
          w-14 h-14 
          bg-accent text-white
          rounded-full
          flex flex-col items-center justify-center
          shadow-xl
          cursor-pointer
          animate-bounce
          hover:scale-110
          transition
          z-50
        "
      >
        <span className="text-[10px] font-semibold leading-none -mb-1">
          scroll
        </span>
        <span className="text-xl leading-none">⌄</span>
      </div>
    );
  }
  return (
    <div className="relative w-full min-h-screen bg-bg text-text transition-colors duration-300">
      
      <div className="relative z-10">
        {/*HERO*/}
        <section className="py-32 px-6 text-center bg-bg">
          <Image
            src="/mosquito.svg"
            alt="Logo"
            width={500}
            height={60}
            className="mx-auto"
          />
          <NetworkBackground />
          <FadeInSection>
            <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-text">
              Mosqlimate
            </h1>
            <p className="text-2xl text-text/60 mx-auto leading-relaxed">
              Vigilância Inteligente de Arboviroses e Clima
            </p>
          </FadeInSection>
          <ScrollIndicator />
        </section>

        {/* GET TO KNOW THE PROJECT */}
        <section className="py-32 px-6 bg-bg">
          <FadeInSection>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">Conheça o projeto</h2>
              <p className="text-xl text-text/80 max-w-4xl leading-relaxed">
                O Mosqlimate é uma plataforma inovadora de monitoramento e previsão de riscos relacionados a arboviroses (doenças transmitidas por mosquitos) no contexto das mudanças climáticas.
                Desenvolvemos ferramentas que integram dados climáticos, epidemiológicos e entomológicos para melhorar a detecção precoce de surtos e apoiar estratégias de controle, no Brasil e na América do Sul. Nosso propósito é prevenir riscos e fortalecer a resposta a doenças como dengue, chikungunya e Zika.
                <b>Nossos dois principais produtos são:</b>
              </p>

              <div className="flex justify-center items-center gap-8 flex-wrap mt-8">
                <div className="flex flex-col items-center">
                  <a href="#explore-nossos-dados" className="transition-transform hover:scale-105">
                    <Image
                      src="/data_icon.png"
                      alt="Ícone para dados"
                      width={180}
                      height={90}
                      className="rounded-2xl"
                    /> 
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">Dados</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <a href="#analise-nossos-modelos" className="transition-transform hover:scale-105">
                    <Image
                      src="/models_icon.png"
                      alt="Ícone para modelos"
                      width={180}
                      height={90}
                      className="rounded-2xl"
                    /> 
                  </a>
                  <p className="mt-3 text-lg font-semibold text-text">Modelos Preditivos</p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* EXPLORE OUR DATA */}
        <section id="explore-nossos-dados" className="py-32 px-6 bg-bg">
          <FadeInSection>
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-10 text-text">Explore nossos dados</h2>

              {/*TO DO: Place a link in each box to its respective documentation or dashboard*/}
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
                    <h3 className="text-3xl font-semibold mb-3 text-text">Casos</h3>
                    <p className="text-lg text-text/60 leading-relaxed">
                      Dados semanais sobre <b>dengue</b>, <b>zika</b> e <b>chikungunya</b> para todos os municípios brasileiros, a fim de acompanhar tendências e sazonalidade para controle de doenças.
                    </p>
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
                    <h3 className="text-3xl font-semibold mb-3 text-text">Clima</h3>
                    <p className="text-lg text-text/60 leading-relaxed">
                      Variáveis climáticas diárias extraídas de dados de reanálise por satélite, como <b>temperatura</b> e <b>precipitação</b>, para prever a dinâmica de proliferação dos mosquitos vetores.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-3 right-8">
                      <Image
                        src="/contaovos_icon.png"
                        alt="Ícone Contaovos"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">Mosquito</h3>
                    <p className="text-lg text-text/60 leading-relaxed">
                      Dados do projeto <b>Contaovos</b>, obtidos por meio de armadilhas para ovos de Aedes aegypti para monitorar a densidade vetorial em tempo real no Brasil.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-3 right-8">
                      <Image
                        src="/episcanner_icon.svg"
                        alt="Ícone Epi-Scanner"
                        width={100}
                        height={50}
                      />
                    </div>
                    <h3 className="text-3xl font-semibold mb-3 text-text">Epi-Scanner</h3>
                    <p className="text-lg text-text/60 leading-relaxed">
                      Analisa e apresenta dados atualizados da <b>expansão de dengue, zika e chikungunya</b> no território nacional com foco em padrões espaciais e temporais da transmissão.
                    </p>
                  </div>
                </FadeInSection>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/*ANALYSE OUR MODELS*/}
        <section id="analise-nossos-modelos" className="py-32 px-6 bg-bg">
          <FadeInSection>
            <div className="max-w-5xl mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">Analise nossos modelos</h2>
              <p className="text-xl text-text/80 max-w-5xl leading-relaxed">
                O Mosqlimate disponibiliza e registra modelos de previsão para dengue, chikungunya e zika, utilizando dados climáticos e epidemiológicos oficiais de domínio público.
                Esses modelos permitem comparar metodologias através de dashboards, aprimorar previsões e identificar sinais de expansão ou surtos, inclusive de novos arbovírus, integrando-se ao sistema de alerta precoce Infodengue.
              </p>

              {/*TO DO: Replace this image with a URL to a dashboard featuring some models from our website*/}
              <a href="/registry/models" className="inline-block">
                <Image
                  src="/models.png"
                  alt="Models"
                  width={1600}
                  height={1200}
                  className="mx-auto w-full max-w-6xl h-auto mt-8"
                /> 
              </a>
            </div>
          </FadeInSection>
        </section>

        {/*DISCOVEY THE DIFFERENCES OF MOSQLIMATE*/}
        <section className="py-32 px-6 bg-bg">
          <FadeInSection>
            <div className="max-w-[1400px] mx-auto text-center">
              <h2 className="text-5xl font-bold mb-16 text-text">Descubra os diferenciais do Mosqlimate</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">Integração completa de dados</h3>
                    <div className="w-16 h-1 bg-emerald-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      Reúne, em um só lugar, informações epidemiológicas, climáticas e entomológicas.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-3">Comparação inteligente de modelos</h3>
                    <div className="w-16 h-1 bg-blue-400 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      Visualizações dinâmicas que permitem comparar previsões de diferentes modelos.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">Equipe multidisciplinar de excelência</h3>
                    <div className="w-16 h-1 bg-rose-400 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      Epidemiologistas, cientistas de dados, biólogos, estatísticos e físicos garantindo análises inovadoras.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">Compromisso com a qualidade</h3>
                    <div className="w-16 h-1 bg-amber-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      Conteúdo atualizado, sustentado por publicações científicas e resultados validados.
                    </p>
                  </div>
                </FadeInSection>

                <FadeInSection>
                  <div className="bg-border rounded-2xl shadow-lg p-6 h-[320px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-text h-[70px] flex items-start leading-tight mb-2">Comunidade ativa e colaborativa</h3>
                    <div className="w-16 h-1 bg-teal-500 rounded-full mb-5 mx-auto"></div>
                    <p className="text-base text-text/70 leading-relaxed flex-1">
                      Realiza eventos de destaque como a E-Vigilância bianual e o Sprint anual, além de seminários contínuos.
                    </p>
                  </div>
                </FadeInSection>

              </div>
            </div>
          </FadeInSection>
        </section>

        {/*GET TO KNOW OUR TEAM*/}
        <section className="py-32 px-6 bg-bg">
          <FadeInSection>
            <div className="w-full mx-auto text-center">
              <h2 className="text-5xl font-bold mb-6 text-text">Conheça a nossa equipe</h2>
              {/*TO DO: Replace href with the correct tab name containing the team descriptions*/}
              <a href="/equipe" className="inline-block">
                <Image
                  src="/team.svg"
                  alt="Team"
                  width={650}
                  height={100}
                  className="mx-auto"
                /> 
              </a>
            </div>
          </FadeInSection>
        </section>
      </div>
    </div>
  );
}
