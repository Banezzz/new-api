# Query payment

Endpoint: GET /payment

## Query parameters:

  - `payment_id` (string)
    Payment ID

## Response 200 fields (application/json):

  - `payment_id` (string)

  - `merchant_id` (string)

  - `payment_method` (integer)

  - `payment_address` (string)

  - `network` (string)

  - `due_amount` (object)

  - `pay_currency` (string)

  - `amount_confirmed` (object)

  - `amount_confirming` (object)

  - `status` (string)

  - `expires_at` (integer)

  - `metadata` (string)

  - `created_at` (integer)

  - `updated_at` (integer)

  - `transactions` (array)
    Related transactions

  - `transactions.amount` (string)
    Transaction amount

  - `transactions.hash` (string)
    Transaction hash

  - `transactions.status` (string)
    Transaction status

  - `transactions.transaction_time` (integer)
    Transaction time (Unix timestamp in seconds)

  - `transactions.from_address` (string)
    From address

  - `transactions.transaction_id` (string)
    Transaction ID

  - `transactions.created_at` (integer)
    Created time (Unix timestamp in seconds)

  - `transactions.estimate_confirm_time` (integer)

  - `transactions.exception_tag` (string)

  - `amount_status` (string)

  - `exception_tag` (array)

  - `crypto_amount` (object)

  - `channel_fee` (object)

  - `order_amount` (object)


