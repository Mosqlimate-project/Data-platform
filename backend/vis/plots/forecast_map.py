from typing import Literal, Optional
import datetime
import numpy as np
import pandas as pd
import altair as alt
import geopandas as gpd

from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _
from django.http import HttpRequest

from main.utils import UF_CODES
from vis.utils import geo_obj_to_dataframe, obj_to_dataframe
from vis.models import ResultsProbForecast, GeoMacroSaude, State, Macroregion
from vis.dash.errors import VisualizationError
from vis.dash.charts import watermark

code_to_state = {v: k for k, v in UF_CODES.items()}


def macro_forecast_map_table(
    disease: Literal["dengue", "zika", "chikungunya"],
    date: datetime.date,
    request: HttpRequest,
    macroregion: Optional[Literal[1, 2, 3, 4, 5]] = None,
    # fmt: off
    uf: Optional[
        Literal[
            "AC", "AL", "AP", "AM", "BA", "CE", "ES", "GO", "MA",
            "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ",
            "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO", "DF",
        ]
    ] = None,
    # fmt: on
    geocodes: Optional[list[int]] = None,
    title_left: str = "Upper limit of incidence for the week (MEM)",
    title_right: str = "Probabilistic forecast for the week",
    fontsize: int = 16,
    width: int = 450,
    height: int = 350,
    table_width: int = int(450 * 0.25),
):
    if disease not in ["dengue", "zika", "chikungunya"]:
        raise VisualizationError(
            "diseases options: ['dengue', 'zika', 'chikungunya']"
        )

    if not isinstance(date, datetime.date):
        raise VisualizationError("date must be a datetime.date object")

    macros_saude = GeoMacroSaude.objects.filter()

    if geocodes:
        macros_saude = GeoMacroSaude.objects.filter(geocode__in=geocodes)
        if not macros_saude:
            raise VisualizationError(
                "Incorrect MacroSaude geocode(s). Example: [1101, 1102]"
            )

    if uf:
        try:
            macros_saude = GeoMacroSaude.objects.filter(
                state=State.objects.get(uf=uf)
            )
        except State.DoesNotExist:
            raise VisualizationError("Incorrect UF. Example: 'SP'")

    if macroregion:
        macros_saude = GeoMacroSaude.objects.filter(
            state__in=(
                State.objects.filter(
                    macroregion=(
                        Macroregion.objects.get(geocode=str(macroregion))
                    )
                )
            )
        )
        if not macros_saude:
            raise VisualizationError(
                "Incorrect macroregion selected. Options: 1 to 5"
            )

    results = set()
    for macro in macros_saude:
        results.add(
            get_object_or_404(
                ResultsProbForecast, disease=disease, date=date, geocode=macro
            )
        )

    df = pd.concat([obj_to_dataframe(o) for o in results]).reset_index(
        drop=True
    )

    df_macro = gpd.GeoDataFrame(
        pd.concat(
            [geo_obj_to_dataframe(o) for o in macros_saude],
        )
        .drop_duplicates()
        .reset_index(drop=True)
    )

    df["date"] = df["date"].apply(str)

    df.prob_low = -df.prob_low

    df["prob_color"] = df.apply(
        lambda x: (
            x.prob_low if abs(x.prob_low) > abs(x.prob_high) else x.prob_high
        ),
        axis=1,
    )

    df["prob_color"] = df.prob_color.apply(lambda x: 0 if abs(x) < 50 else x)

    df = df.drop(columns="id")

    df_macro["state_code"] = df_macro["state"]

    df_macro["state"] = df_macro["state"].astype(int).replace(code_to_state)

    df_macro = df_macro.merge(df, on="geocode", how="left")

    df_macro = gpd.GeoDataFrame(df_macro)

    df_macro["desc_prob"] = np.nan

    df_macro.loc[df_macro.prob_color > 0, "desc_prob"] = str(
        _("Probability of the incidence exceeding the historical limit")
    )

    df_macro.loc[df_macro.prob_color < 0, "desc_prob"] = str(
        _(
            "Probability of incidence being below the historical lower threshold"
        )
    )

    df_macro.loc[df_macro.prob_color == 0, "desc_prob"] = "N/A"

    maps = macro_maps(
        df_macro,
        request=request,
        title_left=title_left,
        title_right=title_right,
        width=width,
        height=height,
        fontsize=fontsize,
    )

    table = macro_table(
        df_macro,
        width=table_width,
        fontsize=fontsize,
    )

    final_plot = alt.vconcat(maps, table).configure_view(stroke=None)

    return final_plot


def macro_maps(
    df: gpd.GeoDataFrame,
    request: HttpRequest,
    title_left: str = "Upper limit of incidence for the week (MEM)",
    title_right: str = "Probabilistic forecast for the week",
    width: int = 450,
    height: int = 350,
    fontsize: int = 16,
):
    wk = watermark(
        request,
        opacity=0.75,
        ini_x=width,
        end_x=width - 70,
        ini_y=height,
        end_y=height - 70,
    )

    wk_text = (
        alt.Chart({"values": [{"text": "mosqlimate.org"}]})
        .mark_text(align="center", fontSize=12, opacity=0.75)
        .encode(text="text:N", x=alt.value(width - 35), y=alt.value(height))
    )

    wk = wk + wk_text

    text_dist = (
        alt.Chart(df.head(1))
        .mark_text(
            dy=-(height * 0.55),
            dx=width / 20,
            size=fontsize,
            fontWeight="normal",
            font="Arial",
        )
        .encode(text="date:N")
        .transform_calculate(date='datum.date + " - " + datum.disease')
    )

    map_dist = (
        alt.Chart(df, title=alt.Title(title_left, fontSize=fontsize + 2))
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "high_incidence_threshold:Q",
                scale=alt.Scale(scheme="viridis"),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title=str(_("Incidence /100.000 hab.")),
                    titleOrient="left",
                    titleFontSize=fontsize * 0.75,
                ),
            ),
            tooltip=[
                alt.Tooltip("state:N", title=str(_("State:"))),
                alt.Tooltip("name:N", title=str(_("Macroregion:"))),
                alt.Tooltip("geocode:N", title=str(_("Geocode:"))),
                alt.Tooltip(
                    "high_incidence_threshold:Q", title=str(_("Incidence:"))
                ),
            ],
        )
        .properties(width=width, height=height)
    ) + wk

    map_prob = (
        alt.Chart(df, title=alt.Title(title_right, fontSize=fontsize + 2))
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "prob_color:Q",
                scale=alt.Scale(
                    scheme="redblue", reverse=True, domain=[-100, 100]
                ),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title=str(_("Probability (%)")),
                    titleOrient="left",
                    titleFontSize=fontsize * 0.75,
                ),
            ),
            tooltip=[
                alt.Tooltip("name:N", title=str(_("Macroregion:"))),
                alt.Tooltip("state:N", title=str(_("State:"))),
                alt.Tooltip("geocode:N", title=str(_("Geocode:"))),
                alt.Tooltip("prob_color:Q", title=str(_("Probability (%):"))),
                alt.Tooltip("desc_prob:N", title=str(_("Info:"))),
            ],
        )
        .properties(width=width, height=height)
    ) + wk

    text_prob = (
        alt.Chart(df.head(1))
        .mark_text(
            dy=-(height * 0.55),
            dx=width / 20,
            size=fontsize,
            fontWeight="normal",
        )
        .encode(text="date:N")
        .transform_calculate(date='datum.date + " - " + datum.disease')
    )

    final_maps = alt.hconcat(
        alt.layer(map_dist, text_dist), alt.layer(map_prob, text_prob)
    ).resolve_scale(color="independent")

    return final_maps


def macro_table(
    df_macro: gpd.GeoDataFrame, width: int = 116, fontsize: int = 14
):
    ranked_table_prob = (
        alt.Chart(
            df_macro[
                [
                    "date",
                    "name",
                    "geocode",
                    "state",
                    "prob_color",
                    "high_incidence_threshold",
                ]
            ],
            width=width,
        )
        .mark_text(align="center", fontSize=fontsize * 0.95)
        .encode(y=alt.Y("row_number:O").axis(None))
        .transform_window(
            row_number="row_number()",
            rank="rank(prob_color)",
            sort=[alt.SortField("prob_color", order="descending")],
        )
        .transform_filter(alt.datum.prob_color > 90)
    )

    d = ranked_table_prob.encode(text=alt.Text("date:N")).properties(
        title=alt.Title(
            text=str(_("Date")),
            align="center",
            fontSize=fontsize,
        )
    )

    name = ranked_table_prob.encode(text=alt.Text("name:N")).properties(
        title=alt.Title(
            text=str(_("Macroregion")),
            align="center",
            fontSize=fontsize,
        )
    )

    geocode = ranked_table_prob.encode(text=alt.Text("geocode:N")).properties(
        title=alt.Title(
            text=str(_("Geocode")),
            align="center",
            fontSize=fontsize,
        )
    )

    state = ranked_table_prob.encode(text=alt.Text("state:N")).properties(
        title=alt.Title(
            text=str(_("State")),
            align="center",
            fontSize=fontsize,
        )
    )

    prob = ranked_table_prob.encode(text=alt.Text("prob_color:N")).properties(
        title=alt.Title(
            text=str(_("Probability (%)")),
            align="center",
            fontSize=fontsize,
        )
    )

    inc = ranked_table_prob.encode(
        text=alt.Text(
            "high_incidence_threshold:Q",
            format=",.2f",
        )
    ).properties(
        title=alt.Title(
            text=str(_("High Incidence Threshold (100k)")),
            align="center",
            fontSize=fontsize,
        )
    )

    table_prob = alt.hconcat(
        d,
        name,
        geocode,
        state,
        inc,
        prob,
    )

    return table_prob
