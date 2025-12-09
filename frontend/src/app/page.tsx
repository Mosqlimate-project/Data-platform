"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import NetworkBackground from "@/components/NetworkBackground";

// Componente de animação suave ao aparecer
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

        // Se chegou ao fim, some
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
    <div className="w-full min-h-screen bg-bg text-text transition-colors duration-300">
      <NetworkBackground />
      {/* HERO */}
      <section className="py-32 px-6 text-center bg-bg">
        <Image
          src="/mosquito.svg"
          alt="Logo"
          width={500}
          height={60}
          className="mx-auto"
        />
        
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

      {/* CONHEÇA O PROJETO */}
      <section className="py-32 px-6 bg-bg">
        <FadeInSection>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6 text-text">Conheça o projeto</h2>
            <p className="text-xl text-text/80 max-w-4xl leading-relaxed">
              O Mosqlimate é uma plataforma inovadora de monitoramento e previsão de riscos relacionados a arboviroses (doenças transmitidas por mosquitos) no contexto das mudanças climáticas.
              Desenvolvemos ferramentas que integram dados climáticos, epidemiológicos e entomológicos para melhorar a detecção precoce de surtos e apoiar estratégias de controle, no Brasil e na América do Sul. Nosso propósito é prevenir riscos e fortalecer a resposta a doenças como dengue, chikungunya e Zika.
              Oferecemos, principalmente, <b>dados</b> e <b>modelos preditivos</b>.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* EXPLORE NOSSOS DADOS */}
      <section className="py-32 px-6 bg-bg">
        <FadeInSection>
          <div className="max-w-6xl mx-auto text-center">
            <NetworkBackground />
            <h2 className="text-5xl font-bold mb-10 text-text">Explore nossos dados</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl">
              <FadeInSection>
                <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
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
                    Variáveis epidemiológicas semanais sobre <b>dengue</b>, <b>zika</b> e <b>chikungunya</b> para todos os municípios brasileiros, o que permite acompanhar tendências, surtos e sazonalidade, ajudando na tomada de decisões e controle de doenças.
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
                    Variáveis climáticas diárias extraídas de dados de reanálise por satélite, como <b>temperatura</b>, <b>umidade</b> e <b>precipitação</b>, fundamentais para prever e compreender a dinâmica de proliferação dos mosquitos vetores.
                  </p>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                  <div className="absolute top-3 right-8">
                    <Image
                      src="/icone_contaovos.png"
                      alt="Ícone Contaovos"
                      width={100}
                      height={50}
                    />
                  </div>
                  <h3 className="text-3xl font-semibold mb-3 text-text">Mosquito</h3>
                  <p className="text-lg text-text/60 leading-relaxed">
                    Dados do projeto <b>Contaovos</b>, obtidos por meio de armadilhas para ovos de Aedes aegypti distribuídas em todo o Brasil, seguindo o protocolo do Ministério da Saúde, para monitorar a densidade vetorial em tempo real.
                  </p>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="p-6 rounded-xl bg-border shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
                  <div className="absolute top-3 right-8">
                    <Image
                      src="/icone_episcanner.svg"
                      alt="Ícone Epi-Scanner"
                      width={100}
                      height={50}
                    />
                  </div>
                  <h3 className="text-3xl font-semibold mb-3 text-text">Epi-Scanner</h3>
                  <p className="text-lg text-text/60 leading-relaxed">
                    Analisa e apresenta dados atualizados da <b>expansão de dengue, zika e chikungunya</b> no território nacional, a partir das bases do Infodengue, com foco em padrões espaciais e temporais da transmissão.
                  </p>
                </div>
              </FadeInSection>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ANALISE NOSSOS MODELOS */}
      <section className="py-32 px-6 bg-bg">
        <FadeInSection>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6 text-text">Analise nossos modelos</h2>
            <p className="text-xl text-text/80 max-w-5xl leading-relaxed">
              O Mosqlimate disponibiliza e registra modelos de previsão para dengue, chikungunya e zika, utilizando dados climáticos e epidemiológicos oficiais de domínio público.
              Esses modelos permitem comparar metodologias através de dashboards, aprimorar previsões e identificar sinais de expansão ou surtos, inclusive de novos arbovírus, integrando-se ao sistema de alerta precoce Infodengue.
            </p>

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

      {/* DESCUBRA OS DIFERENCIAIS DO MOSQLIMATE */}
      <section className="py-4 px-6 bg-bg">
        <FadeInSection>
          <div className="max-w-6xl mx-auto text-center">
            <NetworkBackground />
            <h2 className="text-5xl font-bold mb-10 text-text">Descubra os diferenciais do Mosqlimate</h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <FadeInSection>
                <div className="flex items-center justify-center">
                  <div className="w-[450px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[400px] lg:h-[330px] rounded-full bg-border shadow-md flex flex-col justify-center p-6 text-left overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text">Integração completa de dados</h3>
                    <p className="text-sm md:text-base text-text/80 leading-relaxed">
                      Reúne, em um só lugar, informações epidemiológicas, climáticas e entomológicas.
                    </p>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="flex items-center justify-center">
                  <div className="w-[450px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[400px] lg:h-[330px] rounded-full bg-border shadow-md flex flex-col justify-center p-6 text-left overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text">Comparação inteligente de modelos</h3>
                    <p className="text-sm md:text-base text-text/80 leading-relaxed">
                      Visualizações dinâmicas que permitem comparar previsões de diferentes modelos.
                    </p>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="flex items-center justify-center">
                  <div className="w-[450px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[400px] lg:h-[330px] rounded-full bg-border shadow-md flex flex-col justify-center p-6 text-left overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text">Equipe de excelência</h3>
                    <p className="text-sm md:text-base text-text/80 leading-relaxed">
                      Epidemiologistas, cientistas de dados, biólogos, estatísticos e físicos garantindo análises inovadoras.
                    </p>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="flex items-center justify-center">
                  <div className="w-[450px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[400px] lg:h-[330px] rounded-full bg-border shadow-md flex flex-col justify-center p-6 text-left overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text">Dever com qualidade</h3>
                    <p className="text-sm md:text-base text-text/80 leading-relaxed">
                      Conteúdo atualizado, sustentado por publicações científicas e resultados validados.
                    </p>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection>
                <div className="flex items-center justify-center">
                  <div className="w-[450px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[400px] lg:h-[330px] rounded-full bg-border shadow-md flex flex-col justify-center p-6 text-left overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2 text-text">Comunidade colaborativa</h3>
                    <p className="text-sm md:text-base text-text/80 leading-relaxed">
                      Realiza eventos de destaque como a E-Vigilância bianual e o Sprint anual, além de seminários contínuos.
                    </p>
                  </div>
                </div>
              </FadeInSection>

            </div>
          </div>
        </FadeInSection>
      </section>

      {/* CONHEÇA A NOSSA EQUIPE */}
      <section className="py-32 px-6 bg-bg">
        <FadeInSection>
          <div className="w-full mx-auto text-center">
            <h2 className="text-5xl font-bold mb-6 text-text">Conheça a nossa equipe</h2>
            <a href="/equipe" className="inline-block">
              <Image
                src="/team.png"
                alt="Team"
                width={800}
                height={200}
                className="mx-auto"
              /> 
            </a>
          </div>
        </FadeInSection>
      </section>
    </div>
  );
}
