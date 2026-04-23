# Create a new payment

Endpoint: POST /payment

## Request fields (application/json):

  - `order_id` (string, required)
    Order ID

  - `payment_method` (integer)
    Payment method

  - `chain` (string, required)
    Chain

  - `token_id` (string, required)
    Token identifier

## Response 200 fields (application/json):

  - `payment_id` (string)
    Payment ID

  - `amount` (string)
    Payment amount

  - `amount_confirmed` (string)
    Amount confirmed

  - `amount_confirming` (string)
    Amount confirming

  - `address` (string)
    Payment address

  - `expires_at` (integer)
    Expires time (Unix timestamp)


