# Mosqlimate Data-platform
The Mosqlimate data Platform, encompasses a data acess API as well as a deployment of MLflow framework for model versioning (not code versioning, but experiment versioning). The platfor will provide both an API to input data (data going into the models to feed predictions) and another for model predictions data which will be stored for visualization purposes.

## --- UNDER CONSTRUCTION --- 
We are still **under construction** so check back frequently to follow our development.

## Input data
Our platform will provide geo-referenced **epidemiological**, **entomological** and **climate** data for the all of Brazil.
Additional datasets mey be incorporated in the future, as they become available and are considered useful to modellers.

## Output data (predictions)
The output data will be categorized by  model predictive scope. Certain models with predict weekly incidences (time series), other will predict Season wide indicators, others yet will provide spatio temporal (maps) predictions.

The design of the output data store will be defined based on Modellers provided information, Mosqlimate coordinators will try to fit models withing pre-determined categories so that model comparisons are possible.

## Model registry
A model registry will be maintained with metadata about models, their data requirements (for input and output), their authors, implementation language, and code repository.

The registry will remain open, but some acceptance criteria must be met for inclusion in the registry and join the platform's model comparison workflow.

1. Open-source model code. Both the model and tools required for running the model must be open source, to ensure reproducibility
1. Use only data made available through the Mosqlimate data API
1. Be properly documented so that other users can run it.
1. Adopt MLflow so that experiments are recorded in our platform.