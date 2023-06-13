from jinja2 import Environment, FileSystemLoader
from pathlib import Path

templates = Environment(
    loader=FileSystemLoader(Path(__file__).parent.parent / "templates")
)
