> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Python usage
```py
import requests
```

### POST Model
```py
def post_model(
    name: str, 
    description: str, 
    repository: str, 
    implementation_language: str, 
    type: str
):
    url = "https://api.mosqlimate.org/api/registry/models/"
    headers = {"X-UID-Key": "See X-UID-Key documentation"}
    model = {
        "name": name,
        "description": description,
        "repository": repository,
        "implementation_language": implementation_language,
        "type": type
    }
    return requests.post(url, json=model, headers=headers)
```
