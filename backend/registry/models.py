from django.db import models
from django.utils.translation import gettext_lazy as _

from main.models import TimestampModel
from datastore.models import Adm0, Adm1, Adm2, Adm3
from datastore.models import Disease


class Sprint(models.Model):
    year = models.IntegerField()
    start_date = models.DateField(help_text="Start submission date")
    end_date = models.DateField(help_text="End submission date")

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"Sprint {self.year}"


class Organization(TimestampModel):
    name = models.CharField(max_length=100, unique=True)
    members = models.ManyToManyField(
        "users.CustomUser",
        through="OrganizationMembership",
        related_name="organizations",
        blank=True,
    )
    avatar = models.ImageField(
        upload_to="model_avatars/", null=True, blank=True
    )
    avatar_url = models.URLField(blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)


class OrganizationMembership(TimestampModel):
    class Roles(models.TextChoices):
        OWNER = "owner", _("Owner")
        MAINTAINER = "maintainer", _("Maintainer")
        CONTRIBUTOR = "contributor", _("Contributor")

    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=20, choices=Roles.choices, default="contributor"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "organization")


class RepositoryContributor(TimestampModel):
    class Permissions(models.TextChoices):
        ADMIN = "admin", "Admin"
        WRITE = "write", _("Write")

    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE)
    repository = models.ForeignKey(
        "Repository",
        on_delete=models.CASCADE,
        related_name="repository_contributors",
    )
    permission = models.CharField(max_length=10, choices=Permissions.choices)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "repository")


class Repository(TimestampModel):
    class Providers(models.TextChoices):
        GITHUB = "github", "GitHub"
        GITLAB = "gitlab", "GitLab"

    repo_id = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=10, choices=Providers.choices)
    owner = models.ForeignKey(
        "users.CustomUser",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repos",
    )
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repos",
    )
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "repo_id"],
                name="unique_repo_id_per_provider",
            ),
            models.UniqueConstraint(
                fields=["provider", "owner", "organization", "name"],
                name="unique_repo_name_context",
            ),
            models.CheckConstraint(
                check=(
                    (
                        models.Q(owner__isnull=False)
                        & models.Q(organization__isnull=True)
                    )
                    | (
                        models.Q(owner__isnull=True)
                        & models.Q(organization__isnull=False)
                    )
                ),
                name="repo_owner_or_org_xor",
            ),
        ]

    def __str__(self):
        owner = self.owner.username if self.owner else self.organization.name
        return f"{owner}/{self.name} ({self.provider})"


class RepositoryModel(TimestampModel):
    class Periodicity(models.TextChoices):
        DAY = "day", _("Day")
        WEEK = "week", _("Week")
        MONTH = "month", _("Month")
        YEAR = "year", _("Year")

    class AdministrativeLevel(models.IntegerChoices):
        NATIONAL = 0, _("National")
        STATE = 1, _("State")
        MUNICIPALITY = 2, _("Municipality")
        SUB_MUNICIPALITY = 3, _("Sub Municipality")

    class Category(models.TextChoices):
        QUANTITATIVE = "quantitative", _("Quantitative")
        CATEGORICAL = "categorical", _("Categorical")
        SPATIAL_QUANTITATIVE = "spatial_quantitative", _(
            "Spatial Quantitative"
        )
        SPATIAL_CATEGORICAL = "spatial_categorical", _("Spatial Categorical")
        SPATIO_TEMPORAL_QUANTITATIVE = (
            "spatio_temporal_quantitative",
            _("Spatio-temporal Quantitative"),
        )
        SPATIO_TEMPORAL_CATEGORICAL = (
            "spatio_temporal_categorical",
            _("Spatio-temporal Categorical"),
        )

        @property
        def meta(self):
            return self.CategoryMeta[self.value]

        @property
        def help_text(self):
            m = self.meta
            return (
                f"Domain: {m['domain']} | Output: {m['output']} | "
                f"Ex: {m['example']}"
            )

    Category.CategoryMeta = {
        Category.QUANTITATIVE: {
            "domain": _("Time"),
            "output": _("Numeric (vectorial or scalar)"),
            "example": _("Time series"),
            "description": _("Models that output numeric values over time."),
        },
        Category.CATEGORICAL: {
            "domain": _("Time"),
            "output": _("Single or Multiple Categories"),
            "example": _("Alert levels"),
            "description": _("Models that classify status over time."),
        },
        Category.SPATIAL_QUANTITATIVE: {
            "domain": _("Space"),
            "output": _("Numerical values"),
            "example": _("Choropleth maps"),
            "description": _(
                "Models that output numeric values across a geographical area."
            ),
        },
        Category.SPATIAL_CATEGORICAL: {
            "domain": _("Space"),
            "output": _("Single or Multiple Categories"),
            "example": _("Choropleth maps (Categorical)"),
            "description": _("Models that classify regions into categories."),
        },
        Category.SPATIO_TEMPORAL_QUANTITATIVE: {
            "domain": _("Time and Space"),
            "output": _("Numeric"),
            "example": _("Animated maps"),
            "description": _(
                "Models that predict numeric values across both time and space."
            ),
        },
        Category.SPATIO_TEMPORAL_CATEGORICAL: {
            "domain": _("Time and Space"),
            "output": _("Maps and Categories"),
            "example": _("Animated maps (Categorical)"),
            "description": _("Models that classify regions over time."),
        },
    }

    repository = models.OneToOneField(
        Repository, on_delete=models.CASCADE, related_name="model"
    )
    disease = models.ForeignKey(
        Disease, related_name="models", on_delete=models.PROTECT
    )
    description = models.TextField(max_length=500, null=True, blank=True)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        help_text=_(
            "The forecasting model category based on domain and output type."
        ),
    )
    adm_level = models.IntegerField(choices=AdministrativeLevel.choices)
    time_resolution = models.CharField(
        max_length=10, choices=Periodicity.choices
    )
    sprint = models.ForeignKey(
        Sprint, null=True, on_delete=models.PROTECT, default=None
    )

    def __str__(self):
        return f"{self.repository.name} ({self.get_category_display()})"

    class Meta:
        verbose_name = _("Model")
        verbose_name_plural = _("Models")


class ModelPrediction(models.Model):
    class CaseDefinition(models.TextChoices):
        REPORTED = "reported", _("Reported")
        PROBABLE = "probable", _("Probable")

    model = models.ForeignKey(
        RepositoryModel,
        on_delete=models.CASCADE,
        related_name="predicts",
    )
    adm0 = models.ForeignKey(
        Adm0, null=True, blank=True, on_delete=models.PROTECT
    )
    adm1 = models.ForeignKey(
        Adm1, null=True, blank=True, on_delete=models.PROTECT
    )
    adm2 = models.ForeignKey(
        Adm2, null=True, blank=True, on_delete=models.PROTECT
    )
    adm3 = models.ForeignKey(
        Adm3, null=True, blank=True, on_delete=models.PROTECT
    )
    commit = models.CharField(max_length=100)
    description = models.TextField(max_length=500, null=True, blank=True)
    predict_date = models.DateField()
    case_definition = models.CharField(
        max_length=20,
        default=CaseDefinition.REPORTED,
        choices=CaseDefinition.choices,
    )
    published = models.BooleanField(null=False, default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class QuantitativePrediction(ModelPrediction):
    mae_score = models.FloatField(null=True, default=None)
    mse_score = models.FloatField(null=True, default=None)
    crps_score = models.FloatField(null=True, default=None)
    log_score = models.FloatField(null=True, default=None)
    interval_score = models.FloatField(null=True, default=None)
    wis_score = models.FloatField(null=True, default=None)

    @property
    def scores(self) -> dict:
        return {
            "mae": round(self.mae_score, 2) if self.mae_score else None,
            "mse": round(self.mse_score, 2) if self.mse_score else None,
            "crps": round(self.crps_score, 2) if self.crps_score else None,
            "log_score": round(self.log_score, 2) if self.log_score else None,
            "interval_score": (
                round(self.interval_score, 2) if self.interval_score else None
            ),
            "wis": round(self.wis_score, 2) if self.wis_score else None,
        }


class QuantitativePredictionRow(models.Model):
    prediction = models.ForeignKey(
        QuantitativePrediction, on_delete=models.CASCADE, related_name="data"
    )
    date = models.DateField(null=False)
    pred = models.FloatField(null=False)
    lower_95 = models.FloatField(null=True)
    lower_90 = models.FloatField(null=False)
    lower_80 = models.FloatField(null=True)
    lower_50 = models.FloatField(null=True)
    upper_50 = models.FloatField(null=True)
    upper_80 = models.FloatField(null=True)
    upper_90 = models.FloatField(null=False)
    upper_95 = models.FloatField(null=True)

    class Meta:
        ordering = ["date"]
        indexes = [
            models.Index(fields=["prediction", "date"]),
        ]


class Publication(TimestampModel):
    class Type(models.TextChoices):
        CONFERENCE = "conference", _("Conference Proceeding")
        JOURNAL = "journal", _("Journal Article")
        PREPRINT = "preprint", _("Preprint")
        THESIS = "thesis", _("Thesis/Dissertation")
        REPORT = "report", _("Technical Report")
        OTHER = "other", _("Other")

    title = models.CharField(
        max_length=500,
        help_text=_("The full title of the publication."),
    )
    authors_list = models.TextField(
        help_text=_(
            "Full list of authors as they appear in the citation "
            "(e.g., 'Silva, J.; Doe, J.')."
        )
    )
    publication_type = models.CharField(
        max_length=20, choices=Type.choices, default=Type.JOURNAL
    )
    year = models.IntegerField(help_text=_("Year of publication"))
    date = models.DateField(
        null=True,
        blank=True,
        help_text=_(
            "Specific publication date if available (e.g. for preprints)."
        ),
    )
    venue = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text=_(
            "Name of the Journal, Conference, or Institution (for theses)."
        ),
    )
    volume = models.CharField(max_length=50, null=True, blank=True)
    issue = models.CharField(max_length=50, null=True, blank=True)
    pages = models.CharField(max_length=50, null=True, blank=True)
    doi = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="DOI",
        help_text=_("Digital Object Identifier (e.g., 10.1098/rsos.241261)"),
    )
    url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text=_("Link to the paper or PDF."),
    )
    related_models = models.ManyToManyField(
        RepositoryModel,
        blank=True,
        related_name="publications",
        help_text=_("Models discussed or used in this publication."),
    )
    related_sprints = models.ManyToManyField(
        Sprint,
        blank=True,
        related_name="publications",
        help_text=_("Sprints associated with this publication."),
    )

    class Meta:
        ordering = ["-year", "-date", "title"]
        verbose_name = _("Publication")
        verbose_name_plural = _("Publications")

    def __str__(self):
        return f"{self.title} ({self.year})"

    @property
    def citation_preview(self):
        return (
            f"{self.authors_list} ({self.year}). {self.title}. {self.venue}."
        )
