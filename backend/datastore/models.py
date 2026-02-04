from django.db import models
from asgiref.sync import async_to_sync
from django.utils.translation import gettext as _
from django.contrib.postgres.indexes import GinIndex
from .utils.fetch_icd import get_diseases


class Adm0(models.Model):
    geocode = models.CharField(primary_key=True, max_length=3, unique=True)
    name = models.CharField(null=False, max_length=100)

    def __str__(self):
        return f"{self.name} ({self.geocode})"

    class Meta:
        verbose_name = "Country"
        verbose_name_plural = "Countries"


class Adm1(models.Model):
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)
    name = models.CharField(null=False, max_length=100)
    country = models.ForeignKey(
        Adm0, on_delete=models.PROTECT, related_name="states"
    )

    def __str__(self):
        return f"{self.name}"

    class Meta:
        verbose_name = "State"
        verbose_name_plural = "States"


class Adm2(models.Model):
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)
    name = models.CharField(null=False, max_length=100)
    adm1 = models.ForeignKey(
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
    geocode = models.CharField(primary_key=True, max_length=20, unique=True)
    name = models.CharField(null=False, max_length=100)
    adm2 = models.ForeignKey(
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

    system = models.CharField(max_length=10, choices=ICDSystems.choices)
    version = models.CharField(max_length=50)
    release_date = models.DateField(null=True)

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
                    batch, ignore_conflicts=True
                )
                batch = []

        if batch:
            await Disease.objects.abulk_create(batch, ignore_conflicts=True)


class Disease(models.Model):
    icd = models.ForeignKey(
        ICD, on_delete=models.CASCADE, related_name="diseases"
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

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
    geocodigo = models.IntegerField(
        primary_key=True, db_column="geocodigo", db_index=True
    )
    nome = models.CharField(db_column="nome")
    uf = models.CharField(db_column="uf")
    regional_code = models.IntegerField(db_column="id_regional")

    class Meta:
        managed = False
        db_table = '"Municipio"'


class HistoricoAlerta(models.Model):
    data_iniSE = models.DateField(
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")
    casos_est = models.FloatField(db_column="casos_est")
    casos_est_min = models.IntegerField(db_column="casos_est_min")
    casos_est_max = models.IntegerField(db_column="casos_est_max")
    casos = models.IntegerField(db_column="casos")
    municipio_geocodigo = models.IntegerField(
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")
    p_inc100k = models.FloatField(db_column="p_inc100k")
    Localidade_id = models.IntegerField(db_column="Localidade_id")
    nivel = models.SmallIntegerField(db_column="nivel")
    id = models.BigAutoField(primary_key=True, db_column="id")
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")
    municipio_nome = models.CharField(
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")
    tempmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")
    transmissao = models.SmallIntegerField(db_column="transmissao")
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")
    umidmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")
    casprov_est = models.FloatField(db_column="casprov_est")
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")
    casconf = models.IntegerField(db_column="casconf")

    class Meta:
        managed = False
        db_table = '"Historico_alerta"'


class HistoricoAlertaChik(models.Model):
    data_iniSE = models.DateField(
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")
    casos_est = models.FloatField(db_column="casos_est")
    casos_est_min = models.IntegerField(db_column="casos_est_min")
    casos_est_max = models.IntegerField(db_column="casos_est_max")
    casos = models.IntegerField(db_column="casos")
    municipio_geocodigo = models.IntegerField(
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")
    p_inc100k = models.FloatField(db_column="p_inc100k")
    Localidade_id = models.IntegerField(db_column="Localidade_id")
    nivel = models.SmallIntegerField(db_column="nivel")
    id = models.BigAutoField(primary_key=True, db_column="id")
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")
    municipio_nome = models.CharField(
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")
    tempmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")
    transmissao = models.SmallIntegerField(db_column="transmissao")
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")
    umidmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")
    casprov_est = models.FloatField(db_column="casprov_est")
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")
    casconf = models.IntegerField(db_column="casconf")

    class Meta:
        managed = False
        db_table = '"Historico_alerta_chik"'


class HistoricoAlertaZika(models.Model):
    data_iniSE = models.DateField(
        null=False, db_column="data_iniSE", db_index=True
    )
    SE = models.IntegerField(null=False, db_column="SE")
    casos_est = models.FloatField(db_column="casos_est")
    casos_est_min = models.IntegerField(db_column="casos_est_min")
    casos_est_max = models.IntegerField(db_column="casos_est_max")
    casos = models.IntegerField(db_column="casos")
    municipio_geocodigo = models.IntegerField(
        null=False, db_column="municipio_geocodigo"
    )
    p_rt1 = models.FloatField(db_column="p_rt1")
    p_inc100k = models.FloatField(db_column="p_inc100k")
    Localidade_id = models.IntegerField(db_column="Localidade_id")
    nivel = models.SmallIntegerField(db_column="nivel")
    id = models.BigAutoField(primary_key=True, db_column="id")
    versao_modelo = models.CharField(max_length=40, db_column="versao_modelo")
    municipio_nome = models.CharField(
        max_length=128, db_column="municipio_nome"
    )
    tweet = models.DecimalField(
        max_digits=5,
        decimal_places=0,
        null=True,
        default=None,
        db_column="tweet",
    )
    Rt = models.FloatField(null=True, default=None, db_column="Rt")
    pop = models.DecimalField(max_digits=10, decimal_places=0, db_column="pop")
    tempmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmin"
    )
    umidmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmax"
    )
    receptivo = models.SmallIntegerField(db_column="receptivo")
    transmissao = models.SmallIntegerField(db_column="transmissao")
    nivel_inc = models.SmallIntegerField(db_column="nivel_inc")
    umidmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmed"
    )
    umidmin = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="umidmin"
    )
    tempmed = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmed"
    )
    tempmax = models.DecimalField(
        max_digits=10, decimal_places=2, db_column="tempmax"
    )
    casprov = models.IntegerField(db_column="casprov")
    casprov_est = models.FloatField(db_column="casprov_est")
    casprov_est_min = models.IntegerField(db_column="casprov_est_min")
    casprov_est_max = models.IntegerField(db_column="casprov_est_max")
    casconf = models.IntegerField(db_column="casconf")

    class Meta:
        managed = False
        db_table = '"Historico_alerta_zika"'


class CopernicusBrasil(models.Model):
    date = models.DateField(db_column="date", primary_key=True)
    geocodigo = models.BigIntegerField(db_column="geocode")
    epiweek = models.IntegerField(db_column="epiweek")
    temp_min = models.FloatField(db_column="temp_min")
    temp_med = models.FloatField(db_column="temp_med")
    temp_max = models.FloatField(db_column="temp_max")
    precip_min = models.FloatField(db_column="precip_min")
    precip_med = models.FloatField(db_column="precip_med")
    precip_max = models.FloatField(db_column="precip_max")
    precip_tot = models.FloatField(db_column="precip_tot")
    pressao_min = models.FloatField(db_column="pressao_min")
    pressao_med = models.FloatField(db_column="pressao_med")
    pressao_max = models.FloatField(db_column="pressao_max")
    umid_min = models.FloatField(db_column="umid_min")
    umid_med = models.FloatField(db_column="umid_med")
    umid_max = models.FloatField(db_column="umid_max")

    class Meta:
        managed = False
        db_table = "copernicus_bra"
        constraints = [
            models.UniqueConstraint(
                fields=["date", "geocodigo"], name="composite_primary_key"
            )
        ]
