"use client";

import NetworkBackground from "@/components/NetworkBackground";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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
      className={`transition-all duration-1000 ease-out transform opacity-0 translate-y-8 ${visible ? "opacity-100 translate-y-0" : ""
        }`}
    >
      {children}
    </div>
  );
}
function ScrollIndicator({ label }: { label: string }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      setIsVisible(scrollTop + windowHeight < docHeight - 20);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      onClick={() =>
        window.scrollBy({
          top: window.innerHeight * 0.7,
          behavior: "smooth",
        })
      }
      className="fixed bottom-6 left-8 w-14 h-14 bg-accent text-white rounded-full
                 flex flex-col items-center justify-center shadow-xl cursor-pointer
                 animate-bounce hover:scale-110 transition z-50"
    >
      <span className="text-[10px] font-semibold leading-none -mb-1">
        {label}
      </span>
      <span className="text-xl leading-none">⌄</span>
    </div>
  );
}


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
  {
    id: "flavio",
    name: "Flávio Codeço Coelho",
    roleKey: "coordination",
    image: "/team/flavio.png",
    linkedin: "https://www.linkedin.com/in/fccoelho/",
    lattes: "https://lattes.cnpq.br/0309050626285266",
  },
  {
    id: "leonardo",
    name: "Leonardo Bastos",
    roleKey: "coordination",
    image: "/team/leo.png",
    linkedin: "https://www.linkedin.com/in/leo-bastos-2489a222/",
    lattes: "http://lattes.cnpq.br/5241799121437269",
  },
  {
    id: "luiz",
    name: "Luiz Max Carvalho",
    roleKey: "coordination",
    image: "/team/luiz.png",
    linkedin: "https://www.linkedin.com/in/luiz-max-carvalho-28368749/",
    lattes: "http://lattes.cnpq.br/7282202947621572",
  },
  {
    id: "leon",
    name: "Leon Alves",
    roleKey: "coordination",
    image: "/team/leon.png",
    linkedin: "https://www.linkedin.com/in/leon-alves-714046134/",
    lattes: "http://lattes.cnpq.br/6405645890501034",
  },
  {
    id: "eduardo",
    name: "Eduardo Corrêa Araujo",
    roleKey: "coordination",
    image: "/team/eduardo.jpg",
    linkedin: "https://www.linkedin.com/in/eduardo-correa-araujo/",
    lattes: "http://lattes.cnpq.br/2326164285897270",
  },
  {
    id: "iasmim",
    name: "Iasmim Ferreira de Almeida",
    roleKey: "coordination",
    image: "/team/Iasmim.jpg",
    linkedin: "https://www.linkedin.com/in/iasmim-ferreira-de-almeida-18b6ab11a/",
    lattes: "http://lattes.cnpq.br/6555136792794111",
  },
  {
    id: "lua",
    name: "Luã Bida Vacaro",
    roleKey: "developer_data_scientist",
    image: "/team/lua.png",
    linkedin: "https://www.linkedin.com/in/luabida/",
    lattes: "http://lattes.cnpq.br/2917646970654963",
  },
  {
    id: "lucas",
    name: "Lucas Monteiro Bianchi",
    roleKey: "data_scientist",
    image: "/team/Lucas.webp",
    linkedin: "https://www.linkedin.com/in/lucas-bianchi-19730993/",
    lattes: "http://lattes.cnpq.br/5099258319176445",
  },
  {
    id: "fabiana",
    name: "Fabiana Ganem",
    roleKey: "postdoc",
    image: "/team/Fabiana.png",
    linkedin: "https://www.linkedin.com/in/ganemfsh/",
    lattes: "http://lattes.cnpq.br/4219715335109895",
  },
  {
    id: "beatriz",
    name: "Beatriz Laiate",
    roleKey: "postdoc",
    image: "/team/Beatriz.webp",
    linkedin: "https://www.linkedin.com/in/beatrizlaiate/",
    lattes: "http://lattes.cnpq.br/7357582113890746",
  },
  {
    id: "marcio",
    name: "Marcio Maciel Bastos",
    roleKey: "postdoc",
    image: "/team/marcio.png",
    linkedin: "https://www.linkedin.com/in/marcio-b-955b6b30a/",
    lattes: "http://lattes.cnpq.br/7796268490215918",
  },
  {
    id: "davi",
    name: "Davi Sales Barreira",
    roleKey: "postdoc",
    image: "/team/Davi.webp",
    linkedin: "https://www.linkedin.com/in/davi-sales-barreira-77040277/",
    lattes: "http://lattes.cnpq.br/0780657935165909",
  },
  {
    id: "julie",
    name: "Julie Souza",
    roleKey: "postdoc",
    image: "/team/Julie.webp",
    linkedin: "https://www.linkedin.com/in/julie-s0uza/",
    lattes: "http://lattes.cnpq.br/7574860145017597",
  },
  {
    id: "ana",
    name: "Ana Júlia Amaro",
    roleKey: "undergrad",
    image: "/team/ana.jpg",
    linkedin: "https://www.linkedin.com/in/anajuliaamaropereirarocha/",
    lattes: "http://lattes.cnpq.br/1163109559638032",
  },
  {
    id: "ezequiel",
    name: "Ezequiel Braga",
    roleKey: "grad",
    image: "/team/Ezequiel.png",
    linkedin: "https://www.linkedin.com/in/ezequiel-braga/",
    lattes: "http://lattes.cnpq.br/6871140812323606",
  },
  {
    id: "zuilho",
    name: "Zuilho Segundo",
    roleKey: "undergrad",
    image: "/team/Zuilho.webp",
    linkedin: "https://www.linkedin.com/in/ZuilhoSe/",
    lattes: "http://lattes.cnpq.br/4620754984831209",
  },
  {
    id: "sillas",
    name: "Sillas Rocha",
    roleKey: "undergrad",
    image: "/team/Sillas.jpg",
    linkedin: "https://www.linkedin.com/in/scrocha/",
    lattes: "http://lattes.cnpq.br/8756293715832747",
  },
  {
    id: "raquel",
    name: "Raquel Martins Lana",
    roleKey: "associated",
    image: "/team/raquel.png",
    linkedin: "https://www.linkedin.com/in/raquel-martins-lana/",
    lattes: "http://lattes.cnpq.br/2518752229392005",
  },
  {
    id: "thais",
    name: "Thais Riback",
    roleKey: "associated",
    image: "/team/thais.jpg",
    linkedin: "https://www.linkedin.com/in/thais-riback-a78054214/",
    lattes: "http://lattes.cnpq.br/4335590727747384",
  },
  {
    id: "lais",
    name: "Laís Picinini Freitas",
    roleKey: "associated",
    image: "/team/Lais.webp",
    linkedin: "https://www.linkedin.com/in/laisfreitas/",
    lattes: "http://lattes.cnpq.br/2996805485281003",
  },
  {
    id: "bruno",
    name: "Bruno Carvalho",
    roleKey: "associated",
    image: "/team/Bruno.webp",
    linkedin: "https://www.linkedin.com/in/carvalho-bm/",
    lattes: "http://lattes.cnpq.br/5725434538672496",
  },
  {
    id: "joyce",
    name: "Joyce Figueiró Braga",
    roleKey: "associated",
    image: "/team/joyce.jpeg",
    linkedin: "https://www.linkedin.com/in/joyce-figueiró-braga-51784425/",
    lattes: "http://lattes.cnpq.br/9948080229720839",
  },
];


export default function AboutPage() {
  const { t } = useTranslation("common");

  return (
    <div className="relative min-h-screen">
      <NetworkBackground />

      <section className="relative py-4 px-6 mb-20">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-text">
            {t("about.title")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((person) => (
              <FadeInSection key={person.id}>
                <div className="bg-border rounded-2xl shadow-lg p-6 h-[600px] flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">

                  <Image
                    src={person.image}
                    width={80}
                    height={50}
                    alt={person.name}
                    className="w-32 h-32 mx-auto rounded-full object-cover mb-6"
                  />

                  <h3 className="text-xl font-bold text-text mb-1">
                    {person.name}
                  </h3>

                  <p className="text-text/70 mb-6">
                    {t(`about.roles.${person.roleKey}`)}
                  </p>

                  <div className={`w-16 h-1 rounded-full mb-6 mx-auto ${roleColorMap[person.roleKey] ?? "bg-gray-400"}`}></div>

                  <p className="text-text text-sm mb-2">
                    {t(`about.team.${person.id}`)}
                  </p>

                  <div className="mt-auto flex justify-center gap-4">
                    <a
                      href={person.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-bg rounded-lg flex items-center justify-center hover:bg-emerald-500 transition-colors"
                    >
                      <Image
                        src="/linkedin_logo.png"
                        width={50}
                        height={50}
                        alt="LinkedIn"
                        className="w-5 h-5"
                      />
                    </a>

                    <a
                      href={person.lattes}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-bg rounded-lg flex items-center justify-center hover:bg-blue-500 transition-colors"
                    >
                      <Image
                        src="/lattes_logo.png"
                        width={50}
                        height={50}
                        alt="Lattes"
                        className="w-5 h-5"
                      />
                    </a>
                  </div>

                </div>

              </FadeInSection>
            ))}
            <ScrollIndicator label={t("home.scroll")} />
          </div>
        </div>
      </section>

    </div>
  )
}
