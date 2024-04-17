from typing import Literal, Optional
import datetime
import numpy as np
import pandas as pd
import altair as alt
import geopandas as gpd

from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _

from main.utils import UF_CODES
from vis.utils import geo_obj_to_dataframe, obj_to_dataframe
from vis.models import ResultsProbForecast, GeoMacroSaude, State, Macroregion

code_to_state = {v: k for k, v in UF_CODES.items()}


def macro_forecast_map_table(
    date: datetime.date,
    macroregion: Optional[Literal[1, 2, 3, 4, 5]] = None,
    uf: Optional[
        Literal[
            "AC",
            "AL",
            "AP",
            "AM",
            "BA",
            "CE",
            "ES",
            "GO",
            "MA",
            "MT",
            "MS",
            "MG",
            "PA",
            "PB",
            "PR",
            "PE",
            "PI",
            "RJ",
            "RN",
            "RS",
            "RO",
            "RR",
            "SC",
            "SP",
            "SE",
            "TO",
            "DF",
        ]
    ] = None,
    geocodes: Optional[list[int]] = None,
    title_left: str = "Limiar superior de Incidência na semana",
    title_right: str = "Previsão probabilística na semana",
    fontsize: int = 16,
    width: int = 450,
    height: int = 350,
    table_width: int = int(450 * 0.25),
):
    if not isinstance(date, datetime.date):
        raise ValueError("date must be a datetime.date object")

    macros_saude = GeoMacroSaude.objects.all()

    if geocodes:
        macros_saude = GeoMacroSaude.objects.filter(geocode__in=geocodes)
        if not macros_saude:
            raise ValueError(
                "Incorrect MacroSaude geocode(s). Example: [1101, 1102]"
            )

    if uf:
        try:
            macros_saude = GeoMacroSaude.objects.filter(
                state=State.objects.get(uf=uf)
            )
        except State.DoesNotExist:
            raise ValueError("Incorrect UF. Example: 'SP'")

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
            raise ValueError("Incorrect macroregion selected. Options: 1 to 5")

    results = set()
    for macro in macros_saude:
        results.add(
            get_object_or_404(ResultsProbForecast, date=date, geocode=macro)
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

    df["date"] = df["date"].apply(lambda x: str(x))

    df.prob_low = -df.prob_low

    df["prob_color"] = df.apply(
        lambda x: x.prob_low
        if abs(x.prob_low) > abs(x.prob_high)
        else x.prob_high,
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
        _("Probabilidade de a incidência superar o limiar histórico")
    )

    df_macro.loc[df_macro.prob_color < 0, "desc_prob"] = str(
        _(
            "Probabilidade de a incidência ser abaixo do limiar inferior histórico"
        )
    )

    df_macro.loc[df_macro.prob_color == 0, "desc_prob"] = ""

    maps = macro_maps(
        df_macro,
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
    title_left: str = "Limiar superior de Incidência na semana",
    title_right: str = "Previsão probabilística na semana",
    width: int = 450,
    height: int = 350,
    fontsize: int = 16,
):
    text_dist = (
        alt.Chart(df)
        .mark_text(
            dy=-(height * 0.55), dx=width / 20, size=fontsize, fontWeight=100
        )
        .encode(text="date:N")
        .transform_calculate(date=f'"{_(title_left)} - " + datum.date')
    )

    map_dist = (
        alt.Chart(df, title="")
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "high_incidence_threshold:Q",
                scale=alt.Scale(scheme="viridis"),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title=str(_("Incidência /100.000 hab.")),
                    titleOrient="left",
                    titleFontSize=fontsize * 0.75,
                ),
            ),
            tooltip=[
                alt.Tooltip("state:N", title=str(_("Estado:"))),
                alt.Tooltip("name:N", title=str(_("Macrorregião:"))),
                alt.Tooltip(
                    "high_incidence_threshold:Q", title=str(_("Incidência:"))
                ),
            ],
        )
        .properties(width=width, height=height)
    )

    map_prob = (
        alt.Chart(df, title="")
        .mark_geoshape()
        .encode(
            color=alt.Color(
                "prob_color:Q",
                scale=alt.Scale(scheme="redblue", reverse=True),
                legend=alt.Legend(
                    direction="vertical",
                    orient="right",
                    legendY=30,
                    title=str(_("Probabilidade (%)")),
                    titleOrient="left",
                    titleFontSize=fontsize * 0.75,
                ),
            ),
            tooltip=[
                alt.Tooltip("state:N", title=str(_("Estado:"))),
                alt.Tooltip("name:N", title=str(_("Macrorregião:"))),
                alt.Tooltip(
                    "prob_color:Q", title=str(_("Probabilidade (%):"))
                ),
                alt.Tooltip("desc_prob:N", title=str(_("Info:"))),
            ],
        )
        .properties(width=width, height=height)
    )

    text_prob = (
        alt.Chart(df)
        .mark_text(
            dy=-(height * 0.55), dx=width / 20, size=fontsize, fontWeight=100
        )
        .encode(text="date:N")
        .transform_calculate(date=f'"{_(title_right)} - " + datum.date')
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
                    "state",
                    "name",
                    "prob_color",
                    "high_incidence_threshold",
                ]
            ],
            width=width,
        )
        .mark_text(align="right", fontSize=fontsize * 0.95)
        .encode(y=alt.Y("row_number:O").axis(None))
        .transform_window(
            row_number="row_number()",
            rank="rank(prob_color)",
            sort=[alt.SortField("prob_color", order="descending")],
        )
        .transform_filter(alt.datum.prob_color > 90)
    )

    d = ranked_table_prob.encode(text="date:N").properties(
        title=alt.Title(text=str(_("Data")), align="right", fontSize=fontsize)
    )

    name = ranked_table_prob.encode(text="name:N").properties(
        title=alt.Title(
            text=str(_("Macrorregião")), align="right", fontSize=fontsize
        )
    )

    state = ranked_table_prob.encode(text="state:N").properties(
        title=alt.Title(
            text=str(_("Estado")), align="right", fontSize=fontsize
        )
    )

    prob = ranked_table_prob.encode(text="prob_color:N").properties(
        title=alt.Title(
            text=str(_("Probabilidade (%)")), align="right", fontSize=fontsize
        )
    )

    inc = ranked_table_prob.encode(
        text="high_incidence_threshold:Q"
    ).properties(
        title=alt.Title(
            text=str(_("Limiar superior de Incidência (100k)")),
            align="right",
            fontSize=fontsize,
        )
    )

    table_prob = alt.hconcat(
        d,
        state,
        name,
        inc,
        prob,
    )

    return table_prob
