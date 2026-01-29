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
  FaGraduationCap
} from 'react-icons/fa';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

type PubType = 'abstract' | 'article' | 'preprint' | 'thesis';

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
        return { icon: <FaNewspaper />, label: 'Journal Article', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
      case 'preprint':
        return { icon: <FaHistory />, label: 'Preprint', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
      case 'thesis':
        return { icon: <FaGraduationCap />, label: 'Thesis', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
      case 'abstract':
      default:
        return { icon: <FaFileAlt />, label: 'Abstract/Conference', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  const timeline: YearGroup[] = [
    {
      year: "2025",
      items: [
        {
          type: 'article',
          citation: t('publications.items.araujo_rsos_2025'),
          link: "https://doi.org/10.1098/rsos.241261"
        },
        {
          type: 'preprint',
          citation: t('publications.items.araujo_medrxiv_2025'),
          link: "https://www.medrxiv.org/content/10.1101/2025.05.12.25327419v1"
        },
        {
          type: 'preprint',
          citation: t('publications.items.freitas_medrxiv_2025'),
          link: "https://www.medrxiv.org/content/10.1101/2025.06.12.25329525v1"
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
          citation: t('publications.items.ganem_arxiv_2024'),
          link: "https://arxiv.org/abs/2410.18945"
        },
        {
          type: 'preprint',
          citation: t('publications.items.bastos_arxiv_2024'),
          link: "https://doi.org/10.48550/arXiv.2411.13680"
        },
        {
          type: 'thesis',
          citation: t('publications.items.santos_thesis_2024'),
          link: "https://emap.fgv.br/en/tese/analyzing-dengue-epidemic-dynamics-using-physics-informed-neural-networks"
        },
        {
          type: 'abstract',
          citation: t('publications.items.almeida_epi_2024'),
        },
        {
          type: 'abstract',
          citation: t('publications.items.araujo_epi_2024'),
        },
        {
          type: 'abstract',
          citation: t('publications.items.segundo_epi_2024'),
        }
      ]
    },
    {
      year: "2023",
      items: [
        {
          type: 'abstract',
          citation: t('publications.items.araujo_cnmac_2023'),
        },
        {
          type: 'abstract',
          citation: t('publications.items.araujo_evigilancia_2023'),
        }
      ]
    }
  ];

  const datasets = [
    {
      title: t('publications.items.dataset_egg'),
      link: "https://data.mendeley.com/datasets/jd5txz2f7d/2"
    },
    {
      title: t('publications.items.dataset_sprint'),
      link: "https://zenodo.org/records/13328231"
    },
    {
      title: t('publications.items.dataset_dengue'),
      link: "https://zenodo.org/records/13775186"
    }
  ];

  const softwares = [
    { title: t('publications.items.soft_platform'), link: "https://api.mosqlimate.org/api/docs" },
    { title: t('publications.items.soft_client'), link: "https://zenodo.org/records/15270486" },
    { title: t('publications.items.soft_episcanner'), link: "https://info.dengue.mat.br/epi-scanner/" }
  ];

  const seminars = [
    { date: "06/02", title: t('publications.items.sem_julie'), speaker: "Julie Souza, Ph.D. (FGV/EMAp)" },
    { date: "03/04", title: t('publications.items.sem_caio'), speaker: "Caio Souza Rauh (Universidade Federal da Bahia)" },
    { date: "08/05", title: t('publications.items.sem_davide'), speaker: "Davide Nicola (Universit degli Studi di Torino)" },
    { date: "05/06", title: t('publications.items.sem_megan'), speaker: "Megan Naidoo (University of Barcelona)" }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-16">

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('publications.title')}</h1>
          <p className="text-lg opacity-60 max-w-2xl mx-auto">
            {t('publications.subtitle')}
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link
              href="https://www.youtube.com/@Mosqlimate"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors font-medium"
            >
              <FaYoutube /> {t('publications.youtube_channel')}
            </Link>
          </div>
        </div>

        <div className="space-y-12">
          {timeline.map((group, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-8 border-l-2 border-blue-500/30"
            >
              <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[var(--color-bg)]" />
              <h2 className="text-2xl font-bold mb-6 text-blue-600 dark:text-blue-400">{group.year}</h2>

              <div className="space-y-4">
                {group.items.map((item, iIdx) => {
                  const typeInfo = getTypeInfo(item.type);
                  return (
                    <div key={iIdx} className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-[var(--color-border)] hover:border-blue-500/50 transition-colors">
                      <div className="flex items-start gap-3 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 font-medium ${typeInfo.color}`}>
                          {typeInfo.icon}
                          {typeInfo.label}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed opacity-90">
                        {item.citation}
                      </p>
                      {item.link && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                          <Link
                            href={item.link}
                            target="_blank"
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 w-fit"
                          >
                            <FaExternalLinkAlt size={10} /> {t('publications.view_source')}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <FaDatabase className="text-purple-500" /> {t('publications.datasets.title')}
            </h2>
            <ul className="space-y-3">
              {datasets.map((ds, idx) => (
                <li key={idx}>
                  <Link
                    href={ds.link}
                    target="_blank"
                    className="block p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group"
                  >
                    <span className="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center justify-between">
                      {ds.title}
                      <FaExternalLinkAlt className="opacity-0 group-hover:opacity-100 transition-opacity text-xs" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <FaGithub className="text-gray-700 dark:text-gray-300" /> {t('publications.software.title')}
            </h2>
            <ul className="space-y-3">
              {softwares.map((sw, idx) => (
                <li key={idx}>
                  <Link
                    href={sw.link}
                    target="_blank"
                    className="block p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-[var(--color-border)] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                  >
                    <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
                      {sw.title}
                      <FaExternalLinkAlt className="opacity-0 group-hover:opacity-100 transition-opacity text-xs" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaVideo className="text-red-500" /> {t('publications.seminars.title')}
            </h2>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 text-orange-800 dark:text-orange-200">
              {t('publications.seminars.webinar.title')}
            </h3>
            <Link
              href="https://lac.tghn.org/actividades-y-eventos/webinarios-lac/dengue-predictive-models/"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
            >
              {t('publications.seminars.webinar.link_text')} <FaExternalLinkAlt size={12} />
            </Link>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold opacity-80">{t('publications.seminars.series_title')}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {seminars.map((sem, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg border border-[var(--color-border)] flex gap-4">
                  <div className="flex flex-col items-center justify-center min-w-[3.5rem] bg-white dark:bg-black/30 rounded border border-[var(--color-border)] h-14">
                    <span className="text-xs font-bold uppercase text-gray-500">{sem.date.split('/')[1] === '02' ? 'FEB' : sem.date.split('/')[1] === '04' ? 'APR' : sem.date.split('/')[1] === '05' ? 'MAY' : 'JUN'}</span>
                    <span className="text-lg font-bold">{sem.date.split('/')[0]}</span>
                  </div>
                  <div>
                    <h4 className="font-bold leading-tight">{sem.title}</h4>
                    <p className="text-sm opacity-60 mt-1">{sem.speaker}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
