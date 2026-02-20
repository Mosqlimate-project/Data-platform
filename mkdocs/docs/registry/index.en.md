# Model Registry API 
`https://api.mosqlimate.org/api/registry/`

The model registry is a tool for interacting with the Mosqlimate's model and prediction database. 

## Inserting models and predictions
registering forecasting models that want to share their predictions in the Mosqlimate platform.

As with everything in our API, the model registry can be accessed programatically. You can  [insert new models](https://api.mosqlimate.org/docs/registry/POST/models/) into the platform, or [post predictions](https://api.mosqlimate.org/docs/registry/POST/predictions/) generated from a registered model.

Posted predictions will be available for visualization alongside data, in our platforms dashboard.

## Retrieving models and predictions
You can also retrieve models and predictions from the platform. The [model registry](https://api.mosqlimate.org/docs/registry/GET/models/) endpoint will return a list of all models registered in the platform, while the [predictions](https://api.mosqlimate.org/docs/registry/GET/predictions/) endpoint will return a list of all predictions uploaded to the platform.
