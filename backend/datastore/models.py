from django.db import models
from asgiref.sync import async_to_sync
from django.utils.translation import gettext as _
from django.contrib.postgres.indexes import GinIndex
from .utils.fetch_icd import get_diseases


class EpiscannerSirParams(models.Model):
    cid10 = models.CharField(max_length=10)  # type: ignore[var-annotated]
    geocode = models.ForeignKey(  # type: ignore[var-annotated]
        "datastore.Adm2",
        to_field="geocode",
        db_column="geocode",
        on_delete=models.DO_NOTHING,
    )
    year = models.IntegerField()  # type: ignore[var-annotated]
    ep_ini = models.CharField(max_length=20, null=True, blank=True)  # type: ignore[var-annotated]
    ep_pw = models.CharField(max_length=20)  # type: ignore[var-annotated]
    ep_end = models.CharField(max_length=20, null=True, blank=True)  # type: ignore[var-annotated]
    ep_dur = models.IntegerField(null=True, blank=True)  # type: ignore[var-annotated]
    peak_week = models.FloatField()  # type: ignore[var-annotated]
    beta = models.FloatField()  # type: ignore[var-annotated]
    gamma = models.FloatField()  # type: ignore[var-annotated]
    r0 = models.FloatField()  # type: ignore[var-annotated]
    total_cases = models.FloatField()  # type: ignore[var-annotated]
    alpha = models.FloatField()  # type: ignore[var-annotated]
    sum_res = models.FloatField()  # type: ignore[var-annotated]
    t_ini = models.IntegerField(null=True, blank=True)  # type: ignore[var-annotated]
    t_end = models.IntegerField(null=True, blank=True)  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = '"episcanner"."sir_params"'
        constraints = [
            models.UniqueConstraint(
                fields=["cid10", "geocode", "year"],
                name="uq_sir_params_cid10_geocode_year",
            ),
        ]


class VegetationIndexMetric(models.Model):
    date = models.DateField(primary_key=True)  # type: ignore[var-annotated]
    geocode = models.IntegerField()  # type: ignore[var-annotated]
    collection = models.CharField(max_length=255)  # type: ignore[var-annotated]
    attribute = models.CharField(max_length=50)  # type: ignore[var-annotated]
    mean = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    std = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    median = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    q25 = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    q75 = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    min = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]
    max = models.FloatField(null=True, blank=True)  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = "vegetation_index_metrics"
        constraints = [
            models.UniqueConstraint(
                fields=["date", "geocode", "collection", "attribute"],
                name="unique_vegetation_index_metric",
            )
        ]

    def __str__(self):
        return f"{self.geocode} - {self.collection} - {self.attribute} ({self.date})"


class ContaOvos(models.Model):
    counting_id = models.BigIntegerField(unique=True, primary_key=True)  # type: ignore[var-annotated]
    date = models.DateField()  # type: ignore[var-annotated]
    date_collect = models.DateField()  # type: ignore[var-annotated]
    eggs = models.PositiveIntegerField()  # type: ignore[var-annotated]
    latitude = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=15,
        decimal_places=10,
    )
    longitude = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=15,
        decimal_places=10,
    )
    adm2 = models.ForeignKey("datastore.Adm2", on_delete=models.PROTECT)  # type: ignore[var-annotated]
    ovitrap_id = models.CharField(max_length=50)  # type: ignore[var-annotated]
    ovitrap_website_id = models.IntegerField()  # type: ignore[var-annotated]
    time = models.DateTimeField()  # type: ignore[var-annotated]
    week = models.PositiveSmallIntegerField()  # type: ignore[var-annotated]
    year = models.PositiveSmallIntegerField()  # type: ignore[var-annotated]

    def __str__(self):
        return f"Count {self.counting_id} - {self.adm2.geocode} ({self.date})"

    class Meta:
        verbose_name = "Ovitrap Counting"
        verbose_name_plural = "Ovitrap Countings"
        ordering = ["-date"]


class Adm0(models.Model):
    geocode = models.CharField(primary_key=True, max_length=3, unique=True)  # type: ignore[var-annotated]
    name = models.CharField(null=False, max_length=100)  # type: ignore[var-annotated]

    def __str__(self):
        return f"{self.name} ({self.geocode})"

    class Meta:
        verbose_name = "Country"
        verbose_name_plural = "Countries"


class Adm1(models.Model):
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)  # type: ignore[var-annotated]
    name = models.CharField(null=False, max_length=100)  # type: ignore[var-annotated]
    country = models.ForeignKey(  # type: ignore[var-annotated]
        Adm0, on_delete=models.PROTECT, related_name="states"
    )

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = "State"
        verbose_name_plural = "States"


class Adm2(models.Model):
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)  # type: ignore[var-annotated]
    name = models.CharField(null=False, max_length=100)  # type: ignore[var-annotated]
    adm1 = models.ForeignKey(  # type: ignore[var-annotated]
        Adm1, on_delete=models.PROTECT, related_name="cities"
    )

    def __str__(self):
        return f"{self.name}"

    @property
    def country(self):
        return self.adm1.country

    class Meta:
        verbose_name = "City"
        verbose_name_plural = "Cities"


class Adm3(models.Model):
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)  # type: ignore[var-annotated]
    name = models.CharField(null=False, max_length=100)  # type: ignore[var-annotated]
    adm2 = models.ForeignKey(  # type: ignore[var-annotated]
        Adm2, on_delete=models.PROTECT, related_name="districts"
    )

    def __str__(self):
        return f"{self.name}"

    @property
    def state(self):
        return self.adm2.adm1

    class Meta:
        verbose_name = "District"
        verbose_name_plural = "Districts"


class ICD(models.Model):
    class ICDSystems(models.TextChoices):
        ICD10 = "ICD-10", _("ICD-10")
        ICD11 = "ICD-11", _("ICD-11")

    system = models.CharField(max_length=10, choices=ICDSystems.choices)  # type: ignore[var-annotated]
    version = models.CharField(max_length=50)  # type: ignore[var-annotated]
    release_date = models.DateField(null=True)  # type: ignore[var-annotated]

    class Meta:
        unique_together = ("system", "version")

    def __str__(self):
        return f"{self.system} ({self.version})"

    @property
    def year(self) -> int:
        if self.system == "ICD-10":
            return int(self.version)
        elif self.system == "ICD-11":
            return int(self.version[:4])
        else:
            raise ValueError("Unknown ICD System")

    def fetch_diseases(
        self, client_id: str, client_secret: str, language: str = "en"
    ):
        if self.system == "ICD-10":
            base_url = f"https://id.who.int/icd/release/10/{self.version}/"
        elif self.system == "ICD-11":
            base_url = f"https://id.who.int/icd/release/11/{self.version}/mms/"
        else:
            raise ValueError("Unknown ICD System")

        process = async_to_sync(self._create_diseases)
        process(base_url, client_id, client_secret, language)

    async def _create_diseases(
        self, base_url, client_id, client_secret, language
    ):
        batch_size = 5000
        batch = []

        async for d in get_diseases(
            base_url,
            client_id,
            client_secret,
            language,
        ):
            disease = Disease(
                icd=self,
                code=d.code,
                name=d.name,
                description=d.description or "",
            )
            batch.append(disease)

            if len(batch) >= batch_size:
                await Disease.objects.abulk_create(
                    batch,
                    ignore_conflicts=True,
                )
                batch = []

        if batch:
            await Disease.objects.abulk_create(batch, ignore_conflicts=True)


class Disease(models.Model):
    icd = models.ForeignKey(  # type: ignore[var-annotated]
        ICD, on_delete=models.CASCADE, related_name="diseases"
    )
    code = models.CharField(max_length=20)  # type: ignore[var-annotated]
    name = models.CharField(max_length=255)  # type: ignore[var-annotated]
    description = models.TextField(blank=True, null=True)  # type: ignore[var-annotated]

    class Meta:
        verbose_name = "Disease"
        verbose_name_plural = "Diseases"
        unique_together = ("icd", "code")
        indexes = [
            GinIndex(
                fields=["name"],
                name="idx_disease_name_gin",
                opclasses=["gin_trgm_ops"],
            ),
            GinIndex(
                fields=["description"],
                name="idx_disease_desc_gin",
                opclasses=["gin_trgm_ops"],
            ),
        ]

    def __str__(self):
        return self.name


class Municipio(models.Model):
    geocodigo = models.IntegerField(  # type: ignore[var-annotated]
        primary_key=True, db_column="geocodigo", db_index=True
    )
    nome = models.CharField(db_column="nome")  # type: ignore[var-annotated]
    uf = models.CharField(db_column="uf")  # type: ignore[var-annotated]
    regional_code = models.IntegerField(db_column="id_regional")  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = '"Municipio"'


class HistoricoAlerta(models.Model):
    data_iniSE = models.DateField(  # type: ignore[var-annotated]
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")  # type: ignore[var-annotated]
    casos_est = models.FloatField(db_column="casos_est")  # type: ignore[var-annotated]
    casos_est_min = models.IntegerField(db_column="casos_est_min")  # type: ignore[var-annotated]
    casos_est_max = models.IntegerField(db_column="casos_est_max")  # type: ignore[var-annotated]
    casos = models.IntegerField(db_column="casos")  # type: ignore[var-annotated]
    municipio_geocodigo = models.IntegerField(  # type: ignore[var-annotated]
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")  # type: ignore[var-annotated]
    p_inc100k = models.FloatField(db_column="p_inc100k")  # type: ignore[var-annotated]
    Localidade_id = models.IntegerField(db_column="Localidade_id")  # type: ignore[var-annotated]
    nivel = models.SmallIntegerField(db_column="nivel")  # type: ignore[var-annotated]
    id = models.BigAutoField(primary_key=True, db_column="id")  # type: ignore[var-annotated]
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")  # type: ignore[var-annotated]
    municipio_nome = models.CharField(  # type: ignore[var-annotated]
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")  # type: ignore[var-annotated]
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")  # type: ignore[var-annotated]
    tempmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")  # type: ignore[var-annotated]
    transmissao = models.SmallIntegerField(db_column="transmissao")  # type: ignore[var-annotated]
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")  # type: ignore[var-annotated]
    umidmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")  # type: ignore[var-annotated]
    casprov_est = models.FloatField(db_column="casprov_est")  # type: ignore[var-annotated]
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")  # type: ignore[var-annotated]
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")  # type: ignore[var-annotated]
    casconf = models.IntegerField(db_column="casconf")  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = '"Historico_alerta"'


class HistoricoAlertaChik(models.Model):
    data_iniSE = models.DateField(  # type: ignore[var-annotated]
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")  # type: ignore[var-annotated]
    casos_est = models.FloatField(db_column="casos_est")  # type: ignore[var-annotated]
    casos_est_min = models.IntegerField(db_column="casos_est_min")  # type: ignore[var-annotated]
    casos_est_max = models.IntegerField(db_column="casos_est_max")  # type: ignore[var-annotated]
    casos = models.IntegerField(db_column="casos")  # type: ignore[var-annotated]
    municipio_geocodigo = models.IntegerField(  # type: ignore[var-annotated]
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")  # type: ignore[var-annotated]
    p_inc100k = models.FloatField(db_column="p_inc100k")  # type: ignore[var-annotated]
    Localidade_id = models.IntegerField(db_column="Localidade_id")  # type: ignore[var-annotated]
    nivel = models.SmallIntegerField(db_column="nivel")  # type: ignore[var-annotated]
    id = models.BigAutoField(primary_key=True, db_column="id")  # type: ignore[var-annotated]
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")  # type: ignore[var-annotated]
    municipio_nome = models.CharField(  # type: ignore[var-annotated]
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")  # type: ignore[var-annotated]
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")  # type: ignore[var-annotated]
    tempmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")  # type: ignore[var-annotated]
    transmissao = models.SmallIntegerField(db_column="transmissao")  # type: ignore[var-annotated]
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")  # type: ignore[var-annotated]
    umidmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")  # type: ignore[var-annotated]
    casprov_est = models.FloatField(db_column="casprov_est")  # type: ignore[var-annotated]
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")  # type: ignore[var-annotated]
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")  # type: ignore[var-annotated]
    casconf = models.IntegerField(db_column="casconf")  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = '"Historico_alerta_chik"'


class HistoricoAlertaZika(models.Model):
    data_iniSE = models.DateField(  # type: ignore[var-annotated]
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")  # type: ignore[var-annotated]
    casos_est = models.FloatField(db_column="casos_est")  # type: ignore[var-annotated]
    casos_est_min = models.IntegerField(db_column="casos_est_min")  # type: ignore[var-annotated]
    casos_est_max = models.IntegerField(db_column="casos_est_max")  # type: ignore[var-annotated]
    casos = models.IntegerField(db_column="casos")  # type: ignore[var-annotated]
    municipio_geocodigo = models.IntegerField(  # type: ignore[var-annotated]
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")  # type: ignore[var-annotated]
    p_inc100k = models.FloatField(db_column="p_inc100k")  # type: ignore[var-annotated]
    Localidade_id = models.IntegerField(db_column="Localidade_id")  # type: ignore[var-annotated]
    nivel = models.SmallIntegerField(db_column="nivel")  # type: ignore[var-annotated]
    id = models.BigAutoField(primary_key=True, db_column="id")  # type: ignore[var-annotated]
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")  # type: ignore[var-annotated]
    municipio_nome = models.CharField(  # type: ignore[var-annotated]
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")  # type: ignore[var-annotated]
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")  # type: ignore[var-annotated]
    tempmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")  # type: ignore[var-annotated]
    transmissao = models.SmallIntegerField(db_column="transmissao")  # type: ignore[var-annotated]
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")  # type: ignore[var-annotated]
    umidmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(  # type: ignore[var-annotated]
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")  # type: ignore[var-annotated]
    casprov_est = models.FloatField(db_column="casprov_est")  # type: ignore[var-annotated]
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")  # type: ignore[var-annotated]
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")  # type: ignore[var-annotated]
    casconf = models.IntegerField(db_column="casconf")  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = '"Historico_alerta_zika"'


class CopernicusBrasil(models.Model):
    date = models.DateField(db_column="date", primary_key=True)  # type: ignore[var-annotated]
    geocodigo = models.BigIntegerField(db_column="geocode")  # type: ignore[var-annotated]
    epiweek = models.IntegerField(db_column="epiweek")  # type: ignore[var-annotated]
    temp_min = models.FloatField(db_column="temp_min")  # type: ignore[var-annotated]
    temp_med = models.FloatField(db_column="temp_med")  # type: ignore[var-annotated]
    temp_max = models.FloatField(db_column="temp_max")  # type: ignore[var-annotated]
    precip_min = models.FloatField(db_column="precip_min")  # type: ignore[var-annotated]
    precip_med = models.FloatField(db_column="precip_med")  # type: ignore[var-annotated]
    precip_max = models.FloatField(db_column="precip_max")  # type: ignore[var-annotated]
    precip_tot = models.FloatField(db_column="precip_tot")  # type: ignore[var-annotated]
    pressao_min = models.FloatField(db_column="pressao_min")  # type: ignore[var-annotated]
    pressao_med = models.FloatField(db_column="pressao_med")  # type: ignore[var-annotated]
    pressao_max = models.FloatField(db_column="pressao_max")  # type: ignore[var-annotated]
    umid_min = models.FloatField(db_column="umid_min")  # type: ignore[var-annotated]
    umid_med = models.FloatField(db_column="umid_med")  # type: ignore[var-annotated]
    umid_max = models.FloatField(db_column="umid_max")  # type: ignore[var-annotated]

    class Meta:
        managed = False
        db_table = "copernicus_bra"
        constraints = [
            models.UniqueConstraint(
                fields=["date", "geocodigo"], name="composite_primary_key"
            )
        ]
