"use client";

import NetworkBackground from "@/components/NetworkBackground";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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

const roleColorMap: Record<string, string> = {
  "Coordination": "bg-emerald-500",
  "Data Scientist": "bg-sky-400",
  "Postdoctoral researcher": "bg-amber-500",
  "Undergraduate student": "bg-teal-500",
  "Graduate student": "bg-teal-500",
  "Associated researcher": "bg-rose-400"
}

const team = [
  {
    name: "Flávio Codeço Coelho",
    role: "Coordination",
    about: ["PI of the Mosqlimate and associate professor at the School of Applied Mathematics at FGV, Rio de Janeiro, Brazil. ",
      "I am also part of the GRAPH network, based at the University of Geneva, where I am their data analysis coordinator. ",
      "In Brazil, I am also one of the coordinators of the Infodengue project. ",
      "My research interests revolve around the epidemiology of Infectious diseases from the point of view of math, statistics, and data science"],
    image: "/team/flavio.png",
    linkedin: "https://www.linkedin.com/in/fccoelho/",
    lattes: "https://lattes.cnpq.br/0309050626285266",
  },
  {
    name: "Leonardo Bastos",
    role: "Coordination",
    about: ["Public health researcher at the Scientific Computing Program (PROCC), Oswaldo Cruz Foundation (Fiocruz). ",
      "He is a research fellow at FAPERJ and CNPq. His main research is on developing and applying (Bayesian) statistical methods for infectious disease epidemiology. He is a co-lead on WP2."],
    image: "/team/leo.png",
    linkedin: "https://www.linkedin.com/in/leo-bastos-2489a222/",
    lattes: "http://lattes.cnpq.br/5241799121437269",
  },
  {
    name: "Luiz Max Carvalho",
    role: "Coordination",
    about: ["Assistant Professor at the School of Applied Mathematics, Getulio Vargas Foundation. ",
      "His interests are in Biostatistics, particularly Markov chain Monte Carlo, statistical phylogenetics, and model combination. ",
      "He co-led on WP2, hoping to bring state-of-the-art model comparison and combination techniques to predict arboviral diseases."],
    image: "/team/luiz.png",
    linkedin: "https://www.linkedin.com/in/luiz-max-carvalho-28368749/",
    lattes: "http://lattes.cnpq.br/7282202947621572",
  },
  {
    name: "Leon Alves",
    role: "Coordination",
    about: ["Professor at CEFET, Rio de Janeiro, Brazil. Developer of the Conta Ovos application, which aims to monitor the density of Aedes aegypti eggs in space and time. ",
      "My interests are in image processing and application design. WP1 Coordinator. "],
    image: "/team/leon.png",
    linkedin: "https://www.linkedin.com/in/leon-alves-714046134/",
    lattes: "http://lattes.cnpq.br/6405645890501034",
  },
  {
    name: "Eduardo Corrêa Araujo",
    role: "Coordination",
    about: ["Bachelor's in control and automation engineering at UTFPR. ",
      "He has experience in analyzing public health data and developing machine learning models applied to epidemiological contexts. ",
      "His interests include data science applied to health, mathematical and computational modeling of diseases, ",
      "development of tools in Python, and interdisciplinary collaboration in social impact projects. He works as a data scientist in the WP2 of the Mosqlimate project. ",
      "He is also Mosqlimate project manager."],
    image: "/team/eduardo.jpg",
    linkedin: "https://www.linkedin.com/in/eduardo-correa-araujo/",
    lattes: "http://lattes.cnpq.br/2326164285897270",
  },
  {
    name: "Iasmim Ferreira de Almeida",
    role: "Coordination",
    about: ["Postdoctoral researcher at FGV EMAp. PhD and Master's in Public Health Epidemiology from ENSP/FIOCRUZ. ",
      "Researcher at the Infodengue project and Mosqlimate, she is a researcher at the WP2, where she works with models involving arbovirus transmission patterns and their epidemiological ",
      "and climatic determinants. She is also Mosqlimate’s Community Engagement Manager and lead researcher at WP3. ",
      "Her research interests focus on communicable diseases and their epidemiology. "],
    image: "/team/Iasmim.jpg",
    linkedin: "https://www.linkedin.com/in/iasmim-ferreira-de-almeida-18b6ab11a/",
    lattes: "http://lattes.cnpq.br/6555136792794111",
  },
  {
    name: "Luã Bida Vacaro",
    role: "Developer & Data Scientist",
    about: ["Computer Science student and Open Source enthusiast. ",
      "Software Developer at Getulio Vargas Foundation, responsible for the development, deployment and maintenance of Mosqlimate's Project."],
    image: "/team/lua.png",
    linkedin: "https://www.linkedin.com/in/luabida/",
    lattes: "http://lattes.cnpq.br/2917646970654963",
  },
  {
    name: "Lucas Monteiro Bianchi",
    role: "Data Scientist",
    about: ["Statistician and data scientist, holding a PhD in Epidemiology in Public Health from ENSP/FIOCRUZ. ",
      "My professional experience includes applying statistical and machine learning methodologies to diverse fields such as agriculture and healthcare, ",
      "as well as contributing to public health initiatives and data analysis for international organizations."],
    image: "/team/Lucas.webp",
    linkedin: "https://www.linkedin.com/in/lucas-bianchi-19730993/",
    lattes: "http://lattes.cnpq.br/5099258319176445",
  },
  {
    name: "Fabiana Ganem",
    role: "Postdoctoral researcher",
    about: ["A master's and a doctorate in Epidemiology and Public Health from Universidade de Brasília and Universitat Autònoma de Barcelona. ",
      "She is a postdoctoral researcher at FGV EMAp and a member of the Mosqlimate Team, researching dengue surveillance strategies and the relationship ",
      "between socioeconomic, climatic, and environmental factors with arboviral diseases. Fabiana is Mosqlimate’s Forecast Sprint coordinator, ",
      "managing our annual International forecasting competitions."],
    image: "/team/Fabiana.png",
    linkedin: "https://www.linkedin.com/in/ganemfsh/",
    lattes: "http://lattes.cnpq.br/4219715335109895",
  },
  {
    name: "Beatriz Laiate",
    role: "Postdoctoral researcher",
    about: ["Postdoctoral researcher at FGV EMAp and a member of the Mosqlimate Team doing research on Bayesian inference, Mathematical modeling of Dengue fever, and Possibility Theory. ",
      "Holds a master's and a Ph.D. in Applied Mathematics from the University of Campinas. ",
      "She is curious about hybrid models of infectious diseases involving dynamical fuzzy systems, neural networks, and statistical methods of uncertainty quantification."],
    image: "/team/Beatriz.webp",
    linkedin: "https://www.linkedin.com/in/beatrizlaiate/",
    lattes: "http://lattes.cnpq.br/7357582113890746",
  },
  {
    name: "Marcio Maciel Bastos",
    role: "Postdoctoral researcher",
    about: ["Physics PhD candidate, holds a profound affinity for dynamic systems, statistical mechanics, Bayesian inference, and machine learning. ",
      "Currently contributing his insights as a collaborative researcher to the Mosqlimate project."],
    image: "/team/marcio.png",
    linkedin: "https://www.linkedin.com/in/marcio-b-955b6b30a/",
    lattes: "http://lattes.cnpq.br/7796268490215918",
  },
  {
    name: "Davi Sales Barreira",
    role: "Postdoctoral researcher",
    about: ["Postdoctoral researcher at FGV EMAp and a member of the Mosqlimate Team, where he focuses on dengue forecasting ",
      "using machine learning and optimal transport methods within spatio-temporal modelling. Holds a PhD in Applied Mathematics and Data Science from FGV EMAp."],
    image: "/team/Davi.webp",
    linkedin: "https://www.linkedin.com/in/davi-sales-barreira-77040277/",
    lattes: "http://lattes.cnpq.br/0780657935165909",
  },
  {
    name: "Julie Souza",
    role: "Postdoctoral researcher",
    about: ["Postdoctoral researcher at FGV EMAp. She is an applied mathematician, physicist, and data scientist with a PhD in Applied Mathematics and Data Science. ",
      "She holds a master’s and a bachelor’s degree in Physics. Her research focuses on mathematical modeling of epidemics, ",
      "emphasizing using epidemiological model-informed neural networks (PINNs) to capture complex dengue dynamics. ",
      "She also has expertise in machine learning, causal inference, and developing data pipelines for epidemiological analysis. ",
      "Her work seeks to integrate advanced computing and artificial intelligence methods for understanding and controlling infectious diseases."],
    image: "/team/Julie.webp",
    linkedin: "https://www.linkedin.com/in/julie-s0uza/",
    lattes: "http://lattes.cnpq.br/7574860145017597",
  },
  {
    name: "Ana Júlia Amaro",
    role: "Undergraduate student",
    about: ["Undergraduate student in Data Science and Artificial Intelligence at FGV-EMAp. She works as a developer and data scientist on the Mosqlimate research project. ",
      "FAPERJ undergraduate research fellow in a project carried out by Fiocruz researchers with 15 girls from public schools in Rio de Janeiro. ",
      "Interest in data science applied to health, machine learning and social projects, especially those related to education."],
    image: "/team/ana.jpg",
    linkedin: "https://www.linkedin.com/in/anajuliaamaropereirarocha/",
    lattes: "http://lattes.cnpq.br/1163109559638032",
  },
  {
    name: "Ezequiel Braga",
    role: "Graduate student",
    about: ["Master's student in Applied Mathematics and Data Science at FGV EMAp. His work focuses on Bayesian modeling, particularly in power priors. ",
      "He currently serves as a research assistant on the hdbayes R package project and Mosqlimate. ",
      "His primary research interests lie in biostatistics, especially in Bayesian and computational statistics."],
    image: "/team/Ezequiel.png",
    linkedin: "https://www.linkedin.com/in/ezequiel-braga/",
    lattes: "http://lattes.cnpq.br/6871140812323606",
  },
  {
    name: "Zuilho Segundo",
    role: "Undergraduate student",
    about: ["Undergraduate student in Data Science and Artificial Intelligence at FGV EMAp. I'm particularly interested in Machine Learning and Reinforcement Learning. ",
      "Currently, I'm working on reinforcement learning models where agents are designed to optimize testing distribution for arboviral diseases ",
      "such as dengue and chikungunya across different regions."],
    image: "/team/Zuilho.webp",
    linkedin: "https://www.linkedin.com/in/ZuilhoSe/",
    lattes: "http://lattes.cnpq.br/4620754984831209",
  },
  {
    name: "Sillas Rocha",
    role: "Undergraduate student",
    about: ["Undergraduate student in Data Science and Artificial Intelligence at FGV-EMAp. He is currently working on integrating an AI assistant into the Mosqlimate platform. ",
      "His interests focus on Machine Learning, particularly Deep Learning models."],
    image: "/team/Sillas.jpg",
    linkedin: "https://www.linkedin.com/in/scrocha/",
    lattes: "http://lattes.cnpq.br/8756293715832747",
  },
  {
    name: "Raquel Martins Lana",
    role: "Associated researcher",
    about: ["Marie Curie fellow at the Barcelona Supercomputing Center in the Global Health Resilience group. ",
      "Her background is in quantitative epidemiology and her research focuses on infectious disease dynamics and their association with environmental, climate, and social factors. ",
      "She is a collaborator in the Mosqlimate project."],
    image: "/team/raquel.png",
    linkedin: "https://www.linkedin.com/in/raquel-martins-lana/",
    lattes: "http://lattes.cnpq.br/2518752229392005",
  },
  {
    name: "Thais Riback",
    role: "Associated researcher",
    about: ["Biologist with a MSc and PhD in Zoology. I am interested in studies on ecology and population dynamics of arbovirus vectors and their impact on the dynamics of disease transmission. ",
      "I currently work as an analyst at the Epidemiological Intelligence Center of the Secretariat of Health of Rio de Janeiro City and as a collaborating researcher in the Infodengue system."],
    image: "/team/thais.jpg",
    linkedin: "https://www.linkedin.com/in/thais-riback-a78054214/",
    lattes: "http://lattes.cnpq.br/4335590727747384",
  },
  {
    name: "Laís Picinini Freitas",
    role: "Associated researcher",
    about: ["Researcher at the Scientific Computing Program (PROCC/Fiocruz), with a master's and PhD in Epidemiology from ENSP/Fiocruz. ",
      "She completed postdoctoral training at PROCC and CReSP, Université de Montréal. ",
      "Her work focuses on Bayesian modeling of infectious diseases, especially arboviruses, analyzing spatial patterns and socio-environmental determinants."],
    image: "/team/Lais.webp",
    linkedin: "https://www.linkedin.com/in/laisfreitas/",
    lattes: "http://lattes.cnpq.br/2996805485281003",
  },
  {
    name: "Bruno Carvalho",
    role: "Associated researcher",
    about: ["Postdoctoral researcher at the Barcelona Supercomputing Center in the Global Health Resilience group, where he develops infectious disease models for early warning and decision support. ",
      "He builds indicators to track the impacts of climate change on health using open-access and reproducible digital toolkits. ",
      "He is a biologist, PhD in Ecology and Evolution, and MSc in Parasitology. ",
      "As a collaborator in Mosqlimate, Bruno is developing deep learning models to predict dengue in Brazil using data from the Infodengue system."],
    image: "/team/Bruno.webp",
    linkedin: "https://www.linkedin.com/in/carvalho-bm/",
    lattes: "http://lattes.cnpq.br/5725434538672496",
  },
];


export default function AboutPage() {
  return (
    <div className="relative min-h-screen">
      <NetworkBackground />

      <section className="relative py-4 px-6 mb-20">
        <div className="max-w-[1400px] mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-text">
            Our team
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((person, index) => (
              <FadeInSection key={index}>
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
                    {person.role}
                  </p>

                  <div className={`w-16 h-1 rounded-full mb-6 mx-auto ${roleColorMap[person.role] ?? "bg-gray-400"}`}></div>

                  <p className="text-text text-sm mb-2">
                    {person.about}
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
          </div>
        </div>
      </section>

    </div>
  )
}
