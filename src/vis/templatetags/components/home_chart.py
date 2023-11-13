from datetime import datetime

from dash import dcc, html, Input, Output
import plotly.express as px
from django_plotly_dash import DjangoDash

from vis.home.vis_charts import national_total_cases_data


app = DjangoDash("home_chart")

app.layout = html.Div(
    [
        html.P("Select a diasese:"),
        dcc.RadioItems(
            id="disease",
            options=["Dengue", "Zika", "Chikungunya"],
            value="Dengue",
            inline=True,
        ),
        dcc.Graph(id="bar_chart"),
    ]
)


@app.callback(Output("bar_chart", "figure"), Input("disease", "value"))
def select_disease(disease):
    data, year = national_total_cases_data(disease, datetime.now().year)
    fig = px.bar(
        data,
        x="value",
        y="name",
        labels={
            "name": f"Total cases of {disease} in {year}",
            "value": "Cases",
        },
        height=800,
    )
    return fig
