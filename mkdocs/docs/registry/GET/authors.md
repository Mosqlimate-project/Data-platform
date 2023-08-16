## Parameters Table 
| Parameter name | Required | Type | Description |
|--|--|--|--|
| *page | yes | int | Page to be displayed |
| *per_page | yes | int | How many predictions will be displayed per page |
| name | no | str _(icontains)_ | Author name |
| username | no | str | Author username |
| institution | no | str _(icontains)_ | Author institution |

## Python Usage
```py
import requests

authors_api = "https://api.mosqlimate.org/api/registry/authors/"
```

### Listing all authors
```py
requests.get(authors_api).json()
```

### Getting specific user with `username`
```py
requests.get(authors_api + "luabida").json()
```
