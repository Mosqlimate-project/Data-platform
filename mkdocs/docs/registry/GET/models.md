## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| id | no | int | Model ID |
| name | no | str _(icontains)_ | Model name | 
| author_name | no | str _(icontains)_ | Author name |
| author_username | no | str | Author username |
| author_institution | no | str _(icontains)_ | Author institution |
| repository | no | str (icontains) | Github repository |
| implementation_language | no | str _(icontains)_ | Implementation language |
| type | no | str _(icontains)_ | Model type |

#### Details
`page` consists in the total amount of Models returned by the request divided by `per_page`.  The `pagination` information is returned alongside with the returned Models. E.g.:
```py
'pagination': {
	'items': 10,                    # Amout of Models being displayed 
	'total_items': 10,  		# Total amount of Models returned in the request
	'page': 1,			             # *request parameter
	'total_pages': 1,   		# Total amount of pages returned in the request
	'per_page': 50		    	# *request parameter
},
```  

## Python Usage
```py
import requests
```

```py
models_api = "https://api.mosqlimate.org/api/registry/models/"

page = 1
per_page = 5
pagination = "?page={page}&per_page={per_page}&"
```

### Listing all models
```py
requests.get(models_api + pagination).json()
```

### Filtering by _implementation_language_
```py
requests.get(models_api + pagination + "implementation_language=python").json()
```

### Incorrect page warning message
```py
requests.get(models_api + pagination + "id=1").json()['message']
```

### Multiple parameters
```py
requests.get(models_api + pagination + "implementation_language=python" + "&" + "name=test").json()
```

### Advanced usage
```py
parameters = {
	"page": 1,
	"per_page": 2,
}

def get_models(parameters: dict):
	models_api = "https://api.mosqlimate.org/api/registry/models/?"
	parameters_url = "&".join([f"{p}={v}" for p,v in parameters.items()])
	return requests.get(models_api + parameters_url).json()
		
get_predictions(parameters)
```
