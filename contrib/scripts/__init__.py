from pathlib import Path

from jinja2 import Environment, FileSystemLoader

templates = Environment(
    loader=FileSystemLoader(Path(__file__).parent.parent / "templates")
)
