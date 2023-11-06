# from dash import html, dcc, Input, Output
# import plotly.offline as pyo
import plotly.graph_objs as go

# import plotly.express as px
from dash import dcc, html, Input, Output
from django_plotly_dash import DjangoDash

# from dash.exceptions import PreventUpdate
# import dash_bootstrap_components as dbc
# import plotly.express as px

from datastore.vis_charts import uf_ibge_mapping


from pathlib import Path
from django.conf import settings

import geopandas
import pandas as pd

static_dir = Path(settings.STATICFILES_DIRS[0])
states_json = static_dir / "data" / "geo" / "BR" / "states"

gdfs = []
for UF in uf_ibge_mapping:
    gdfs.append(geopandas.read_file(str(states_json / f"{UF}.json")))

geopandas_df = geopandas.GeoDataFrame(pd.concat(gdfs, ignore_index=True))
geopandas_df.set_index("name")
# fig = px.choropleth(geopandas_df, geojson=geopandas_df.geometry,
#                     locations=geopandas_df.index)


app = DjangoDash("home_chart")

# app.layout = dbc.Container([
#     dbc.Row([
#         dbc.Col([
#             html.H4('Click anywhere on the image'),
#             dcc.Graph(id='graph', figure=fig),
#         ], width={'size': 10}
#         ),
#         dbc.Col([
#             html.H4('Coordinates of click'),
#             html.Pre(id='click')
#         ], width={'size': 2}
#         )
#     ])
# ], fluid=True)


# app.clientside_callback(
#     """
#     function(clickData) {
#         if (clickData == undefined) {
#             throw window.dash_clientside.PreventUpdate;
#         } else {
#             var points = clickData.points[0]
#             var x = points.x
#             var y = points.y
#             //var jsonstr = JSON.stringify(clickData, null, 2);
#         }
#         return [`x: ${x}\ny: ${y}`];
#     }
#      """, [Output('click', 'children')], [Input('graph', 'clickData')]
# )


app.layout = html.Div(
    [
        html.H4("Polotical candidate voting pool analysis"),
        html.P("Select a candidate:"),
        dcc.RadioItems(
            id="candidate",
            options=["Joly", "Coderre", "Bergeron"],
            value="Coderre",
            inline=True,
        ),
        dcc.Graph(id="graph"),
    ]
)


@app.callback(Output("graph", "figure"), Input("candidate", "value"))
def display_choropleth(candidate):
    traces = []
    for gdf in gdfs:
        trace = go.Scattermapbox(
            lon=gdf.geometry.centroid.x,
            lat=gdf.geometry.centroid.y,
            text=gdf["name"],  # Customize the text labels
            mode="markers+text",
            marker=dict(
                size=10,
                opacity=0.7,
            ),
            textposition="bottom right",
            name=gdf["name"].iloc[0],  # Use the first name as the trace name
        )
        traces.append(trace)

    # Create the layout for the map
    layout = go.Layout(
        hovermode="closest",
        mapbox=dict(
            center=dict(
                lat=gdfs.geometry.centroid.y.mean(), lon=gdfs.geometry.centroid.x.mean()
            ),
            zoom=4,
            style="open-street-map",
        ),
    )

    # Create the figure with the traces and layout
    fig = go.Figure(data=traces, layout=layout)
    return fig
