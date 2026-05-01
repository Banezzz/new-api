# This is a method for get  all cryptocurrencies available for creating orders

Endpoint: GET /currency

## Response 200 fields (application/json):

  - `list` (array)
    List of supported cryptocurrencies

  - `list.chain` (string)
    Blockchain network name

  - `list.token_id` (string)
    Token identifier


