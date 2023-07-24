from bootstrap_modal_forms.forms import BSModalModelForm
from django.contrib.auth import get_user_model


User = get_user_model()


class UserModelForm(BSModalModelForm):
    class Meta:
        model = User
        fields = ["first_name", "last_name"]
