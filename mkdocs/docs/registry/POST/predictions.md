> **WARNING**  
> The methods presented in this documentation generate real objects in database. To test Mosqlimate API request methods without inserting data, please refer to [API Demo](https://api.mosqlimate.org/api/docs)

## X-UID-Key
POST requests require [User API Token](uid-key.md) to be called.

## Python usage
```py
import requests
```

### POST Prediction to an User's Model 
```py
def post_prediction(
    model_id: int, 
    description: str, 
    commit: str, 
    predict_date: str, 
    predict: dict
):
    url = "https://api.mosqlimate.org/api/registry/predictions/"
    headers = {"X-UID-Key": "See X-UID-Key documentation"}
    prediction = {
        "model": model_id,
        "description": description,
        "commit": commit,
        "predict_date": predict_date,
        "prediction": predict
    }
    return requests.post(url, json=prediction, headers=headers)
```
