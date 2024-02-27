from django import forms
from django.utils.translation import gettext as _


class UpdateAuthorForm(forms.Form):
    first_name = forms.CharField(max_length=100)
    last_name = forms.CharField(max_length=100)
    institution = forms.CharField(max_length=100, required=False)

    def clean_institution(self):
        institution_value = self.cleaned_data["institution"].strip()
        if not institution_value:
            return None
        return institution_value


class UpdateModelForm(forms.Form):
    # TODO: Should the user be able of changing the Model's Author?
    # model_author = forms.ModelChoiceField(queryset=Author.objects.all())
    model_id = forms.IntegerField()
    model_name = forms.CharField(max_length=100, required=True)
    model_description = forms.CharField(max_length=500, required=True)
    model_repository = forms.CharField(max_length=200, required=True)
    model_language = forms.CharField(max_length=100, required=True)
    model_adm_level = forms.IntegerField(
        max_value=3, min_value=0, required=True
    )
    model_disease = forms.ChoiceField(
        required=True,
        choices=[
            ("dengue", "Dengue"),
            ("zika", "Zika"),
            ("chikungunya", "Chikungunya"),
        ],
    )
    model_spatial = forms.BooleanField(required=True)
    model_temporal = forms.BooleanField(required=True)
    model_categorical = forms.BooleanField(required=True)
    model_time_resolution = forms.ChoiceField(
        required=True,
        choices=[
            ("day", _("Day")),
            ("week", _("Week")),
            ("month", _("Month")),
            ("year", _("Year")),
        ],
    )

    # def clean_model_author(self):
    #     author = self.cleaned_data["model_author"]
    #     if not Author.objects.filter(user__username=author.user.username).exists():
    #         raise forms.ValidationError("Author not found")
    #     return author


class DeleteModelForm(forms.Form):
    model_id = forms.IntegerField()


class UpdatePredictionForm(forms.Form):
    prediction_model = forms.IntegerField()
    prediction_description = forms.CharField(max_length=500)
    prediction_commit = forms.CharField(max_length=100)
    prediction_date = forms.DateField()


class DeletePredictionForm(forms.Form):
    prediction_id = forms.IntegerField()


class UploadGeopackageFileForm(forms.Form):
    file = forms.FileField(widget=forms.FileInput(attrs={"accept": ".gpkg"}))
