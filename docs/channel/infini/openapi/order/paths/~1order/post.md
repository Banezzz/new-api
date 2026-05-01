# Create a new order

Endpoint: POST /order

## Request fields (application/json):

  - `client_reference` (string)
    Client Reference

  - `request_id` (string, required)
    request id (unique)

  - `order_desc` (string)
    Order description

  - `amount` (string, required)
    Order amount

  - `merchant_alias` (string)
    customized merchant alias (optional)

  - `expires_in` (integer)
    Time to live in seconds (e.g., 3600 for 1 hour, 0 for default order expires time)

  - `success_url` (string)
    Success redirect Url

  - `failure_url` (string)
    Failure redirect Url

  - `pay_methods` (array)
    Enabled payment modes for this order (optional, inherits from merchant config if not specified)

## Response 200 fields (application/json):

  - `client_reference` (string)

  - `request_id` (string)

  - `order_id` (string)
    Order id

  - `checkout_url` (string)
    Checkout url

  - `token` (string)
    Token


