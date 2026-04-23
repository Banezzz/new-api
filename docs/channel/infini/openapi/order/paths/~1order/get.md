# Get a new order

Endpoint: GET /order

## Query parameters:

  - `order_id` (string)
    Order id

## Response 200 fields (application/json):

  - `merchant_id` (string)

  - `request_id` (string)

  - `order_id` (string)

  - `client_reference` (string)

  - `order_desc` (string)

  - `order_currency` (string)

  - `order_amount` (object)

  - `amount_confirming` (object)

  - `amount_confirmed` (object)

  - `status` (string)

  - `created_at` (integer)

  - `updated_at` (integer)

  - `expires_at` (integer)

  - `merchant_info` (object)

  - `merchant_info.uid` (string)

  - `merchant_info.display_name` (string)

  - `merchant_info.logo` (string)

  - `merchant_info.default_order_ttl` (integer)

  - `merchant_info.name_type` (string)

  - `exception_tag` (array)

  - `success_url` (string)

  - `failure_url` (string)

  - `available_pay_method` (array)

  - `last_paid_payment` (object)

  - `last_paid_payment.payment_id` (string)

  - `last_paid_payment.merchant_id` (string)

  - `last_paid_payment.payment_method` (integer)

  - `last_paid_payment.payment_address` (string)

  - `last_paid_payment.network` (string)

  - `last_paid_payment.due_amount` (object)

  - `last_paid_payment.pay_currency` (string)

  - `last_paid_payment.amount_confirmed` (object)

  - `last_paid_payment.amount_confirming` (object)

  - `last_paid_payment.status` (string)

  - `last_paid_payment.expires_at` (integer)

  - `last_paid_payment.metadata` (string)

  - `last_paid_payment.created_at` (integer)

  - `last_paid_payment.updated_at` (integer)

  - `last_paid_payment.transactions` (array)
    Related transactions

  - `last_paid_payment.transactions.amount` (string)
    Transaction amount

  - `last_paid_payment.transactions.hash` (string)
    Transaction hash

  - `last_paid_payment.transactions.status` (string)
    Transaction status

  - `last_paid_payment.transactions.transaction_time` (integer)
    Transaction time (Unix timestamp in seconds)

  - `last_paid_payment.transactions.from_address` (string)
    From address

  - `last_paid_payment.transactions.transaction_id` (string)
    Transaction ID

  - `last_paid_payment.transactions.created_at` (integer)
    Created time (Unix timestamp in seconds)

  - `last_paid_payment.transactions.estimate_confirm_time` (integer)

  - `last_paid_payment.transactions.exception_tag` (string)

  - `last_paid_payment.amount_status` (string)

  - `last_paid_payment.exception_tag` (array)

  - `last_paid_payment.crypto_amount` (object)

  - `last_paid_payment.channel_fee` (object)


