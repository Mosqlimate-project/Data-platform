import os
from django.test.runner import DiscoverRunner


HISTORICO_ALERTA_DDL = """
CREATE TABLE IF NOT EXISTS "Historico_alerta" (
    id serial PRIMARY KEY,
    "data_iniSE" date NOT NULL,
    "SE" integer NOT NULL,
    "casos_est" double precision,
    "casos_est_min" integer,
    "casos_est_max" integer,
    "casos" integer,
    "municipio_geocodigo" integer NOT NULL,
    "p_rt1" double precision,
    "p_inc100k" double precision,
    "Localidade_id" integer,
    "nivel" smallint,
    "versao_modelo" varchar(40),
    "municipio_nome" varchar(128),
    "tweet" numeric(5,0),
    "Rt" double precision,
    "pop" numeric(10,0),
    "tempmin" numeric(10,2),
    "umidmax" numeric(10,2),
    "receptivo" smallint,
    "transmissao" smallint,
    "nivel_inc" smallint,
    "umidmed" numeric(10,2),
    "umidmin" numeric(10,2),
    "tempmed" numeric(10,2),
    "tempmax" numeric(10,2),
    "casprov" integer,
    "casprov_est" double precision,
    "casprov_est_min" integer,
    "casprov_est_max" integer,
    "casconf" integer
);
"""

SIR_PARAMS_DDL = """
CREATE TABLE IF NOT EXISTS episcanner.sir_params (
    id serial PRIMARY KEY,
    "cid10" varchar(10) NOT NULL,
    "geocode" varchar(20) NOT NULL,
    "year" integer NOT NULL,
    "ep_ini" varchar(20),
    "ep_pw" varchar(20) NOT NULL,
    "ep_end" varchar(20),
    "ep_dur" integer,
    "peak_week" double precision NOT NULL,
    "beta" double precision NOT NULL,
    "gamma" double precision NOT NULL,
    "r0" double precision NOT NULL,
    "total_cases" double precision NOT NULL,
    "alpha" double precision NOT NULL,
    "sum_res" double precision NOT NULL,
    "t_ini" integer,
    "t_end" integer
);
"""


COPERNICUS_BRASIL_DDL = """
CREATE TABLE IF NOT EXISTS copernicus_bra (
    "date" date PRIMARY KEY,
    "geocode" bigint NOT NULL,
    "epiweek" integer NOT NULL,
    "temp_min" double precision,
    "temp_med" double precision,
    "temp_max" double precision,
    "precip_min" double precision,
    "precip_med" double precision,
    "precip_max" double precision,
    "precip_tot" double precision,
    "pressao_min" double precision,
    "pressao_med" double precision,
    "pressao_max" double precision,
    "umid_min" double precision,
    "umid_med" double precision,
    "umid_max" double precision
);
"""


class SimpleTestRunner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")
        result = super().setup_databases(**kwargs)
        self._install_extensions()
        self._create_unmanaged_tables()
        return result

    def _install_extensions(self):
        from django.db import connections

        cursor = connections["default"].cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS btree_gin")

    def _create_unmanaged_tables(self):
        from django.db import connections

        cursor = connections["default"].cursor()
        cursor.execute("CREATE SCHEMA IF NOT EXISTS episcanner")
        cursor.execute(HISTORICO_ALERTA_DDL)
        cursor.execute(
            HISTORICO_ALERTA_DDL.replace(
                '"Historico_alerta"', '"Historico_alerta_chik"'
            )
        )
        cursor.execute(
            HISTORICO_ALERTA_DDL.replace(
                '"Historico_alerta"', '"Historico_alerta_zika"'
            )
        )
        cursor.execute(SIR_PARAMS_DDL)
        cursor.execute(COPERNICUS_BRASIL_DDL)
        self._seed_test_data(cursor)

    def _seed_test_data(self, cursor):
        from datetime import date

        today = date.today()
        cursor.execute(
            "INSERT INTO copernicus_bra "
            '("date", "geocode", "epiweek", "temp_min", "temp_med", '
            '"temp_max", "precip_min", "precip_med", "precip_max", '
            '"precip_tot", "pressao_min", "pressao_med", "pressao_max", '
            '"umid_min", "umid_med", "umid_max") '
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT DO NOTHING",
            [
                today,
                3304557,
                202601,
                20.0,
                25.0,
                30.0,
                0.0,
                5.0,
                10.0,
                15.0,
                1013.0,
                1015.0,
                1017.0,
                60.0,
                70.0,
                80.0,
            ],
        )

        cursor.execute(
            'INSERT INTO "Historico_alerta" '
            '("data_iniSE", "SE", "municipio_geocodigo", "casos", '
            '"casos_est", "transmissao", "Rt", "p_rt1") '
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT DO NOTHING",
            [today, 202601, 2300101, 100, 95.0, 2, 1.2, 0.8],
        )
