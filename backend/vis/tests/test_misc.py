from datetime import date
from unittest.mock import MagicMock, patch

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.cache import cache

from datastore.models import (
    Adm0,
    Adm1,
    Adm2,
    Disease,
    ICD,
    ContaOvos,
    CopernicusBrasil,
)
from registry.models import (
    Repository,
    RepositoryModel,
    Sprint,
    ModelPrediction,
    QuantitativePrediction,
)
from vis.brasil import models as brasil
from vis import models as vis_models
from vis.charts import infodengue as infodengue_chart
from vis.charts.schema import (
    InfodengueChartIn,
    ClimateChartIn,
    ContaOvosChartIn,
)

User = get_user_model()


class VisBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="vis2",
            email="v2@test.com",
            password="pass",
            is_active=True,
        )
        self.sdk = self.user.rotate_sdk_key()
        icd = ICD.objects.create(system="ICD-10", version="2019")
        self.disease = Disease.objects.create(
            icd=icd, code="A90", name="Dengue"
        )
        self.country = Adm0.objects.create(geocode="BRA", name="Brasil")
        self.state = Adm1.objects.create(
            geocode="33", name="Rio", country=self.country
        )
        self.city = Adm2.objects.create(
            geocode="3304557", name="Rio City", adm1=self.state
        )
        self.sprint = Sprint.objects.create(
            year=2024,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )

    _repo_counter = 0

    def _repo_model(self, category="quantitative", sprint=None):
        type(self)._repo_counter += 1
        repo = Repository.objects.create(
            repo_id=f"r{type(self)._repo_counter}{id(self)}",
            name="repo",
            provider="github",
            owner=self.user,
        )
        return RepositoryModel.objects.create(
            repository=repo,
            category=category,
            time_resolution="week",
            sprint=sprint,
        )


class DashboardMoreBranchesTest(VisBase):
    def test_categories_unknown_category_skipped(self):
        model = self._repo_model("quantitative")
        ModelPrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
        )
        model.category = "weird"
        model.save()
        r = self.client.get("/api/vis/dashboard/categories/")
        self.assertEqual(r.json(), [])

    def test_sprints_state_filter(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        ModelPrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=1,
            adm1=self.state,
            commit="x",
            published=True,
        )
        r = self.client.get(
            "/api/vis/dashboard/sprints/",
            {
                "category": "quantitative",
                "adm_level": 1,
                "disease": "A90",
                "state": "33",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_sprints_city_filter(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        ModelPrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=2,
            adm2=self.city,
            commit="x",
            published=True,
        )
        r = self.client.get(
            "/api/vis/dashboard/sprints/",
            {
                "category": "quantitative",
                "adm_level": 2,
                "disease": "A90",
                "city": "3304557",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_predictions_adm0_filter(self):
        model = self._repo_model("quantitative")
        pred = QuantitativePrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
            case_definition="reported",
        )
        from registry.models import QuantitativePredictionRow

        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
        )
        r = self.client.get(
            "/api/vis/dashboard/predictions/",
            {
                "category": "quantitative",
                "adm_level": 0,
                "disease": "A90",
                "case_definition": "reported",
                "country": "BRA",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    @patch("vis.api.hist_alerta_data")
    def test_cases_zika(self, mock_hist):
        import pandas as pd

        mock_hist.return_value = pd.DataFrame(
            {"date": [date(2024, 1, 7)], "target": [1]}
        )
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "A92.5",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
                "adm_1": "RJ",
            },
        )
        self.assertEqual(r.status_code, 200)

    @patch("vis.api.hist_alerta_data")
    def test_cases_chik(self, mock_hist):
        import pandas as pd

        mock_hist.return_value = pd.DataFrame(
            {"date": [date(2024, 1, 7)], "target": [1]}
        )
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "A92.0",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
                "adm_1": "RJ",
            },
        )
        self.assertEqual(r.status_code, 200)

    def test_tree_no_country(self):
        model = self._repo_model("quantitative")
        ModelPrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=3,
            commit="x",
            published=True,
        )
        r = self.client.get("/api/vis/dashboard/tree/")
        self.assertEqual(r.status_code, 200)

    def test_categories_two_models_same_group(self):
        model1 = self._repo_model("quantitative")
        ModelPrediction.objects.create(
            model=model1,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
        )
        model2 = self._repo_model("quantitative")
        ModelPrediction.objects.create(
            model=model2,
            disease=self.disease,
            adm_level=1,
            adm1=self.state,
            commit="y",
            published=True,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_predictions_adm1_filter(self):
        model = self._repo_model("quantitative")
        pred = QuantitativePrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=1,
            adm1=self.state,
            commit="x",
            published=True,
            case_definition="reported",
        )
        from registry.models import QuantitativePredictionRow

        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
        )
        r = self.client.get(
            "/api/vis/dashboard/predictions/",
            {
                "category": "quantitative",
                "adm_level": 1,
                "disease": "A90",
                "case_definition": "reported",
                "state": "33",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_predictions_adm2_filter(self):
        model = self._repo_model("quantitative")
        pred = QuantitativePrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=2,
            adm2=self.city,
            commit="x",
            published=True,
            case_definition="reported",
        )
        from registry.models import QuantitativePredictionRow

        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
        )
        r = self.client.get(
            "/api/vis/dashboard/predictions/",
            {
                "category": "quantitative",
                "adm_level": 2,
                "disease": "A90",
                "case_definition": "reported",
                "city": "3304557",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)

    def test_tree_unmapped_category_skipped(self):
        model = self._repo_model("quantitative")
        ModelPrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
        )
        model.category = "bogus"
        model.save()
        r = self.client.get("/api/vis/dashboard/tree/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["diseases"], {})


class BrasilModelsTest(TestCase):
    def setUp(self):
        self.macro = brasil.Macroregion.objects.create(
            geocode="1", name="Sudeste"
        )
        self.state = brasil.State.objects.create(
            geocode="33", name="Rio", uf="RJ", macroregion=self.macro
        )
        self.meso = brasil.Mesoregion.objects.create(
            geocode="3301", name="Metro", state=self.state
        )
        self.micro = brasil.Microregion.objects.create(
            geocode="33001", name="RioM", mesoregion=self.meso
        )
        self.city = brasil.City.objects.create(
            geocode="3304557", name="RioCity", microregion=self.micro
        )
        self.gms = brasil.GeoMacroSaude.objects.create(
            geocode="3301",
            name="Macro",
            state=self.state,
            geometry="POINT(0 0)",
        )

    def test_strs(self):
        self.assertEqual(str(self.macro), "Sudeste")
        self.assertEqual(str(self.state), "Rio")
        self.assertEqual(str(self.meso), "Metro")
        self.assertEqual(str(self.micro), "RioM")
        self.assertEqual(str(self.city), "RioCity")

    def test_city_state_property(self):
        self.assertEqual(self.city.state, self.state)

    def test_geo_save(self):
        for cls, kw in [
            (brasil.GeoMacroregion, {"macroregion": self.macro}),
            (brasil.GeoState, {"state": self.state}),
            (brasil.GeoMesoregion, {"mesoregion": self.meso}),
            (brasil.GeoMicroregion, {"microregion": self.micro}),
            (brasil.GeoCity, {"city": self.city}),
        ]:
            obj = cls.objects.create(geometry="POINT(1 1)", **kw)
            self.assertIsNotNone(obj.geometry)


class VisModelsStrTest(TestCase):
    def test_total_cases_str(self):
        t = vis_models.TotalCases.objects.create(
            uf="RJ", year=2024, disease="dengue", total_cases=10
        )
        self.assertIn("2024", str(t))

    def test_total_cases_100k_str(self):
        t = vis_models.TotalCases100kHab.objects.create(
            uf="RJ", year=2024, disease="dengue", total_cases=1.5
        )
        self.assertIn("2024", str(t))


class SchemaResolverTest(VisBase):
    def test_resolve_scores_with_values(self):
        from vis.schema import DashboardPredictionOut

        model = self._repo_model("quantitative")
        pred = QuantitativePrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
            case_definition="reported",
            mae_score=1.0,
            mse_score=2.0,
        )
        scores = DashboardPredictionOut.resolve_scores(pred)
        self.assertEqual(len(scores), 2)

    def test_resolve_owner_org(self):
        from vis.schema import DashboardPredictionOut
        from registry.models import Organization

        org = Organization.objects.create(name="orgname")
        repo = Repository.objects.create(
            repo_id="org1",
            name="orgrepo",
            provider="github",
            owner=None,
            organization=org,
        )
        model = RepositoryModel.objects.create(
            repository=repo,
            category="quantitative",
            time_resolution="week",
        )
        pred = QuantitativePrediction.objects.create(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            commit="x",
            published=True,
            case_definition="reported",
        )
        self.assertEqual(DashboardPredictionOut.resolve_owner(pred), "orgname")


class InfodengueQuerysetTest(TestCase):
    @patch("vis.charts.infodengue.HistoricoAlertaChik.objects")
    def test_chik(self, mock):
        qs = infodengue_chart.get_infodengue_queryset("chikungunya")
        self.assertIsNotNone(qs)

    @patch("vis.charts.infodengue.HistoricoAlerta.objects")
    def test_dengue(self, mock):
        qs = infodengue_chart.get_infodengue_queryset("dengue")
        self.assertIsNotNone(qs)

    @patch("vis.charts.infodengue.HistoricoAlertaZika.objects")
    def test_zika(self, mock):
        qs = infodengue_chart.get_infodengue_queryset("zika")
        self.assertIsNotNone(qs)

    def test_unknown(self):
        self.assertIsNone(infodengue_chart.get_infodengue_queryset("covid"))

    @patch("vis.charts.infodengue.Municipio.objects")
    @patch("vis.charts.infodengue.HistoricoAlerta.objects")
    def test_with_uf(self, mock_hist, mock_muni):
        mock_muni.using.return_value.filter.return_value.values_list.return_value = [
            3304557
        ]
        qs = infodengue_chart.get_infodengue_queryset("dengue", uf="RJ")
        self.assertIsNotNone(qs)

    @patch("vis.charts.infodengue.HistoricoAlerta.objects")
    def test_invalid_uf(self, mock_hist):
        with self.assertRaises(ValueError):
            infodengue_chart.get_infodengue_queryset("dengue", uf="XX")


class ChartSchemaValidatorsTest(TestCase):
    def test_infodengue_invalid_disease(self):
        with self.assertRaises(Exception):
            InfodengueChartIn(
                disease="covid",
                geocode=3304557,
                start="2024-01-01",
                end="2024-01-31",
            )

    def test_climate_geocode_length(self):
        with self.assertRaises(Exception):
            ClimateChartIn(geocode=123, start="2024-01-01", end="2024-01-31")

    def test_contaovos_geocode_length(self):
        with self.assertRaises(Exception):
            ContaOvosChartIn(start="2024-01-01", end="2024-01-31", geocode=123)

    def test_climate_end_before_start(self):
        with self.assertRaises(Exception):
            ClimateChartIn(
                geocode=3304557, start="2024-02-01", end="2024-01-01"
            )

    def test_climate_range_too_large(self):
        with self.assertRaises(Exception):
            ClimateChartIn(
                geocode=3304557, start="2024-01-01", end="2025-02-01"
            )


class ClimateHumidityTest(VisBase):
    databases = {"default", "infodengue"}

    def test_humidity_pressure(self):
        CopernicusBrasil.objects.using("infodengue").create(
            date=date(2024, 1, 7),
            geocodigo=3304557,
            epiweek=1,
            temp_min=1.0,
            temp_med=2.0,
            temp_max=3.0,
            precip_min=1.0,
            precip_med=2.0,
            precip_max=3.0,
            precip_tot=4.0,
            pressao_min=1.0,
            pressao_med=2.12345,
            pressao_max=3.0,
            umid_min=1.0,
            umid_med=2.98765,
            umid_max=3.0,
        )
        r = self.client.get(
            "/api/vis/charts/climate/umid-pressao-med/",
            {"geocode": 3304557, "start": "2024-01-01", "end": "2024-01-31"},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)


class ClimateWaterfallTest(VisBase):
    databases = {"default", "infodengue"}

    def test_waterfall_without_precip_fixed(self):
        CopernicusBrasil.objects.using("infodengue").create(
            date=date(2024, 1, 7),
            geocodigo=3304557,
            epiweek=1,
            temp_min=1.0,
            temp_med=2.0,
            temp_max=3.0,
            precip_min=1.0,
            precip_med=2.0,
            precip_max=3.0,
            precip_tot=4.0,
            pressao_min=1.0,
            pressao_med=2.0,
            pressao_max=3.0,
            umid_min=1.0,
            umid_med=2.0,
            umid_max=3.0,
        )
        r = self.client.get(
            "/api/vis/charts/climate/accumulated-waterfall/",
            {
                "geocode": 3304557,
                "start": "2024-01-01",
                "end": "2024-01-31",
                "precip_fixed": False,
            },
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)


class EpiscannerCacheTest(VisBase):
    databases = {"default", "infodengue"}

    @patch("vis.charts.episcanner.Adm2.objects")
    @patch("vis.charts.episcanner.EpiscannerSirParams.objects")
    def test_cache_hit(self, mock_params, mock_adm2):
        cache.set(
            "episcanner:dengue:RJ:2024",
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
            "/api/vis/charts/episcanner/",
            {"disease": "dengue", "uf": "RJ", "year": 2024},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["CID10"], "A90")


class ContaOvosBranchesTest(VisBase):
    def setUp(self):
        super().setUp()
        ContaOvos.objects.create(
            counting_id=id(self),
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=5,
            latitude="1.5",
            longitude="-45.5",
            adm2=self.city,
            ovitrap_id="t1",
            ovitrap_website_id=101,
            time="2024-01-07 00:00:00",
            week=1,
            year=2024,
        )
        ContaOvos.objects.create(
            counting_id=id(self) + 1,
            date=date(2024, 1, 7),
            date_collect=date(2024, 1, 7),
            eggs=0,
            latitude="-20.0",
            longitude="-46.0",
            adm2=self.city,
            ovitrap_id="t2",
            ovitrap_website_id=102,
            time="2024-01-07 00:00:00",
            week=1,
            year=2024,
        )

    def test_eggs_density_with_geocode(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/eggs_density/",
            {"start": "2024-01-01", "end": "2024-01-31", "geocode": 3304557},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["total_eggs"], 5)

    def test_positivity(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/positivity/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)

    def test_positivity_with_uf(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/positivity/",
            {"start": "2024-01-01", "end": "2024-01-31", "uf": "RJ"},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)

    def test_map(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/map/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)

    def test_map_scatter(self):
        r = self.client.get(
            "/api/vis/charts/contaovos/map/scatter/",
            {"start": "2024-01-01", "end": "2024-01-31"},
            HTTP_X_SDK_KEY=self.sdk,
        )
        self.assertEqual(r.status_code, 200)


class VisUtilsMoreTest(VisBase):
    @patch("vis.utils.Adm2.objects")
    def test_hist_alerta_uf_name(self, mock_adm2):
        mock_adm2.filter.return_value.values_list.return_value = []
        from vis import utils

        df = utils.hist_alerta_data(
            "reported",
            "dengue",
            date(2024, 1, 1),
            date(2024, 1, 31),
            adm_level=1,
            adm_1="RJ",
        )
        self.assertTrue(df.empty)

    @patch(
        "vis.utils.hist_alerta_data",
        return_value=__import__("pandas").DataFrame(),
    )
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_chik(self, mock_qs, mock_hist):
        from vis import utils

        pred = MagicMock()
        pred.disease.code = "A92.0"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.data.values.return_value = []
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch(
        "vis.utils.hist_alerta_data",
        return_value=__import__("pandas").DataFrame(),
    )
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_zika(self, mock_qs, mock_hist):
        from vis import utils

        pred = MagicMock()
        pred.disease.code = "A92.5"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.data.values.return_value = []
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch("vis.utils.Scorer")
    @patch("vis.utils.hist_alerta_data")
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_full(self, mock_qs, mock_hist, mock_scorer):
        import pandas as pd

        from vis import utils

        User.objects.create_superuser(
            username="staffscore", email="s@test.com", password="p"
        )
        df = pd.DataFrame(
            {"date": pd.to_datetime(["2024-01-07"]), "casos": [10]}
        )
        mock_hist.return_value = df
        scorer = MagicMock()
        scorer.summary = {
            "mae": {"pred": 1.0},
            "mse": {"pred": 2.0},
            "crps": {"pred": 3.0},
            "log_score": {"pred": 4.0},
            "interval_score": {"pred": 5.0},
            "wis": {"pred": 6.0},
        }
        mock_scorer.return_value = scorer
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.case_definition = "reported"
        pred.data.values.return_value = [
            {"date": date(2024, 1, 7), "pred": 10.0, "lower_90": 8.0},
        ]
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertEqual(scores["mae"], 1.0)

    @patch("vis.utils.Scorer")
    @patch("vis.utils.hist_alerta_data")
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_partial_summary(
        self, mock_qs, mock_hist, mock_scorer
    ):
        import pandas as pd

        from vis import utils

        User.objects.create_superuser(
            username="staff2", email="s2@test.com", password="p"
        )
        df = pd.DataFrame(
            {"date": pd.to_datetime(["2024-01-07"]), "casos": [10]}
        )
        mock_hist.return_value = df
        scorer = MagicMock()
        scorer.summary = {"mae": {"pred": 1.0}}
        mock_scorer.return_value = scorer
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.case_definition = "reported"
        pred.data.values.return_value = [
            {"date": date(2024, 1, 7), "pred": 10.0, "lower_90": 8.0},
        ]
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertEqual(scores["mae"], 1.0)
        self.assertIsNone(scores["mse"])

    @patch("vis.utils.hist_alerta_data")
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_no_casos_column(self, mock_qs, mock_hist):
        import pandas as pd

        from vis import utils

        User.objects.create_superuser(
            username="staff3", email="s3@test.com", password="p"
        )
        mock_hist.return_value = pd.DataFrame(
            {"date": pd.to_datetime(["2024-01-07"])}
        )
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.case_definition = "reported"
        pred.data.values.return_value = [
            {"date": date(2024, 1, 7), "pred": 10.0},
        ]
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch("vis.utils.hist_alerta_data")
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_no_staff_full(self, mock_qs, mock_hist):
        import pandas as pd

        from vis import utils

        mock_hist.return_value = pd.DataFrame(
            {"date": pd.to_datetime(["2024-01-07"]), "target": [10]}
        )
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        pred.case_definition = "reported"
        pred.data.values.return_value = [
            {"date": date(2024, 1, 7), "pred": 10.0},
        ]
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])


class ThrottleMoreTest(TestCase):
    def setUp(self):
        cache.clear()
        from vis.throttle import SdkThrottle

        self.throttle = SdkThrottle()

    def _req(self, meta=None, user=None):
        req = MagicMock()
        req.META = meta or {"REMOTE_ADDR": "1.2.3.4"}
        req.user = user
        req.auth = user
        return req

    def test_get_client_ip_xff(self):
        req = MagicMock()
        req.META = {"HTTP_X_FORWARDED_FOR": "5.6.7.8, 9.9.9.9"}
        self.assertEqual(self.throttle.get_client_ip(req), "5.6.7.8")

    def test_anonymous_incr_value_error(self):
        cache.set("sdk_throttle:ip:1.2.3.4", 1, timeout=60)
        with patch("vis.throttle.cache.incr", side_effect=ValueError):
            self.assertTrue(self.throttle.allow_request(self._req()))
