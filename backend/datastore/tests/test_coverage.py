from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from django.test import Client, TestCase, TransactionTestCase
from django.core.cache import cache
from users.models import CustomUser

from datastore import models as m
from datastore import filters as dtf
from datastore import routers as dtr
from datastore import schema as dts
from datastore import tasks as dt_tasks
from datastore.utils import fetch_icd


def _run_awaitable(fn):
    def wrapper(*args, **kwargs):
        import asyncio

        return asyncio.run(fn(*args, **kwargs))

    return wrapper


class DataStoreBase(TestCase):
    databases = {"default", "infodengue"}

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = CustomUser.objects.create_user(
            username="dsuser",
            email="ds@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth = {"HTTP_X_UID_KEY": self.user.api_key()}


class VegetationAPITest(DataStoreBase):
    def test_vegetation_success(self):
        r = self.client.get("/api/datastore/vegetation/", **self.auth)
        self.assertEqual(r.status_code, 200)

    def test_vegetation_with_uf(self):
        r = self.client.get(
            "/api/datastore/vegetation/", {"uf": "SP"}, **self.auth
        )
        self.assertEqual(r.status_code, 200)

    def test_vegetation_unknown_uf(self):
        r = self.client.get(
            "/api/datastore/vegetation/", {"uf": "ZZ"}, **self.auth
        )
        self.assertEqual(r.status_code, 422)


class InfodengueAPITest(DataStoreBase):
    def test_infodengue_dengue(self):
        r = self.client.get(
            "/api/datastore/infodengue/", {"disease": "dengue"}, **self.auth
        )
        self.assertEqual(r.status_code, 200)

    def test_infodengue_zika(self):
        r = self.client.get(
            "/api/datastore/infodengue/", {"disease": "zika"}, **self.auth
        )
        self.assertEqual(r.status_code, 200)

    def test_infodengue_unknown_disease(self):
        r = self.client.get(
            "/api/datastore/infodengue/",
            {"disease": "dengue", "geocode": 123},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_infodengue_invalid_uf(self):
        r = self.client.get(
            "/api/datastore/infodengue/",
            {"disease": "dengue", "uf": "ZZ"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 422)

    def test_infodengue_valid_uf(self):
        r = self.client.get(
            "/api/datastore/infodengue/",
            {"disease": "dengue", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_get_infodengue_queryset_chik(self):
        qs = __import__(
            "datastore.api", fromlist=["get_infodengue_queryset"]
        ).get_infodengue_queryset("chik")
        self.assertIsNotNone(qs)

    def test_get_infodengue_queryset_unknown(self):
        qs = __import__(
            "datastore.api", fromlist=["get_infodengue_queryset"]
        ).get_infodengue_queryset("covid")
        self.assertIsNone(qs)

    def test_get_infodengue_queryset_invalid_uf(self):
        from datastore.api import get_infodengue_queryset

        with self.assertRaises(ValueError):
            get_infodengue_queryset("dengue", uf="ZZ")


class ClimateWeeklyAPITest(DataStoreBase):
    def test_weekly_geocode(self):
        m.Municipio.objects.using("infodengue").create(
            geocodigo=3304557, nome="Rio", uf="RJ", regional_code=1
        )
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"geocode": 3304557, "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_weekly_no_params_400(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_multiple_params_400(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"geocode": 3304557, "uf": "SP", "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_invalid_week(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"geocode": 3304557, "start": 202499, "end": 202499},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_uf_unknown_state(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"uf": "SP", "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_uf_success(self):
        from vis.brasil.models import Macroregion, State

        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        m.Adm1.objects.create(
            geocode="33", name="Rio de Janeiro", country=adm0
        )
        State.objects.create(
            uf="RJ",
            name="Rio de Janeiro",
            macroregion=Macroregion.objects.create(
                geocode="1", name="Sudeste"
            ),
        )
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"uf": "RJ", "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_weekly_no_precip_fixed(self):
        m.Municipio.objects.using("infodengue").create(
            geocodigo=3304557, nome="Rio", uf="RJ", regional_code=1
        )
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {
                "geocode": 3304557,
                "start": 202401,
                "end": 202402,
                "precip_fixed": False,
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)


class MosquitoAPITest(DataStoreBase):
    def test_mosquito_success_list(self):
        with patch("datastore.api.requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = [
                {
                    "counting_id": 1,
                    "date": "2024-01-07",
                    "eggs": 1,
                    "date_collect": "2024-01-07",
                    "latitude": 1.5,
                    "longitude": 2.5,
                    "municipality": "Rio",
                    "municipality_code": "3304557",
                    "ovitrap_id": "t",
                    "ovitrap_website_id": 1,
                    "state_code": "33",
                    "state_name": "RJ",
                    "time": "2024-01-07 10:00:00",
                    "week": 1,
                    "year": 2024,
                }
            ]
            r = self.client.get(
                "/api/datastore/mosquito/",
                {
                    "date_start": "2024-01-01",
                    "date_end": "2024-01-31",
                    "page": 1,
                },
                **self.auth,
            )
        self.assertEqual(r.status_code, 200)

    def test_mosquito_non_list_402(self):
        with patch("datastore.api.requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"error": "x"}
            r = self.client.get(
                "/api/datastore/mosquito/",
                {
                    "date_start": "2024-01-01",
                    "date_end": "2024-01-31",
                    "page": 1,
                },
                **self.auth,
            )
        self.assertEqual(r.status_code, 402)

    def test_mosquito_error_json(self):
        with patch("datastore.api.requests.get") as mock_get:
            mock_get.return_value.status_code = 500
            mock_get.return_value.json.return_value = "boom"
            r = self.client.get(
                "/api/datastore/mosquito/",
                {
                    "date_start": "2024-01-01",
                    "date_end": "2024-01-31",
                    "page": 1,
                },
                **self.auth,
            )
        self.assertEqual(r.status_code, 500)

    def test_mosquito_error_text(self):
        with patch("datastore.api.requests.get") as mock_get:
            mock_get.return_value.status_code = 500
            mock_get.return_value.json.side_effect = Exception
            mock_get.return_value.text = "plain error"
            r = self.client.get(
                "/api/datastore/mosquito/",
                {
                    "date_start": "2024-01-01",
                    "date_end": "2024-01-31",
                    "page": 1,
                },
                **self.auth,
            )
        self.assertEqual(r.status_code, 500)


class EpiscannerAPITest(DataStoreBase):
    def test_episcanner_cache_hit(self):
        cache.set(
            "episcanner:dengue:SP:2024",
            [
                {
                    "disease": "dengue",
                    "CID10": "A90",
                    "year": 2024,
                    "geocode": 3304557,
                    "muni_name": "Rio",
                    "peak_week": 1.0,
                    "beta": 2.0,
                    "gamma": 3.0,
                    "R0": 4.0,
                    "total_cases": 5.0,
                    "alpha": 6.0,
                    "sum_res": 7.0,
                    "ep_ini": "2024-01-01",
                    "ep_end": "2024-12-31",
                    "ep_dur": 1,
                }
            ],
        )
        r = self.client.get(
            "/api/datastore/episcanner/",
            {"disease": "dengue", "uf": "SP", "year": 2024},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_episcanner_no_cache(self):
        r = self.client.get(
            "/api/datastore/episcanner/",
            {"disease": "dengue", "uf": "SP", "year": 2024},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_parameters_empty_years(self):
        r = self.client.get(
            "/api/datastore/episcanner/parameters/",
            {"disease": "dengue", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_timeseries_year_zero(self):
        r = self.client.get(
            "/api/datastore/episcanner/timeseries/",
            {"disease": "dengue", "geocode": 9999999, "year": 0},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_top_cities(self):
        r = self.client.get(
            "/api/datastore/episcanner/top-cities/",
            {"disease": "dengue", "uf": "SP", "limit": 5},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_maps_weeks(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/weeks/",
            {"disease": "dengue", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_maps_r0(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/r0/",
            {"disease": "dengue", "uf": "SP", "year": 2024},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_model_eval_no_ratios(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/model-eval/",
            {"disease": "dengue", "uf": "SP", "year": 2024},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)


class ChartsAPITest(DataStoreBase):
    def test_charts_rt(self):
        r = self.client.get(
            "/api/datastore/charts/infodengue/rt/",
            {
                "disease": "dengue",
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_charts_rt_unknown_disease(self):
        r = self.client.get(
            "/api/datastore/charts/infodengue/rt/",
            {
                "disease": "covid",
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 404)

    def test_charts_total_cases(self):
        r = self.client.get(
            "/api/datastore/charts/infodengue/total-cases/",
            {
                "disease": "dengue",
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_charts_temperature(self):
        r = self.client.get(
            "/api/datastore/charts/climate/temperature/",
            {"geocode": 3304557, "start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_charts_waterfall_precip(self):
        r = self.client.get(
            "/api/datastore/charts/climate/accumulated-waterfall/",
            {
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
                "precip_fixed": "true",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_charts_waterfall_no_precip(self):
        r = self.client.get(
            "/api/datastore/charts/climate/accumulated-waterfall/",
            {
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
                "precip_fixed": "false",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_charts_umid(self):
        r = self.client.get(
            "/api/datastore/charts/climate/umid-pressao-med/",
            {"geocode": 3304557, "start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_contaovos_eggs(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_contaovos_eggs_uf(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2024-01-31", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_contaovos_positivity(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/positivity/",
            {"start": "2024-01-01", "end": "2024-01-31", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_contaovos_map(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/map/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_contaovos_scatter(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/map/scatter/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)


class SearchAPITest(DataStoreBase):
    def test_diseases(self):
        r = self.client.get(
            "/api/datastore/diseases/",
            {"icd": "ICD-10", "version": "2019"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_cities(self):
        r = self.client.get(
            "/api/datastore/cities/", {"name": "Rio"}, **self.auth
        )
        self.assertEqual(r.status_code, 200)

    def test_cities_no_adm0(self):
        r = self.client.get(
            "/api/datastore/cities/",
            {"adm_0": "", "name": "Rio"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)


class RoutersTest(TestCase):
    def test_routers_importable(self):
        self.assertIsNotNone(
            dtr.EpiscannerRouter().db_for_read(m.EpiscannerSirParams)
        )
        self.assertIsNone(dtr.EpiscannerRouter().db_for_read(m.Adm0))
        self.assertIsNotNone(
            dtr.VegetationIndicesRouter().db_for_read(m.VegetationIndexMetric)
        )
        self.assertIsNotNone(
            dtr.WeatherRouter().db_for_read(m.CopernicusBrasil)
        )
        self.assertIsNotNone(
            dtr.MunicipioRouter().db_for_read(m.HistoricoAlerta)
        )
        self.assertIsNotNone(dtr.DengueGlobalRouter().db_for_read(m.Municipio))
        self.assertIsNone(dtr.WeatherRouter().db_for_read(m.Adm0))


class FiltersTest(TestCase):
    def test_vegetation_filter_defaults(self):
        f = dtf.VegetationIndexMetricFilterSchema()
        self.assertEqual(f.start, "2024-01-01")

    def test_copernicus_weekly_epiweek_length(self):
        with self.assertRaises(Exception):
            dtf.CopernicusBrasilWeeklyFilterSchema(start=2024, end=202402)

    def test_disease_filter_name(self):
        f = dtf.DiseaseFilterSchema(name="dengue")
        q = f.filter_name("dengue")
        self.assertIsNotNone(q)

    def test_adm2_filter_name(self):
        f = dtf.Adm2FilterSchema(name="Rio")
        q = f.filter_name("Rio")
        self.assertIsNotNone(q)


class TasksTest(TestCase):
    def test_contaovos_schema_valid(self):
        s = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time="2024-01-07 10:00:00+00:00",
            week=1,
            year=2024,
        )
        self.assertEqual(s.eggs, 1)

    def test_contaovos_schema_latitude_out_of_bounds(self):
        with self.assertRaises(Exception):
            dt_tasks.ContaOvosSchema(
                counting_id=1,
                date=date(2024, 1, 7),
                date_collect=date(2024, 1, 7),
                eggs=1,
                latitude=Decimal("100"),
                longitude=Decimal("2.5"),
                municipality="Rio",
                municipality_code="3304557",
                ovitrap_id="t",
                ovitrap_website_id=1,
                state_code="33",
                state_name="RJ",
                time="2024-01-07 10:00:00+00:00",
                week=1,
                year=2024,
            )

    def test_contaovos_schema_missing_date_collect(self):
        with self.assertRaises(Exception):
            dt_tasks.ContaOvosSchema(
                counting_id=1,
                date=date(2024, 1, 7),
                date_collect=None,
                eggs=1,
                latitude=Decimal("1.5"),
                longitude=Decimal("2.5"),
                municipality="Rio",
                municipality_code="3304557",
                ovitrap_id="t",
                ovitrap_website_id=1,
                state_code="33",
                state_name="RJ",
                time="2024-01-07 10:00:00+00:00",
                week=1,
                year=2024,
            )

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_no_data(self, mock_get, mock_ats):
        mock_get.return_value = []
        result = dt_tasks.sync_contaovos_for_date("2024-01-07")
        self.assertIn("No data", result)

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_creates(self, mock_get, mock_ats):
        m.Adm2.objects.create(
            geocode="3304557",
            name="Rio",
            adm1=m.Adm1.objects.create(
                geocode="33",
                name="Rio",
                country=m.Adm0.objects.create(geocode="BRA", name="Brasil"),
            ),
        )
        item = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time="2024-01-07 10:00:00+00:00",
            week=1,
            year=2024,
        )
        mock_get.return_value = [item]
        result = dt_tasks.sync_contaovos_for_date("2024-01-07")
        self.assertIn("1 created", result)

    def test_backfill_start_after_end(self):
        with self.assertRaises(ValueError):
            dt_tasks.backfill_contaovos("2024-02-01", "2024-01-01")

    @patch("datastore.tasks.group")
    def test_backfill(self, mock_group):
        mock_group.return_value.delay.return_value = MagicMock(id="g1")
        result = dt_tasks.backfill_contaovos("2024-01-01", "2024-01-03")
        self.assertEqual(result["days"], 3)


class FetchICDTest(TestCase):
    @patch("datastore.utils.fetch_icd.httpx.AsyncClient")
    def test_get_auth_token(self, mock_client):
        import asyncio

        resp = MagicMock()
        resp.json.return_value = {"access_token": "tok"}
        mock_client.return_value.__aenter__.return_value.post.return_value = (
            resp
        )
        token = asyncio.run(fetch_icd.get_auth_token("cid", "secret"))
        self.assertEqual(token, "tok")

    def test_parse_disease(self):
        d = fetch_icd.parse_disease(
            {
                "code": "A90",
                "title": {"@value": "Dengue"},
                "definition": {"@value": "desc"},
            }
        )
        self.assertEqual(d.code, "A90")
        self.assertEqual(d.name, "Dengue")

    def test_parse_disease_plain_title(self):
        d = fetch_icd.parse_disease({"code": "B", "title": "Other"})
        self.assertEqual(d.name, "Other")

    def test_parse_disease_missing(self):
        self.assertIsNone(fetch_icd.parse_disease({"code": "A90"}))

    @patch("datastore.utils.fetch_icd.httpx.AsyncClient")
    def test_worker(self, mock_client):
        import asyncio
        from unittest.mock import AsyncMock

        async def run():
            q = asyncio.Queue()
            rq = asyncio.Queue()
            await q.put("http://example.com/disease")
            resp = MagicMock()
            resp.status_code = 200
            resp.json.return_value = {
                "code": "A90",
                "title": "Dengue",
                "child": [],
            }
            client = mock_client.return_value
            client.get = AsyncMock(return_value=resp)
            task = asyncio.create_task(
                fetch_icd.worker("w", q, rq, "tok", client, "en")
            )
            item = await asyncio.wait_for(rq.get(), 5)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            return item

        item = asyncio.run(run())
        self.assertEqual(item.code, "A90")

    @patch("datastore.utils.fetch_icd.worker")
    @patch("datastore.utils.fetch_icd.get_auth_token", new_callable=MagicMock)
    @patch("datastore.utils.fetch_icd.httpx.AsyncClient")
    @patch("datastore.utils.fetch_icd.MAX_WORKERS", 1)
    def test_get_diseases(self, mock_client, mock_token, mock_worker):
        import asyncio

        async def fake_token(*a, **k):
            return "tok"

        mock_token.side_effect = fake_token

        async def fake_worker(name, q, rq, token, client, language):
            await q.get()
            await rq.put(fetch_icd.DiseaseSchema(code="A90", name="Dengue"))
            q.task_done()

        mock_worker.side_effect = fake_worker

        async def run():
            out = []
            async for d in fetch_icd.get_diseases(
                "http://example.com/root", "cid", "secret"
            ):
                out.append(d)
            return out

        out = asyncio.run(run())
        self.assertEqual(len(out), 1)


class DataStoreModelsTest(TestCase):
    def test_vegetation_str(self):
        v = m.VegetationIndexMetric(
            date=date(2024, 1, 1), geocode=1, collection="c", attribute="a"
        )
        self.assertIn("c", str(v))

    def test_contaovos_str(self):
        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(geocode="33", name="Rio", country=adm0)
        adm2 = m.Adm2.objects.create(
            geocode="3304557", name="RioCity", adm1=adm1
        )
        c = m.ContaOvos(counting_id=5, adm2=adm2, date=date(2024, 1, 1))
        self.assertIn("5", str(c))

    def test_adm0_adm1_adm2_str(self):
        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(geocode="33", name="Rio", country=adm0)
        adm2 = m.Adm2.objects.create(
            geocode="3304557", name="RioCity", adm1=adm1
        )
        self.assertEqual(str(adm0), "Brasil (BRA)")
        self.assertEqual(str(adm1), "Rio")
        self.assertEqual(str(adm2), "RioCity")
        self.assertEqual(adm2.country, adm0)


class ICDModelTest(TestCase):
    def setUp(self):
        self.icd10 = m.ICD.objects.create(system="ICD-10", version="2010")
        self.icd11 = m.ICD.objects.create(system="ICD-11", version="2024-01")
        self.icd_unknown = m.ICD.objects.create(system="ICD-9", version="x")

    def test_str(self):
        self.assertEqual(str(self.icd10), "ICD-10 (2010)")

    def test_year(self):
        self.assertEqual(self.icd10.year, 2010)
        self.assertEqual(self.icd11.year, 2024)

    def test_year_unknown(self):
        with self.assertRaises(ValueError):
            self.icd_unknown.year

    def test_fetch_diseases_unknown_system(self):
        with self.assertRaises(ValueError):
            self.icd_unknown.fetch_diseases("cid", "secret")

    @patch("datastore.models.get_diseases")
    def test_fetch_diseases(self, mock_get):
        async def gen():
            yield fetch_icd.DiseaseSchema(code="A90", name="Dengue")

        mock_get.return_value.__aiter__ = lambda self: gen().__aiter__()
        mock_get.return_value.__anext__ = gen().__anext__
        with patch(
            "datastore.models.async_to_sync",
            side_effect=_run_awaitable,
        ), patch(
            "datastore.models.Disease.objects.abulk_create",
            new_callable=AsyncMock,
        ):
            self.icd10.fetch_diseases("cid", "secret")


class SchemaValidatorsTest(TestCase):
    def test_weekly_params_geocode_length(self):
        with self.assertRaises(Exception):
            dts.CopernicusBrasilWeeklyParams(geocode=123)

    def test_weekly_params_macro_code(self):
        with self.assertRaises(Exception):
            dts.CopernicusBrasilWeeklyParams(macro_health_code=123)

    def test_weekly_params_uf(self):
        with self.assertRaises(Exception):
            dts.CopernicusBrasilWeeklyParams(uf="ZZ")


class MoreAPIbranchesTest(DataStoreBase):
    def test_climate_with_uf(self):
        r = self.client.get(
            "/api/datastore/climate/",
            {"start": "2024-01-01", "end": "2024-01-31", "uf": "SP"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_climate_no_precip_fixed(self):
        r = self.client.get(
            "/api/datastore/climate/",
            {
                "start": "2024-01-01",
                "end": "2024-01-31",
                "geocode": 3304557,
                "precip_fixed": False,
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_weekly_macro_health_not_found(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"macro_health_code": "9999", "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_municipio_not_found(self):
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"geocode": 9999999, "start": 202401, "end": 202402},
            **self.auth,
        )
        self.assertEqual(r.status_code, 400)

    def test_weekly_swap_weeks(self):
        m.Municipio.objects.using("infodengue").create(
            geocodigo=3304557, nome="Rio", uf="RJ", regional_code=1
        )
        r = self.client.get(
            "/api/datastore/climate/weekly/",
            {"geocode": 3304557, "start": 202402, "end": 202401},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_total_cases_unknown_disease(self):
        r = self.client.get(
            "/api/datastore/charts/infodengue/total-cases/",
            {
                "disease": "covid",
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
            },
            **self.auth,
        )
        self.assertEqual(r.status_code, 404)

    def test_alert_helpers(self):
        from datastore.api import (
            _get_alert_geocodes_for_uf,
            _get_alert_queryset,
        )

        with self.assertRaises(Exception):
            _get_alert_geocodes_for_uf("ZZ")
        with self.assertRaises(Exception):
            _get_alert_queryset("covid")


class TasksGetContaovosTest(TestCase):
    @patch("datastore.tasks.httpx.AsyncClient")
    def test_get_contaovos_breaks_on_empty(self, mock_client):
        import asyncio

        async def fake_get(url, params=None):
            return MagicMock(status_code=200, json=lambda: [])

        client = mock_client.return_value.__aenter__.return_value
        client.get.side_effect = fake_get
        items = asyncio.run(dt_tasks.get_contaovos(date(2024, 1, 7)))
        self.assertEqual(items, [])

    @patch("datastore.tasks.httpx.AsyncClient")
    def test_get_contaovos_rate_limit(self, mock_client):
        import asyncio

        responses = [
            MagicMock(status_code=429),
            MagicMock(status_code=200, json=lambda: []),
        ]
        client = mock_client.return_value.__aenter__.return_value
        client.get.side_effect = responses
        with patch("datastore.tasks.asyncio.sleep"):
            items = asyncio.run(dt_tasks.get_contaovos(date(2024, 1, 7)))
        self.assertEqual(items, [])

    @patch("datastore.tasks.httpx.AsyncClient")
    def test_get_contaovos_skips_invalid(self, mock_client):
        import asyncio

        resp = MagicMock(
            status_code=200,
            json=lambda: [
                {
                    "counting_id": 1,
                    "date": "2024-01-07",
                    "date_collect": "2024-01-07",
                    "eggs": 1,
                    "latitude": 1.5,
                    "longitude": 2.5,
                    "municipality": "Rio",
                    "municipality_code": "3304557",
                    "ovitrap_id": "t",
                    "ovitrap_website_id": 1,
                    "state_code": "33",
                    "state_name": "RJ",
                    "time": "2024-01-07 10:00:00",
                    "week": 1,
                    "year": 2024,
                },
                {"counting_id": 2, "date": "bad"},
            ],
        )
        client = mock_client.return_value.__aenter__.return_value
        client.get.side_effect = [
            resp,
            MagicMock(status_code=200, json=lambda: []),
        ]
        items = asyncio.run(dt_tasks.get_contaovos(date(2024, 1, 7)))
        self.assertEqual(len(items), 1)


class MoreModelsTest(TestCase):
    def test_district_str_state(self):
        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(geocode="33", name="Rio", country=adm0)
        adm2 = m.Adm2.objects.create(
            geocode="3304557", name="RioCity", adm1=adm1
        )
        d = m.Adm3.objects.create(geocode="1", name="Dist", adm2=adm2)
        self.assertEqual(str(d), "Dist")
        self.assertEqual(d.state, adm1)

    def test_disease_str(self):
        icd = m.ICD.objects.create(system="ICD-10", version="2010")
        d = m.Disease.objects.create(icd=icd, code="A90", name="Dengue")
        self.assertEqual(str(d), "Dengue")

    def test_icd_fetch_diseases_icd11(self):
        icd11 = m.ICD.objects.create(system="ICD-11", version="2024-01")
        with patch("datastore.models.get_diseases") as mock_get, patch(
            "datastore.models.Disease.objects.abulk_create",
            new_callable=AsyncMock,
        ):

            async def gen():
                yield fetch_icd.DiseaseSchema(code="A90", name="Dengue")

            mock_get.return_value.__aiter__ = lambda self: gen().__aiter__()
            mock_get.return_value.__anext__ = gen().__anext__
            with patch(
                "datastore.models.async_to_sync",
                side_effect=_run_awaitable,
            ):
                icd11.fetch_diseases("cid", "secret")


class MoreRoutersTest(TestCase):
    def test_routers_return_none(self):
        self.assertIsNone(dtr.VegetationIndicesRouter().db_for_read(m.Adm0))
        self.assertIsNone(dtr.MunicipioRouter().db_for_read(m.Adm0))
        self.assertIsNone(dtr.DengueGlobalRouter().db_for_read(m.Adm0))


class DataDrivenChartsTest(DataStoreBase):
    def setUp(self):
        super().setUp()
        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(geocode="33", name="Rio", country=adm0)
        adm2 = m.Adm2.objects.create(
            geocode="3304557", name="RioCity", adm1=adm1
        )
        m.ContaOvos.objects.create(
            counting_id=id(self),
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=5,
            latitude="1.5",
            longitude="-45.5",
            adm2=adm2,
            ovitrap_id="t1",
            ovitrap_website_id=101,
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )
        m.ContaOvos.objects.create(
            counting_id=id(self) + 1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=0,
            latitude="-20.0",
            longitude="-46.0",
            adm2=adm2,
            ovitrap_id="t2",
            ovitrap_website_id=102,
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )

    def test_eggs_density_geocode(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2024-01-31", "geocode": 3304557},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["total_eggs"], 5)

    def test_positivity_data(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/positivity/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["positivity"], 50.0)

    def test_positivity_data_uf(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/positivity/",
            {"start": "2024-01-01", "end": "2024-01-31", "uf": "RJ"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_map_data(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/map/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["name"], "RJ")

    def test_scatter_data(self):
        r = self.client.get(
            "/api/datastore/charts/contaovos/map/scatter/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 2)


class EpiscannerDataTest(TransactionTestCase):
    databases = {"default", "infodengue"}

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = CustomUser.objects.create_user(
            username="epidata",
            email="epi@test.com",
            password="testpass",
            is_active=True,
        )
        self.auth = {"HTTP_X_UID_KEY": self.user.api_key()}
        adm0 = m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(
            geocode="33", name="Rio de Janeiro", country=adm0
        )
        adm2 = m.Adm2.objects.create(
            geocode="2300101", name="RioCity", adm1=adm1
        )
        m.EpiscannerSirParams.objects.using("infodengue").create(
            cid10="A90",
            geocode=adm2,
            year=2026,
            ep_ini="2025-11-01",
            ep_pw="2026-02-01",
            ep_end="2026-04-01",
            ep_dur=12,
            peak_week=8.0,
            beta=1.0,
            gamma=0.5,
            r0=2.0,
            total_cases=100.0,
            alpha=0.5,
            sum_res=1.0,
        )

    def test_parameters_with_data(self):
        r = self.client.get(
            "/api/datastore/episcanner/parameters/",
            {"disease": "dengue", "uf": "RJ"},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_timeseries_seeded(self):
        r = self.client.get(
            "/api/datastore/episcanner/timeseries/",
            {"disease": "dengue", "geocode": 2300101, "year": 2026},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)

    def test_model_eval_with_data(self):
        r = self.client.get(
            "/api/datastore/episcanner/maps/model-eval/",
            {"disease": "dengue", "uf": "RJ", "year": 2026},
            **self.auth,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("table", r.json())


class TasksMoreTest(TestCase):
    def test_contaovos_schema_parse_time(self):
        s = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )
        self.assertIsNotNone(s.time)

    def test_contaovos_schema_longitude_bounds(self):
        with self.assertRaises(Exception):
            dt_tasks.ContaOvosSchema(
                counting_id=1,
                date=date(2024, 1, 7),
                date_collect=date(2024, 1, 7),
                eggs=1,
                latitude=Decimal("1.5"),
                longitude=Decimal("200"),
                municipality="Rio",
                municipality_code="3304557",
                ovitrap_id="t",
                ovitrap_website_id=1,
                state_code="33",
                state_name="RJ",
                time="2024-01-07 10:00:00+00:00",
                week=1,
                year=2024,
            )

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_rate_limit_retry(self, mock_get, mock_ats):
        import httpx

        mock_get.side_effect = httpx.HTTPStatusError(
            "x",
            request=MagicMock(),
            response=MagicMock(status_code=429),
        )
        task = dt_tasks.sync_contaovos_for_date
        task.push_request()
        try:
            with patch.object(task, "retry", side_effect=Exception("retry")):
                with self.assertRaises(Exception):
                    dt_tasks.sync_contaovos_for_date("2024-01-07")
        finally:
            task.pop_request()

    @patch("datastore.tasks.group")
    def test_backfill_group(self, mock_group):
        mock_group.return_value.delay.return_value = MagicMock(id="g1")
        result = dt_tasks.backfill_contaovos("2024-01-01", "2024-01-05")
        self.assertEqual(result["days"], 5)


class ICDBatchTest(TestCase):
    def test_create_diseases_batch(self):
        icd = m.ICD.objects.create(system="ICD-10", version="2010")

        async def gen():
            for _ in range(5005):
                yield fetch_icd.DiseaseSchema(code="A90", name="Dengue")

        with patch("datastore.models.get_diseases") as mock_get, patch(
            "datastore.models.Disease.objects.abulk_create",
            new_callable=AsyncMock,
        ) as mock_bulk:
            mock_get.return_value.__aiter__ = lambda self: gen().__aiter__()
            mock_get.return_value.__anext__ = gen().__anext__
            with patch(
                "datastore.models.async_to_sync",
                side_effect=_run_awaitable,
            ):
                icd.fetch_diseases("cid", "secret")
            self.assertTrue(mock_bulk.called)


class TasksSchemaAndSyncTest(TestCase):
    @patch("datastore.utils.fetch_icd.httpx.AsyncClient")
    def test_worker_non_200(self, mock_client):
        import asyncio
        from unittest.mock import AsyncMock

        async def run():
            q = asyncio.Queue()
            rq = asyncio.Queue()
            await q.put("http://example.com/x")
            resp = MagicMock()
            resp.status_code = 500
            client = mock_client.return_value
            client.get = AsyncMock(return_value=resp)
            task = asyncio.create_task(
                fetch_icd.worker("w", q, rq, "tok", client, "en")
            )
            await asyncio.sleep(0.1)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            self.assertTrue(rq.empty())

        asyncio.run(run())

    def test_schema_time_datetime_input(self):
        s = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time=datetime(2024, 1, 7, 10, 0, 0),
            week=1,
            year=2024,
        )
        self.assertIsNotNone(s.time)

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_non_429_raises(self, mock_get, mock_ats):
        import httpx

        mock_get.side_effect = httpx.HTTPStatusError(
            "x", request=MagicMock(), response=MagicMock(status_code=500)
        )
        with self.assertRaises(httpx.HTTPStatusError):
            dt_tasks.sync_contaovos_for_date("2024-01-07")

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_mixed(self, mock_get, mock_ats):
        adm2 = m.Adm2.objects.create(
            geocode="3304557",
            name="Rio",
            adm1=m.Adm1.objects.create(
                geocode="33",
                name="Rio",
                country=m.Adm0.objects.create(geocode="BRA", name="Brasil"),
            ),
        )
        m.ContaOvos.objects.create(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude="1.5",
            longitude="2.5",
            adm2=adm2,
            ovitrap_id="t",
            ovitrap_website_id=1,
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )

        def make(cid, mcode):
            return dt_tasks.ContaOvosSchema(
                counting_id=cid,
                date=date(2024, 1, 7),
                date_collect=date(2024, 1, 7),
                eggs=1,
                latitude=Decimal("1.5"),
                longitude=Decimal("2.5"),
                municipality="Rio",
                municipality_code=mcode,
                ovitrap_id="t",
                ovitrap_website_id=1,
                state_code="33",
                state_name="RJ",
                time="2024-01-07 10:00:00",
                week=1,
                year=2024,
            )

        mock_get.return_value = [
            make(1, "3304557"),
            make(2, "3304557"),
            make(3, "9999999"),
        ]
        result = dt_tasks.sync_contaovos_for_date("2024-01-07")
        self.assertIn("1 created, 1 updated, 1 skipped", result)

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_item_exception(self, mock_get, mock_ats):
        m.Adm0.objects.create(geocode="BRA", name="Brasil")
        adm1 = m.Adm1.objects.create(
            geocode="33", name="Rio", country=m.Adm0.objects.get(geocode="BRA")
        )
        m.Adm2.objects.create(geocode="3304557", name="Rio", adm1=adm1)
        item = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )
        mock_get.return_value = [item]
        with patch("datastore.tasks.ContaOvos", side_effect=Exception("boom")):
            result = dt_tasks.sync_contaovos_for_date("2024-01-07")
        self.assertIn("1 skipped", result)

    @patch("datastore.tasks.async_to_sync", side_effect=_run_awaitable)
    @patch("datastore.tasks.get_contaovos")
    def test_sync_all_updates(self, mock_get, mock_ats):
        adm2 = m.Adm2.objects.create(
            geocode="3304557",
            name="Rio",
            adm1=m.Adm1.objects.create(
                geocode="33",
                name="Rio",
                country=m.Adm0.objects.create(geocode="BRA", name="Brasil"),
            ),
        )
        m.ContaOvos.objects.create(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=1,
            latitude="1.5",
            longitude="2.5",
            adm2=adm2,
            ovitrap_id="t",
            ovitrap_website_id=1,
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )
        item = dt_tasks.ContaOvosSchema(
            counting_id=1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=2,
            latitude=Decimal("1.5"),
            longitude=Decimal("2.5"),
            municipality="Rio",
            municipality_code="3304557",
            ovitrap_id="t",
            ovitrap_website_id=1,
            state_code="33",
            state_name="RJ",
            time="2024-01-07 10:00:00",
            week=1,
            year=2024,
        )
        mock_get.return_value = [item]
        result = dt_tasks.sync_contaovos_for_date("2024-01-07")
        self.assertIn("1 updated", result)


class ICDExactBatchTest(TestCase):
    def test_create_diseases_no_final_batch(self):
        icd = m.ICD.objects.create(system="ICD-10", version="2010")

        async def gen():
            for _ in range(5000):
                yield fetch_icd.DiseaseSchema(code="A90", name="Dengue")

        with patch("datastore.models.get_diseases") as mock_get, patch(
            "datastore.models.Disease.objects.abulk_create",
            new_callable=AsyncMock,
        ) as mock_bulk:
            mock_get.return_value.__aiter__ = lambda self: gen().__aiter__()
            mock_get.return_value.__anext__ = gen().__anext__
            with patch(
                "datastore.models.async_to_sync",
                side_effect=_run_awaitable,
            ):
                icd.fetch_diseases("cid", "secret")
            self.assertEqual(mock_bulk.call_count, 1)
