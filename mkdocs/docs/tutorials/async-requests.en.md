# Making asynchronous requests in R

Asynchronous requests are useful when there are too many `pages` to fetch synchronously. They speed up the request by several times and can be used in any paginated request throughout the Mosqlimate API. The example below is written in R.

Requirements:

- [httr2](https://httr2.r-lib.org/) (asynchronous HTTP requests)
- [jsonlite](https://cran.r-project.org/web/packages/jsonlite/index.html) (JSON parsing)
- [dplyr](https://dplyr.tidyverse.org/) (data manipulation)

API requests require an `X-UID-Key` token. Grab yours in the [User profile page](https://mosqlimate.org/profile/auth) as described in the [Authorization](../uid-key.en.md) section.

## 1. Set up the request parameters

The first thing that's important to take note is that the response's pagination varies according to the request's parameters. So firstly, let's write down the parameters that will compose the call URL.

```R
library(httr2)
library(jsonlite)
library(dplyr)

# Your API key: https://mosqlimate.org/profile/auth
api_key <- "YOUR_X_UID_KEY"

# Base URL of any paginated endpoint. Here we use the vegetation metrics
# endpoint, but the very same pattern applies to every datastore endpoint.
base_url <- "https://api.mosqlimate.org/api/datastore/vegetation/"

# Request parameters. Optional filters (date range, state, ...) can be added
# here — the more specific the filters, the fewer pages to fetch.
parameters <- list(
  per_page = 100L,          # up to 100 items per page
  start    = "2024-01-01",  # YYYY-mm-dd
  end      = "2024-12-31",
  uf       = "SP"           # optional: only results from São Paulo state
)

# Helper to compose the request URL with the page parameter.
compose_url <- function(base_url, parameters, page = 1L) {
  url <- httr2::url_parse(base_url)
  url$query <- c(parameters, page = as.character(page))
  httr2::url_build(url)
}
```

## 2. Inspect the pagination

Every response carries a `pagination` field describing how many items, pages and items per page the request returns. Let's fetch the first page to read it:

```R
resp <- httr2::request(compose_url(base_url, parameters)) |>
  httr2::req_headers(`X-UID-Key` = api_key) |>
  httr2::req_perform()

payload <- httr2::resp_body_json(resp)
pagination <- payload$pagination
pagination
```

which gives something like:

```
$items
[1] 100

$total_items
[1] 59340

$page
[1] 1

$total_pages
[1] 594

$per_page
[1] 100
```

To get all the data for the request, it would be necessary to loop through all the 594 pages — which takes a (long) while if called synchronously. Adding filters (like a state `uf` or a date range) helps to reduce the number of pages and the time to fetch the data.

## 3. Make the requests concurrently

Instead of looping page by page, we build one request per remaining page and send all of them at once. The `httr2` package handles the concurrency for us and even gives us built-in retry and rate limiting.

```R
# Build one request per remaining page (from page 2 to the last one).
requests <- lapply(2:pagination$total_pages, function(page) {
  httr2::request(compose_url(base_url, parameters, page)) |>
    # include the API key on every request
    httr2::req_headers(`X-UID-Key` = api_key) |>
    # retry failed requests (e.g. 429 rate limits and 5xx errors)
    httr2::req_retry(max_tries = 3, backoff = ~ 0.2) |>
    # pace the requests to respect the API rate limit
    # (logged-in accounts default to 10 requests per second)
    httr2::req_throttle(capacity = 10, fill_time_s = 1)
})

# Send all the requests concurrently. `on_error = "continue"` keeps the
# responses that didn't fail instead of aborting the whole batch.
responses <- httr2::req_perform_parallel(requests, on_error = "continue")
```

Fetching all 594 pages takes roughly a minute on a logged-in account (which defaults to 10 requests per second), while a synchronous page-by-page loop would take much longer on top of that. The concurrent approach also makes the most of your available rate limit.

> **WARNING**  
> Rate limits depend on the account type: logged-in users default to **10 requests per second**, while temporary guest keys are limited to **100 requests per day** and cannot fetch this whole dataset. Tune the `req_throttle()` settings and the request filters to match your account's limit.

## 4. Combine the results into a data.frame

The items of every page live in the `items` field of the response. We flatten them into a single list of rows and bind them together into one `data.frame`:

```R
items <- responses |>
  lapply(httr2::resp_body_json) |>
  lapply(`[[`, "items") |>
  unlist(recursive = FALSE) |>
  lapply(as.data.frame) |>
  dplyr::bind_rows()

head(items)
```

```
        date geocode  collection attribute      mean       std    median
1 2024-01-09 5003702 myd13q1-6.1      SAVI 0.5700181 0.1336494 0.5860384
2 2024-01-09 5003751 myd13q1-6.1      SAVI 0.4769734 0.1385892 0.4787536
3 2024-01-09 5003801 myd13q1-6.1      SAVI 0.5167235 0.1071886 0.5276168
...
```

The whole dataset is now available in a single `data.frame` for further manipulation. The same pattern works for every paginated endpoint of the Mosqlimate API — just swap the `base_url` and the `parameters`.
