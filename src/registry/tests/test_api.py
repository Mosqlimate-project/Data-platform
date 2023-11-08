import json
from pathlib import Path

from django.test import TestCase
from django.http import HttpRequest
from ninja import Router

from registry.models import Author, Model, Prediction, ImplementationLanguage
from users.models import CustomUser
from registry.api import PredictionIn, create_prediction


app_dir = Path(__file__).parent.parent

router = Router()


@router.post(
    "/create-prediction/", response={int: str}, tags=["registry", "Predictions"]
)
class TestCreatePrediction(TestCase):
    def setUp(self):
        data_path = app_dir / "tests/data/prediction.test.json"
        with open(data_path, "r") as file:
            self.data = json.load(file)

        user, created = CustomUser.objects.get_or_create(username="esloch")

        language = ImplementationLanguage.objects.create(language="MosqLang")

        self.model = Model.objects.create(
            author=Author.objects.get_or_create(user=user)[0],
            name="Test Model",
            implementation_language=language,
        )

    def test_create_prediction(self):
        # breakpoint()
        payload = PredictionIn(
            model=self.model.pk,
            description="Test description",
            ADM_level=1,
            value=42.0,
            commit="76eb927067cf54ae52da53503a14519d78a37da8",
            predict_date="2023-11-08",
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
        self.assertEqual(prediction.ADM_level, 1)
        self.assertEqual(prediction.value, 42.0)

    def test_create_prediction_invalid_payload(self):
        payload = PredictionIn(
            model=self.model.pk,
            description="x" * 501,
            ADM_level=4,
            value=42.0,
            commit="76eb927067cf54ae52da53503a14519d78a37da8",
            predict_date="2023-11-08",
            prediction=self.data,
        )

        request = HttpRequest()
        request.method = "POST"
        request.POST = payload.dict()

        response = create_prediction(request, payload)

        self.assertEqual(response[0], 403)
        self.assertEqual(
            response[1],
            {
                "message": "Description too big, maximum allowed: 500."
                + "Please remove 1 character."
            },
        )
