'use client';

import { motion } from 'framer-motion';
import {
  FaExternalLinkAlt,
  FaYoutube,
  FaDatabase,
  FaVideo,
  FaGithub,
  FaFileAlt,
  FaNewspaper,
  FaHistory,
  FaGraduationCap,
  FaClipboardList,
  FaChalkboardTeacher,
  FaLaptopCode
} from 'react-icons/fa';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

type PubType = 'abstract' | 'article' | 'preprint' | 'thesis' | 'report' | 'presentation';

interface PublicationItem {
  citation: string;
  link?: string;
  type: PubType;
}

interface YearGroup {
  year: string;
  items: PublicationItem[];
}

export default function PublicationsPage() {
  const { t } = useTranslation('common');

  const getTypeInfo = (type: PubType) => {
    switch (type) {
      case 'article':
        return {
          icon: <FaNewspaper />,
          label: t('publications.type.article'),
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
        };
      case 'preprint':
        return {
          icon: <FaHistory />,
          label: t('publications.type.preprint'),
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
        };
      case 'report':
        return {
          icon: <FaClipboardList />,
          label: t('publications.type.report'),
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
        };
      case 'thesis':
        return {
          icon: <FaGraduationCap />,
          label: t('publications.type.thesis'),
          color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
        };
      case 'presentation':
        return {
          icon: <FaChalkboardTeacher />,
          label: t('publications.type.presentation'),
          color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800'
        };
      case 'abstract':
      default:
        return {
          icon: <FaFileAlt />,
          label: t('publications.type.abstract'),
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
        };
    }
  };

  const timeline: YearGroup[] = [
    {
      year: "2026",
      items: [
        {
          type: 'article',
          citation: t('publications.items.araujo_pnas_2026'),
          link: "https://doi.org/10.1073/pnas.2508989123"
        }
      ]
    },
    {
      year: "2025",
      items: [
        {
          type: 'article',
          citation: t('publications.items.araujo_rsos_2025'),
          link: "https://doi.org/10.1098/rsos.241261"
        },
        {
          type: 'article',
          citation: t('publications.items.freitas_idm_2025'),
          link: "https://doi.org/10.1016/j.idm.2025.07.014"
        },
        {
          type: 'report',
          citation: t('publications.items.coelho_imdc_report_2025'),
          link: "https://doi.org/10.5281/zenodo.17516518"
        },
        {
          type: 'thesis',
          citation: t('publications.items.almeida_thesis_2025'),
          link: "https://arca.fiocruz.br/items/0e2fbfe7-68e8-4350-bc46-e7f563d03ea1"
        },
        {
          type: 'presentation',
          citation: t('publications.items.carvalho_pres_2025')
        },
        {
          type: 'presentation',
          citation: t('publications.items.coelho_pres_2025')
        },
        {
          type: 'presentation',
          citation: t('publications.items.laiate_cnmac_2025')
        }
      ]
    },
    {
      year: "2024",
      items: [
        {
          type: 'article',
          citation: t('publications.items.magalhaes_eid_2024'),
          link: "https://doi.org/10.3201/eid3012.231733"
        },
        {
          type: 'preprint',
          citation: t('publications.items.bastos_arxiv_2024'),
          link: "https://doi.org/10.48550/arXiv.2411.13680"
        },
        {
          type: 'preprint',
          citation: t('publications.items.ganem_arxiv_2024'),
          link: "https://arxiv.org/abs/2410.18945"
        },
        {
          type: 'report',
          citation: t('publications.items.codeco_infodengue_2024'),
          link: "https://doi.org/10.5281/zenodo.13929005"
        },
        {
          type: 'thesis',
          citation: t('publications.items.santos_thesis_2024'),
          link: "https://emap.fgv.br/en/tese/analyzing-dengue-epidemic-dynamics-using-physics-informed-neural-networks"
        },
        {
          type: 'abstract',
          citation: t('publications.items.almeida_epi_2024'),
          link: "https://proceedings.science/epi-2024/trabalhos/perfis-de-transmissao-de-dengue-analise-dos-municipios-brasileiros-2010-2022?lang=pt-br"
        },
        {
          type: 'abstract',
          citation: t('publications.items.araujo_episcanner_2024'),
          link: "https://proceedings.science/epi-2024/trabalhos/episcanner-real-time-epidemic-scanner?lang=pt-br"
        },
        {
          type: 'abstract',
          citation: t('publications.items.araujo_mosqlimate_2024'),
          link: "https://proceedings.science/epi-2024/trabalhos/mosqlimate-a-platform-for-comparing-arboviral-diseases-forecasting-models?lang=pt-br"
        },
        {
          type: 'abstract',
          citation: t('publications.items.segundo_epi_2024'),
          link: "https://proceedings.science/epi-2024/trabalhos/modelos-de-decisao-para-testagem-de-casos-suspeitos-de-arboviroses-por-rl?lang=pt-br"
        }
      ]
    },
    {
      year: "2023",
      items: [
        {
          type: 'abstract',
          citation: t('publications.items.araujo_cnmac_2023'),
          link: "https://proceedings.sbmac.org.br/sbmac/article/view/4244"
        },
        {
          type: 'abstract',
          citation: t('publications.items.araujo_evigilancia_2023'),
          link: "https://e-vigilancia.dengue.mat.br/images/e_vigilancia_2023.pdf"
        },
        {
          type: 'presentation',
          citation: t('publications.items.coelho_evigilancia_2023')
        }
      ]
    }
  ];

  const datasets = [
    {
      title: t('publications.items.dataset_egg'),
      link: "https://doi.org/10.17632/jd5txz2f7d.2",
      year: "2024"
    },
    {
      title: t('publications.items.dataset_dengue'),
      link: "https://doi.org/10.5281/zenodo.13775186",
      year: "2024"
    },
    {
      title: t('publications.items.dataset_sprint'),
      link: "https://doi.org/10.5281/zenodo.13328231",
      year: "2024"
    },
    {
      title: t('publications.items.dataset_sprint_template'),
      link: "https://doi.org/10.5281/zenodo.13367301",
      year: "2024"
    }
  ];

  const softwares = [
    { title: t('publications.items.soft_mosqlient'), link: "https://github.com/Mosqlimate-project/mosqlimate-client", year: "2025" },
    { title: t('publications.items.soft_episcanner'), link: "https://info.dengue.mat.br/epi-scanner/", year: "2024" },
    { title: t('publications.items.soft_platform'), link: "https://doi.org/10.5281/zenodo.12744275", year: "2024" }
  ];

  const seminars = [
    { date: "06/02/2025", title: t('publications.items.sem_julie'), speaker: "Julie Souza, Ph.D. (FGV/EMAp)" },
    { date: "03/04/2025", title: t('publications.items.sem_caio'), speaker: "Caio Souza Rauh (UFBA)" },
    { date: "08/05/2025", title: t('publications.items.sem_davide'), speaker: "Davide Nicola (UniTo)" },
    { date: "05/06/2025", title: t('publications.items.sem_megan'), speaker: "Megan Naidoo (Univ. Barcelona)" },
    { date: "07/08/2025", title: t('publications.items.sem_eduardo'), speaker: "Eduardo Rosário (Unesp)", link: "https://www.youtube.com/watch?v=Nk4h7Hs13dQ" },
    { date: "04/09/2025", title: t('publications.items.sem_paulo'), speaker: "Paulo Ventura (Indiana Univ.)", link: "https://www.youtube.com/watch?v=kDAicR2BZ3o" },
    { date: "09/10/2025", title: t('publications.items.sem_chloe'), speaker: "Chloe Fletcher (BSC)", link: "https://www.youtube.com/watch?v=tSI_qYNC9Bk" }
  ];

  const webinars = [
    { title: t('publications.items.web_tghn'), link: "http://lac.tghn.org/actividades-y-eventos/webinarios-lac/dengue-predictive-models/", date: "2025" },
    { title: t('publications.items.web_imdc_res1'), link: "https://www.youtube.com/watch?v=YexrCASlqIE", date: "2025" },
    { title: t('publications.items.web_imdc_res2'), link: "https://www.youtube.com/watch?v=Sb3lv3hGwGg", date: "2025" },
    { title: t('publications.items.web_imdc_2026'), link: "https://www.youtube.com/watch?v=mXTe6UC-7WM", date: "2025" }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-20">

        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('publications.title')}
          </h1>
          <p className="text-lg opacity-70 max-w-2xl mx-auto leading-relaxed">
            {t('publications.subtitle')}
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link
              href="https://www.youtube.com/@Mosqlimate"
              target="_blank"
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all hover:scale-105 shadow-md font-medium text-sm"
            >
              <FaYoutube className="text-lg" /> {t('publications.youtube_channel')}
            </Link>
          </div>
        </div>

        <div className="space-y-12 relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-800" />

          {timeline.map((group, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-16 md:pl-20"
            >
              <div className="absolute left-0 top-0 flex items-center justify-center w-14 h-14 rounded-full bg-blue-500 text-white font-bold text-sm shadow-lg border-4 border-[var(--color-bg)] z-10">
                {group.year}
              </div>

              <div className="space-y-6">
                {group.items.map((item, iIdx) => {
                  const typeInfo = getTypeInfo(item.type);
                  return (
                    <div
                      key={iIdx}
                      className="bg-white dark:bg-white/5 p-5 rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold uppercase tracking-wide border ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </div>

                      <p className="text-[15px] leading-relaxed opacity-90 text-justify">
                        {item.citation}
                      </p>

                      {item.link && (
                        <div className="mt-4 pt-3 border-t border-dashed border-[var(--color-border)] flex justify-end">
                          <Link
                            href={item.link}
                            target="_blank"
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                          >
                            {t('publications.view_source')} <FaExternalLinkAlt size={10} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] my-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <FaDatabase />
              </span>
              {t('publications.datasets.title')}
            </h2>
            <ul className="space-y-3">
              {datasets.map((ds, idx) => (
                <li key={idx}>
                  <Link
                    href={ds.link}
                    target="_blank"
                    className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {ds.title}
                      </span>
                      <FaExternalLinkAlt className="opacity-0 group-hover:opacity-100 transition-opacity text-xs mt-1" />
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{ds.year}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-5"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <FaGithub />
              </span>
              {t('publications.software.title')}
            </h2>
            <ul className="space-y-3">
              {softwares.map((sw, idx) => (
                <li key={idx}>
                  <Link
                    href={sw.link}
                    target="_blank"
                    className="flex flex-col p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {sw.title}
                      </span>
                      <FaExternalLinkAlt className="opacity-0 group-hover:opacity-100 transition-opacity text-xs mt-1" />
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{sw.year}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="border-t border-[var(--color-border)] my-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
              <FaVideo />
            </span>
            <h2 className="text-2xl font-bold">
              {t('publications.seminars.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold opacity-80 flex items-center gap-2">
                <FaLaptopCode className="text-orange-500" /> Webinários IMDC & Parceiros
              </h3>
              <div className="space-y-3">
                {webinars.map((web, idx) => (
                  <Link
                    key={idx}
                    href={web.link}
                    target="_blank"
                    className="block p-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 hover:border-orange-300 transition-colors"
                  >
                    <h4 className="font-medium text-sm text-orange-900 dark:text-orange-100 mb-1">{web.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300">
                      <FaYoutube /> {t('publications.seminars.webinar.link_text')}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold opacity-80 flex items-center gap-2">
                <FaChalkboardTeacher className="text-green-500" /> {t('publications.seminars.series_title')}
              </h3>
              <div className="space-y-3">
                {seminars.map((sem, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-[var(--color-border)] flex gap-4 items-center">
                    <div className="flex flex-col items-center justify-center min-w-[3rem] h-12 bg-white dark:bg-black/30 rounded border border-[var(--color-border)]">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        {sem.date.split('/')[1]}
                      </span>
                      <span className="text-sm font-bold">{sem.date.split('/')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight truncate" title={sem.title}>{sem.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs opacity-60 truncate">{sem.speaker}</p>
                        {sem.link && (
                          <Link href={sem.link} target="_blank" className="text-red-500 hover:text-red-600">
                            <FaYoutube size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
