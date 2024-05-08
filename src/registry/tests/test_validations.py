import json
from datetime import date, datetime, timedelta
from pathlib import Path

from django.http import HttpRequest
from django.test import TestCase
from ninja import Router

from registry.api import PredictionIn, create_prediction, ModelIn, create_model
from registry.models import Author, ImplementationLanguage, Model, Prediction
from registry.validations import (
    validate_ADM_level,
    validate_implementation_language,
    validate_repository,
    validate_time_resolution,
)
from users.models import CustomUser

app_dir = Path(__file__).parent.parent
router = Router()


@router.post(
    "/create-prediction/",
    response={int: str},
    tags=["registry", "Predictions"],
)
class TestValidCreatePrediction(TestCase):
    def setUp(self):
        self.validation_IBGE_codes = app_dir / "data/IBGE_codes.json"
        with open(self.validation_IBGE_codes, "r") as validation_file:
            self.validation_data = json.load(validation_file)

        self.data = [
            {
                "dates": "2022-01-02",
                "preds": 23.4811749402,
                "lower": 0.0,
                "upper": 42.6501866267,
                "adm_2": 2704302,
                "adm_1": "AL",
                "adm_0": "BR",
            }
        ]

        user, _ = CustomUser.objects.get_or_create(username="usertest")
        language = ImplementationLanguage.objects.create(
            language="AnotherLang"
        )

        self.model = Model.objects.create(
            author=Author.objects.get_or_create(user=user)[0],
            name="Test Model",
            implementation_language=language,
        )

    def validate_prediction_data(self, data: dict) -> None:
        # Check data types
        self.assertIsInstance(data["dates"], str)
        self.assertIsInstance(data["preds"], float)
        self.assertIsInstance(data["lower"], float)
        self.assertIsInstance(data["upper"], float)
        self.assertIsInstance(data["adm_2"], int)
        self.assertIsInstance(data["adm_1"], str)
        self.assertIsInstance(data["adm_0"], str)

        # Check data values
        self.assertEqual(data["dates"], "2022-01-02")
        self.assertAlmostEqual(data["preds"], 23.4811749402)
        self.assertAlmostEqual(data["lower"], 0.0)
        self.assertAlmostEqual(data["upper"], 42.6501866267)
        self.assertEqual(data["adm_1"], "AL")
        self.assertEqual(data["adm_0"], "BR")

        # Check string field lengths
        self.assertLessEqual(len(data["dates"]), 10)
        self.assertLessEqual(len(data["adm_1"]), 2)
        self.assertLessEqual(len(data["adm_0"]), 2)

        # Check date format using datetime
        parsed_date = datetime.strptime(data["dates"], "%Y-%m-%d").date()
        self.assertIsInstance(parsed_date, date)

        # Verify if the geocode is within the range for the Brazilian IBGE code
        self.assertGreaterEqual(data["adm_2"], 1100015)
        self.assertLessEqual(data["adm_2"], 5300108)

        # Check if "geocodigo" is in IBGE_code
        self.assertTrue(
            data["adm_2"]
            in [entry["geocodigo"] for entry in self.validation_data]
        )

        # Check if predict_date is after 2010 and not in the future
        self.assertGreaterEqual(parsed_date, date(2010, 1, 1))
        self.assertLessEqual(parsed_date, date.today())

    def test_validate_prediction_data(self):
        data = self.data[0]
        self.validate_prediction_data(data)

    def test_create_prediction(self):
        payload = PredictionIn(
            model=self.model.pk,
            description="Test description",
            ADM_level=1,
            commit="76eb927067cf54ae52da53503a14519d78a37da8",
            predict_date="2023-11-16",
            prediction=self.data,
        )

        request = HttpRequest()
        request.method = "POST"
        request.POST = payload.dict()

        response = create_prediction(request, payload)

        self.assertEqual(response[0], 201)
        self.assertEqual(Prediction.objects.count(), 1)
        prediction = Prediction.objects.first()
        self.assertEqual(prediction.model, self.model)
        self.assertEqual(prediction.description, "Test description")
        self.assertEqual(
            prediction.commit, "76eb927067cf54ae52da53503a14519d78a37da8"
        )

        # Check if predict_date is not in the future
        self.assertLessEqual(prediction.predict_date, date.today())

        # Check if predict_date is less than one year ago
        one_year_ago = datetime(2022, 11, 16) - timedelta(days=365)
        self.assertGreaterEqual(prediction.predict_date, one_year_ago.date())

    def test_create_prediction_invalid_payload(self):
        payload = PredictionIn(
            model=self.model.pk,
            description="x" * 501,
            ADM_level=4,
            commit="76eb927067cf54ae52da53503a14519d78a37da8",
            predict_date="2023-11-08",
            prediction=self.data,
        )

        request = HttpRequest()
        request.method = "POST"
        request.POST = payload.dict()

        response = create_prediction(request, payload)

        self.assertEqual(response[0], 422)
        self.assertEqual(
            response[1],
            {
                "message": "Description too big, maximum allowed: 500.\n"
                "        Please remove 1 characters."
            },
        )


class TestValidCreateModel(TestCase):
    def setUp(self):
        self.user, _ = CustomUser.objects.get_or_create(username="usertest")
        self.language = ImplementationLanguage.objects.create(
            language="MosqLang"
        )

        self.model = Model.objects.create(
            author=Author.objects.get_or_create(user=self.user)[0],
            name="Test Model",
            implementation_language=self.language,
        )

        self.payload = ModelIn(
            name="Test Model",
            description="Test description",
            repository="https://github.com/testuser/test-repo",
            implementation_language="Python",
            disease="dengue",
            temporal=True,
            spatial=True,
            categorical=True,
            ADM_level=3,
            time_resolution="month",
        )

    def test_validate_create_model(self):
        request = HttpRequest()
        request.method = "POST"
        request.POST = self.payload.dict()
        request.META[
            "HTTP_X_UID_KEY"
        ] = f"{self.user.username}:{self.model.author}"

        response = create_model(request, self.payload)
        self.assertEqual(response[0], 201)
        self.assertEqual(Model.objects.count(), 2)
        self.assertEqual(self.payload.name, "Test Model")
        self.assertEqual(self.payload.description, "Test description")
        self.assertEqual(
            self.payload.repository, "https://github.com/testuser/test-repo"
        )
        self.assertEqual(self.payload.ADM_level, 3)
        self.assertEqual(self.payload.implementation_language, "Python")
        self.assertEqual(self.payload.time_resolution, "month")

    def test_validate_repository(self):
        self.assertIsNone(validate_repository(self.payload.repository))
        invalid_repository = "https://gitlab.com/testuser/test-repo"
        self.assertEqual(
            validate_repository(invalid_repository),
            "Model repository must be on Github",
        )

    def test_validate_ADM_level(self):
        self.assertIsNone(validate_ADM_level(self.payload.ADM_level))
        invalid_ADM_level = 4
        self.assertEqual(
            validate_ADM_level(invalid_ADM_level),
            "ADM_level must be 0, 1, 2 or 3 "
            "(National, State, Municipality, or Sub Municipality)",
        )

    def test_validate_time_resolution(self):
        self.assertIsNone(
            validate_time_resolution(self.payload.time_resolution)
        )
        invalid_time_resolution = "quarter"
        self.assertEqual(
            validate_time_resolution(invalid_time_resolution),
            'Time resolution must be "day", "week", "month" or "year"',
        )

    def test_validate_implementation_language(self):
        self.assertIsNone(
            validate_implementation_language(
                self.payload.implementation_language
            )
        )

        similar_lang = [
            "Python",
            "C++",
            "CoffeeScript",
            "C#",
            "C",
            ".NET",
            "Erlang",
            "Go",
            "Haskell",
            "JavaScript",
            "Java",
            "Kotlin",
            "Lua",
            "R",
            "Ruby",
            "Rust",
            "Zig",
            "MosqLang",
        ]
        invalid_implementation_language = "msofusion"

        if invalid_implementation_language not in similar_lang:
            result = validate_implementation_language(
                invalid_implementation_language
            )
            expected_message = (
                f"Unknown language '{invalid_implementation_language}'. "
                "Please select one of the following languages or open a "
                f"GitHub issue to suggest a new one: {list(similar_lang)}"
            ).strip()
        else:
            result = validate_implementation_language(
                self.payload.implementation_language
            )
            expected_message = "Expected Result for Valid Language"

        self.assertEqual(result, (404, {"message": expected_message}))
