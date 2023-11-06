from dash import html, dcc, Input, Output
from django_plotly_dash import DjangoDash
import plotly.express as px

from datastore.models import DengueGlobal, CopernicusBrasil

cities = DengueGlobal.objects.using("infodengue").values("geocodigo", "nome")

app = DjangoDash("geocodes")

app.layout = html.Div(
    [
        html.H1("Copernicus data"),
        dcc.Dropdown(
            options=[
                {"label": f"{c['nome']} - {c['geocodigo']}", "value": c["geocodigo"]}
                for c in cities
            ],
            value=cities[0]["geocodigo"],
            id="dropdown",
        ),
        dcc.Graph(id="output"),
    ],
    style={
        "height": "1000px",
    },
)


@app.callback(Output("output", "figure"), Input("dropdown", "value"))
def update_output(value):
    data = (
        CopernicusBrasil.objects.using("infodengue")
        .filter(geocodigo=value)
        .values("date", "temp_med")
        .order_by("date")
    )
    fig = px.line(data, x="date", y="temp_med")
    return fig
