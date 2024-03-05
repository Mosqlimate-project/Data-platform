def merge_uri_params(values: list, param: str) -> str:
    params = set()
    for value in values:
        params.add(param + "=" + str(value))
    return "?" + "&".join(params)
