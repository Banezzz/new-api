# list order

Endpoint: GET /order/list

## Query parameters:

  - `currency` (string)
    USDC or USDT

  - `status` (string)
    status

  - `page` (integer)
    page from 1 to n

  - `page_size` (integer)
    size :default is 10

## Response 200 fields (application/json):

  - `list` (array)

  - `list.merchant_id` (string)

  - `list.order_id` (string)

  - `list.request_id` (string)

  - `list.client_reference` (string)

  - `list.order_desc` (string)

  - `list.order_currency` (string)

  - `list.order_amount` (object)

  - `list.amount_confirming` (object)

  - `list.amount_confirmed` (object)

  - `list.status` (string)

  - `list.created_at` (integer)

  - `list.updated_at` (integer)

  - `list.expires_at` (integer)

  - `list.exception_tag` (array)

  - `list.success_url` (string)

  - `list.failure_url` (string)

  - `total` (integer)


