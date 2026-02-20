# API Key

Mosqlimate's API requests require an User API Key. The Token will be generated after login, in the User profile page: `https://mosqlimate.org/profile/auth`.

![UID-Key Example](images/x-uid-key.png)

The `X-UID-Key` token has to be included in every request's headers. Examples authenticated headers can be found in [API Demo](https://api.mosqlimate.org/api/docs).

## Authorizing in API Demo

To test the endpoints using the [API Demo](https://api.mosqlimate.org/api/docs) you must include
your UID-Key in the `Authorize` form (without quotes):

![Swagger Auth](images/swagger-auth.png)
