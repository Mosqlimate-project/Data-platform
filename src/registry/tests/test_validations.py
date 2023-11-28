import json
from pathlib import Path

from django.http import HttpRequest
from django.test import TestCase
from ninja import Router
from registry.api import ModelIn, create_model
from registry.models import Author, ImplementationLanguage, Model
from users.models import CustomUser

app_dir = Path(__file__).parent.parent

router = Router()

from registry.validations import (
    validate_ADM_level,
    validate_implementation_language,
    validate_repository,
    validate_time_resolution,
)


class TestValidCreateModel(TestCase):
    def setUp(self):
        self.user, _ = CustomUser.objects.get_or_create(username="usertest")
        self.language = ImplementationLanguage.objects.create(
            language="MosqLang"
        )
        with open(
            app_dir / "tests/data/original_prediction.test.json", "r"
        ) as file:
            self.data = json.load(file)
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
            type="valid_data",
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
            "ADM_level must be 0, 1, 2 or 3 (National, State, Municipality, or Sub Municipality)",
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
        # Test valid implementation Language
        self.assertIsNone(
            validate_implementation_language(
                self.payload.implementation_language
            )
        )

        # Test invavalid implementation Language
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
            "AnotherLang",
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
            ).strip()  # Strip extra whitespace from the expected message
        else:
            result = validate_implementation_language(
                self.payload.implementation_language
            )
            expected_message = "Expected Result for Valid Language"

        self.assertEqual(result, (404, {"message": expected_message}))
