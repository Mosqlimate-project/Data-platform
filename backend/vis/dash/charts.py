import altair as alt

from django.templatetags.static import static


def watermark(
    opacity: float,
    ini_x: int,
    end_x: int,
    ini_y: int,
    end_y: int,
) -> alt.Chart:
    image_url = static("img/logo-mosqlimate.png")
    return (
        alt.Chart({"values": [{"url": image_url}]})
        .mark_image(opacity=opacity)
        .encode(
            x=alt.value(ini_x),  # point in x axis
            x2=alt.value(end_x),  # pixels from x (left)
            y=alt.value(ini_y),
            y2=alt.value(end_y),  # pixels from y (top)
            url="url:N",
        )
    )
