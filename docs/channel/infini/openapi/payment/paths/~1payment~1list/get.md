# Query Order's payments

Endpoint: GET /payment/list

## Query parameters:

  - `order_id` (string)
    Order ID

## Response 200 fields (application/json):

  - `list` (array)
    List

  - `list.payment_id` (string)

  - `list.merchant_id` (string)

  - `list.payment_method` (integer)

  - `list.payment_address` (string)

  - `list.network` (string)

  - `list.due_amount` (object)

  - `list.pay_currency` (string)

  - `list.amount_confirmed` (object)

  - `list.amount_confirming` (object)

  - `list.status` (string)

  - `list.expires_at` (integer)

  - `list.metadata` (string)

  - `list.created_at` (integer)

  - `list.updated_at` (integer)

  - `list.transactions` (array)
    Related transactions

  - `list.transactions.amount` (string)
    Transaction amount

  - `list.transactions.hash` (string)
    Transaction hash

  - `list.transactions.status` (string)
    Transaction status

  - `list.transactions.transaction_time` (integer)
    Transaction time (Unix timestamp in seconds)

  - `list.transactions.from_address` (string)
    From address

  - `list.transactions.transaction_id` (string)
    Transaction ID

  - `list.transactions.created_at` (integer)
    Created time (Unix timestamp in seconds)

  - `list.transactions.estimate_confirm_time` (integer)

  - `list.transactions.exception_tag` (string)

  - `list.amount_status` (string)

  - `list.exception_tag` (array)

  - `list.crypto_amount` (object)

  - `list.channel_fee` (object)


