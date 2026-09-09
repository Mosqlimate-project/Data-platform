"""Vulture whitelist for the registry app.

Vulture flags unused function/method arguments that Django and Django
Ninja require in their handler/validator signatures (e.g. management
command ``handle(*args, **options)``, signal receivers
``(sender, **kwargs)``, pagination ``**params`` and pydantic classmethod
validators ``(cls, ...)``). These names are whitelisted here so vulture
does not report them as dead code.

This module is import-only and is never intended to be run directly.
It is excluded from ruff and mypy in ``pyproject.toml``.
"""

args  # management command handle(*args, **options)
options  # management command handle(*args, **options)
params  # PagesPagination.paginate_queryset(**params)
cls  # @field_validator / @model_validator classmethod signature
sender  # @receiver(sender=...) post_save handler
kwargs  # @receiver post_save handler(**kwargs)
