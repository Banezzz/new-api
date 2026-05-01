# Withdraw fund

Endpoint: POST /fund/withdraw

## Request fields (application/json):

  - `chain` (string, required)
    Chain

  - `token_type` (string, required)
    Token identifier

  - `amount` (string, required)
    Amount

  - `wallet_address` (string, required)
    Wallet address

  - `note` (string)
    Note

## Response 200 fields (application/json):

  - `request_id` (string)
    RequestId


