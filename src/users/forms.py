from django import forms


class UpdateUserForm(forms.Form):
    first_name = forms.CharField(max_length=100)
    last_name = forms.CharField(max_length=100)
    institution = forms.CharField(max_length=100)
