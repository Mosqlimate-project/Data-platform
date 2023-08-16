# UID Key POST API Token

Mosqlimate's API `POST` requests require an User API Key. The Token will be generated after Github authentication, in the User profile page: `https://api.mosqlimate.org/<username>/`.

![UID-Key Example](https://i.imgur.com/JdPze6R.png)

The `X-UID-Key` token has to be included in every request's headers. Examples of its usage can be found in [API Demo](https://api.mosqlimate.org/api/docs) or in the POST API documentation. 
