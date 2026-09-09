from datetime import date
from unittest.mock import MagicMock, patch

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.core.cache import cache

from datastore.models import Adm0, Adm1, Adm2, Disease, ICD
from registry.models import (
    Repository,
    RepositoryModel,
    Sprint,
    ModelPrediction,
    QuantitativePrediction,
    QuantitativePredictionRow,
)
from vis import utils
from vis.filters import DashboardParams
from vis.throttle import SdkThrottle
from vis import api as vis_api

User = get_user_model()


class VisDashboardBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            username="visuser",
            email="vis@test.com",
            password="pass",
            is_active=True,
        )
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

    def _repo_model(self, category="quantitative", sprint=None):
        repo = Repository.objects.create(
            repo_id=f"r{id(self)}",
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

    def _model_prediction(self, **kw):
        defaults = dict(commit="abc", published=True)
        defaults.update(kw)
        return ModelPrediction.objects.create(**defaults)

    def _quant_prediction(self, **kw):
        defaults = dict(
            commit="abc", published=True, case_definition="reported"
        )
        defaults.update(kw)
        return QuantitativePrediction.objects.create(**defaults)


class DashboardCategoriesTest(VisDashboardBase):
    def test_categories_national_quant(self):
        model = self._repo_model("quantitative")
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        self.assertEqual(r.status_code, 200)
        sections = {s["id"]: s for s in r.json()}
        self.assertEqual(
            sections["default"]["categories"][0]["id"], "quantitative"
        )

    def test_categories_sprint_section(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        sections = {s["id"]: s for s in r.json()}
        self.assertIn("sprint", sections)

    def test_categories_categorical(self):
        model = self._repo_model("categorical")
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=1,
            adm1=self.state,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        sections = {s["id"]: s for s in r.json()}
        self.assertEqual(
            sections["default"]["categories"][0]["id"], "categorical"
        )

    def test_categories_unmapped_adm_level_skipped(self):
        model = self._repo_model("quantitative")
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=99,
            adm0=self.country,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        self.assertEqual(r.json(), [])

    def test_categories_unpublished_hidden(self):
        model = self._repo_model("quantitative")
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            published=False,
        )
        r = self.client.get("/api/vis/dashboard/categories/")
        self.assertEqual(r.json(), [])


class DashboardSprintsTest(VisDashboardBase):
    def test_sprints_filtered(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        r = self.client.get(
            "/api/vis/dashboard/sprints/",
            {"category": "quantitative", "adm_level": 0, "disease": "A90"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["year"], 2024)

    def test_sprints_country_filter(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        self._model_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        r = self.client.get(
            "/api/vis/dashboard/sprints/",
            {
                "category": "quantitative",
                "adm_level": 0,
                "disease": "A90",
                "country": "BRA",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)


class DashboardPredictionsTest(VisDashboardBase):
    def test_predictions_non_sprint(self):
        model = self._repo_model("quantitative")
        pred = self._quant_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
            lower_50=9.0,
            upper_50=11.0,
        )
        r = self.client.get(
            "/api/vis/dashboard/predictions/",
            {
                "category": "quantitative",
                "adm_level": 0,
                "disease": "A90",
                "case_definition": "reported",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["id"], pred.id)

    def test_predictions_sprint(self):
        model = self._repo_model("quantitative", sprint=self.sprint)
        pred = self._quant_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
            case_definition="probable",
        )
        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
            lower_50=9.0,
            upper_50=11.0,
        )
        r = self.client.get(
            "/api/vis/dashboard/predictions/",
            {
                "category": "quantitative",
                "adm_level": 0,
                "disease": "A90",
                "case_definition": "probable",
                "sprint": True,
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["id"], pred.id)


class DashboardPredictionMetaTest(VisDashboardBase):
    def test_meta_found(self):
        model = self._repo_model("quantitative")
        pred = self._quant_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        r = self.client.get(
            f"/api/vis/dashboard/prediction/{pred.id}/metadata/"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["disease_code"], "A90")

    def test_meta_not_found(self):
        r = self.client.get("/api/vis/dashboard/prediction/9999/metadata/")
        self.assertEqual(r.status_code, 404)

    def test_prediction_rows(self):
        model = self._repo_model("quantitative")
        pred = self._quant_prediction(
            model=model,
            disease=self.disease,
            adm_level=0,
            adm0=self.country,
        )
        QuantitativePredictionRow.objects.create(
            prediction=pred,
            date=date(2024, 1, 7),
            pred=10.0,
            lower_90=8.0,
            upper_90=12.0,
            lower_50=9.0,
            upper_50=11.0,
        )
        r = self.client.get(f"/api/vis/dashboard/prediction/{pred.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["pred"], 10.0)

    def test_prediction_rows_not_found(self):
        r = self.client.get("/api/vis/dashboard/prediction/9999/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])


class DashboardCasesTest(VisDashboardBase):
    @patch("vis.api.hist_alerta_data")
    def test_cases_dengue(self, mock_hist):
        import pandas as pd

        df = pd.DataFrame({"date": [date(2024, 1, 7)], "target": [10]})
        mock_hist.return_value = df
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "A90",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
                "adm_1": "RJ",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["cases"], 10)

    @patch("vis.api.hist_alerta_data")
    def test_cases_sprint_uses_probable(self, mock_hist):
        import pandas as pd

        df = pd.DataFrame({"date": [date(2024, 1, 7)], "target": [5]})
        mock_hist.return_value = df
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "A90",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
                "sprint": True,
                "adm_1": "RJ",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["cases"], 5)

    def test_cases_unknown_disease(self):
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "XXX",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    @patch("vis.api.hist_alerta_data")
    def test_cases_empty_df(self, mock_hist):
        import pandas as pd

        mock_hist.return_value = pd.DataFrame()
        r = self.client.get(
            "/api/vis/dashboard/cases/",
            {
                "disease": "A90",
                "case_definition": "reported",
                "start": "2024-01-01",
                "end": "2024-01-31",
                "adm_level": 1,
                "adm_1": "RJ",
            },
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])


class CanManageFilterTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="owner", email="o@test.com", password="p"
        )

    def test_anonymous(self):
        f = vis_api.can_manage_filter(None)
        self.assertIsNotNone(f)

    def test_superuser(self):
        admin = User.objects.create_superuser(
            username="sup", email="s@test.com", password="p"
        )
        f = vis_api.can_manage_filter(admin)
        self.assertEqual(f, vis_api.Q())

    def test_authenticated(self):
        f = vis_api.can_manage_filter(self.user, prefix="model")
        self.assertIsNotNone(f)

    def test_anonymous_with_prefix(self):
        f = vis_api.can_manage_filter(None, prefix="model")
        self.assertIsNotNone(f)


class VisUtilsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="utilsuser", email="u@test.com", password="p"
        )

    @patch("vis.utils.HistoricoAlertaChik.objects")
    def test_hist_alerta_data_chik(self, mock_qs):
        mock_qs.using.return_value.filter.return_value.values.return_value.annotate.return_value.order_by.return_value = (
            []
        )
        df = utils.hist_alerta_data(
            "reported",
            "chik",
            date(2024, 1, 1),
            date(2024, 1, 31),
            adm_level=1,
            adm_1="33",
        )
        self.assertTrue(df.empty)

    @patch("vis.utils.HistoricoAlerta.objects")
    def test_hist_alerta_data_dengue(self, mock_qs):
        mock_qs.using.return_value.filter.return_value.values.return_value.annotate.return_value.order_by.return_value = (
            []
        )
        df = utils.hist_alerta_data(
            "probable",
            "dengue",
            date(2024, 1, 1),
            date(2024, 1, 31),
            adm_level=1,
            adm_1=33,
        )
        self.assertTrue(df.empty)

    @patch("vis.utils.HistoricoAlertaZika.objects")
    def test_hist_alerta_data_zika(self, mock_qs):
        mock_qs.using.return_value.filter.return_value.values.return_value.annotate.return_value.order_by.return_value = (
            []
        )
        df = utils.hist_alerta_data(
            "reported",
            "zika",
            date(2024, 1, 1),
            date(2024, 1, 31),
            adm_level=2,
            adm_2=3304557,
        )
        self.assertTrue(df.empty)

    def test_hist_alerta_data_unknown_disease(self):
        with self.assertRaises(ValueError):
            utils.hist_alerta_data(
                "reported",
                "covid",
                date(2024, 1, 1),
                date(2024, 1, 31),
                adm_level=1,
                adm_1="33",
            )

    def test_hist_alerta_data_invalid_adm_level(self):
        with self.assertRaises(ValueError):
            utils.hist_alerta_data(
                "reported",
                "dengue",
                date(2024, 1, 1),
                date(2024, 1, 31),
                adm_level=3,
            )

    def test_hist_alerta_data_adm2_required(self):
        with self.assertRaises(ValueError):
            utils.hist_alerta_data(
                "reported",
                "dengue",
                date(2024, 1, 1),
                date(2024, 1, 31),
                adm_level=2,
                adm_2=None,
            )

    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_unknown_disease(self, mock_qs):
        pred = MagicMock()
        pred.disease.code = "XXX"
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_no_rows(self, mock_qs):
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {"min_date": None, "max_date": None}
        mock_qs.get.return_value = pred
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch(
        "vis.utils.hist_alerta_data",
        return_value=__import__("pandas").DataFrame(),
    )
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_empty_data(self, mock_qs, mock_hist):
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        mock_qs.get.return_value = pred
        pred.data.values.return_value = []
        scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])

    @patch(
        "vis.utils.hist_alerta_data",
        return_value=__import__("pandas").DataFrame(),
    )
    @patch("vis.utils.QuantitativePrediction.objects")
    def test_calculate_score_no_staff_user(self, mock_qs, mock_hist):
        pred = MagicMock()
        pred.disease.code = "A90"
        pred.data.aggregate.return_value = {
            "min_date": date(2024, 1, 1),
            "max_date": date(2024, 1, 31),
        }
        pred.adm1 = None
        pred.adm2 = None
        mock_qs.get.return_value = pred
        pred.data.values.return_value = []
        with patch(
            "vis.utils.User.objects.filter",
            return_value=MagicMock(first=MagicMock(return_value=None)),
        ):
            scores = utils.calculate_score(1)
        self.assertIsNone(scores["mae"])


class VisFiltersTest(TestCase):
    def test_parse_adm1_digit_to_uf(self):
        params = DashboardParams(sprint=False, adm_1=33)
        self.assertEqual(params.adm_1, "RJ")

    def test_parse_adm1_non_digit(self):
        params = DashboardParams(sprint=False, adm_1="SP")
        self.assertEqual(params.adm_1, "SP")


class SdkThrottleTest(TestCase):
    def setUp(self):
        cache.clear()
        self.throttle = SdkThrottle()

    def _req(self, meta=None, user=None, auth=None):
        req = MagicMock()
        req.META = meta or {"REMOTE_ADDR": "1.1.1.1"}
        req.user = user
        req.auth = auth
        return req

    def test_anonymous_first_request(self):
        self.assertTrue(self.throttle.allow_request(self._req()))

    def test_anonymous_limit_reached(self):
        cache.set("sdk_throttle:ip:1.1.1.1", 99999, timeout=60)
        self.assertFalse(self.throttle.allow_request(self._req()))

    def test_anonymous_no_ip(self):
        req = self._req(meta={})
        req.META = {}
        self.assertTrue(self.throttle.allow_request(req))

    def test_staff_bypass(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = True
        self.assertTrue(self.throttle.allow_request(self._req(user=user)))

    def test_rate_limit_none_bypass(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = None
        self.assertTrue(self.throttle.allow_request(self._req(user=user)))

    def test_invalid_rate_limit(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "abc"
        user.pk = 1
        self.assertTrue(self.throttle.allow_request(self._req(user=user)))

    def test_user_first_request(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "10/s"
        user.pk = 2
        self.assertTrue(self.throttle.allow_request(self._req(user=user)))

    def test_user_limit_reached(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "2/s"
        user.pk = 3
        cache.set("sdk_throttle:user:3", 5, timeout=60)
        self.assertFalse(self.throttle.allow_request(self._req(user=user)))

    def test_user_incr_value_error(self):
        user = MagicMock()
        user.is_authenticated = True
        user.is_staff = False
        user.is_superuser = False
        user.rate_limit = "5/s"
        user.pk = 4
        cache.set("sdk_throttle:user:4", 1, timeout=60)
        with patch("vis.throttle.cache.incr", side_effect=ValueError):
            self.assertTrue(self.throttle.allow_request(self._req(user=user)))
