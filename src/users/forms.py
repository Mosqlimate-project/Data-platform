from django import forms


class UpdateAuthorForm(forms.Form):
    first_name = forms.CharField(max_length=100)
    last_name = forms.CharField(max_length=100)
    institution = forms.CharField(max_length=100, required=False)

    def clean_institution(self):
        institution_value = self.cleaned_data["institution"].strip()
        if not institution_value:
            return None
        return institution_value
