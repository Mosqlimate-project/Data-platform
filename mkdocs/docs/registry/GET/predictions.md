## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Prediction ID |
| model_id | no | int | Model ID |
| model_name | no | str _(icontains)_ | Model name | 
| author_name | no | str _(icontains)_ | Author name |
| author_username | no | str | Author username |
| author_institution | no | str _(icontains)_ | Author institution |
| repository | no | str (icontains) | Github repository |
| implementation_language | no | str _(icontains)_ | Implementation language |
| type | no | str _(icontains)_ | Model type |
| commit | no | str | Prediction git commit |
| predict_date | no | str _(icontains)_ | Prediction modeling date |
| start | no | str _(YYYY-mm-dd)_ | Prediction modeling date after than |
| end | no | str _(YYYY-mm-dd)_ | Prediction modeling date before than |

#### Details
`page` consists in the total amount of Predictions returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned Preditions. E.g.:
```py
'pagination': {
	'items': 10,                    # Amout of Predictions being displayed 
	'total_items': 10,  		# Total amount of Predictions returned in the request
	'page': 1,			             # *request parameter
	'total_pages': 1,   		# Total amount of pages returned in the request
	'per_page': 50		    	# *request parameter
},
```  

## Python Usage
```py
import requests
```

```python
predictions_api = "https://api.mosqlimate.org/api/registry/predictions/"

page = 1
per_page = 5
pagination = "?page={page}&per_page={per_page}&"
```

### Listing all predictions
```py
requests.get(predictions_api + pagination).json()
```

### Filtering by _predict_date_
```py
requests.get(predictions_api + pagination + "predict_date=2023-01-01").json()
```

### Multiple parameters
```py
requests.get(predictions_api + pagination + "start=2023-01-01" + "&" + "end=2023-02-01").json()
```

### Advanced usage
```py
parameters = {
	"page": 1,
	"per_page": 2,
}

def get_predictions(parameters: dict):
	predictions_api = "https://api.mosqlimate.org/api/registry/predictions/?"
	parameters_url = "&".join([f"{p}={v}" for p,v in parameters.items()])
	return requests.get(predictions_api + parameters_url).json()
		
get_predictions(parameters)
```
