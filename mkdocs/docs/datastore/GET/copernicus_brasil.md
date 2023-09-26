
## Parameters Table 
### Input
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many items will be displayed per page (up to 100) |
| start | yes | str _(YYYY-mm-dd)_ | Start date |
| end | yes | str _(YYYY-mm-dd)_ | End date |
| geocode | no | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code |

### Output (items)
| Parameter name | Type | Description |
| -- | -- | -- |
| date | date _(YYYY-mm-dd)_ | Day of the year
| geocodigo | int | [IBGE's](https://www.ibge.gov.br/explica/codigos-dos-municipios.php) municipality code
| temp_min | float _(°C)_ | Minimum daily temperature
| temp_med | float _(°C)_ | Average daily temperature
| temp_max | float _(°C)_ | Maximum daily temperature
| precip_min | float _(mm)_ | Minimum daily precipitation
| precip_med | float _(mm)_ | Average daily precipitation
| precip_max | float _(mm)_ | Maximum daily precipitation
| precip_tot | float _(mm)_ | Total daily precipitation
| pressao_min | float _(atm)_ | Minimum daily sea level pressure
| pressao_med | float _(atm)_ | Average daily sea level pressure
| pressao_max | float _(atm)_ | Maximum daily sea level pressure
| umid_min | float _(%)_ | Minimum daily relative humidity 
| umid_med | float _(%)_ | Average daily relative humidity
| umid_max | float _(%)_ | Maximum daily relative humidity

#### Details
`page` consists in the total amount of Items returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned request. E.g.:
```py
'pagination': {
	'items': 10,                      # Amout of Items being displayed 
	'total_items': 10,  		# Total amount of Items returned in the request
	'page': 1,			               # *request parameter
	'total_pages': 1,      		 # Total amount of pages returned in the request
	'per_page': 100		    	# *request parameter
},
```

## Python usage
```py
import requests

copernicus_brasil_api = "https://api.mosqlimate.org/api/datastore/copernicus_brasil/"

page = 1 # total amount of pages is returned in the request
per_page = 100
pagination = f"?page={page}&per_page={per_page}&"
filters = "start=%s&end=%s" % ("2022-12-30", "2023-12-30")
```

#### API Call
```py
resp = requests.get(copernicus_brasil_api + pagination + filters)
# Or you can add a geocode to the filters
geocode = 3304557
resp = requests.get(
    copernicus_brasil_api + 
    pagination + 
    filters +
    f"&geocode={geocode}"
)
```

#### Items
Items are the dictionaries containing the response's data (a list of dicts):
```py
resp.json()["items"]
```

#### Pagination
The response's pagination contain information about the amount of items returned
by the API call. These information can be used to navigate between the queried
data by changing the `page` parameter on the URL.
```py
resp.json()["pagination"]
```

## R usage
```R
library(httr)
library(jsonlite)

copernicus_brasil_api <- "https://api.mosqlimate.org/api/datastore/copernicus_brasil/"
page <- "1"
pagination <- paste0("?page=", page, "&per_page=100&")
filters <- paste0("start=2022-12-30&end=2023-12-30")
```

#### API Call & JSON parsing
```R
url <- paste0(copernicus_brasil_api, pagination, filters)
resp <- GET(url)
content <- content(resp, "text")
json_content <- fromJSON(content)
```

#### Items
```R
items <- json_content$items
```

#### Pagination
```
pagination_data <- json_content$pagination
```
