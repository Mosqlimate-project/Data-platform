# API Key

Mosqlimate's API requests require an User API Key. The Token will be generated after Github authentication, in the User profile page: `https://api.mosqlimate.org/<username>/`.

![UID-Key Example](https://i.imgur.com/JdPze6R.png)

The `X-UID-Key` token has to be included in every request's headers. Examples authenticated headers can be found in [API Demo](https://api.mosqlimate.org/api/docs).

## Authorizing in API Demo

To test the endpoints using the [API Demo](https://api.mosqlimate.org/api/docs) you must include
your UID-Key in the `Authorize` form (without quotes):

![Swagger Auth](images/x-uid-key.png)
