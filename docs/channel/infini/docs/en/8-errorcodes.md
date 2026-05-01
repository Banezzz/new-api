## 8. Error Code Reference

### 8.1 HTTP 400 (Request Exception)

| Code | Description |
|  --- | --- |
| 400 | Invalid request parameters |
| 40001 | request_id must be a valid UUID |
| 40002 | Invalid expiration time: expires_at must be in the future |
| 40003 | amount must be positive |
| 40004 | Amount supports up to 6 decimal places |
| 40005 | Missing expires_in parameter |
| 40006 | amount must be greater than 0.1 |
| 40007 | Chain or token not in supported list |
| 40008 | success_url does not meet specifications |
| 40009 | failure_url does not meet specifications |
| 40010 | Invalid amount: no matching payment methods found |
| 40013 | Payment methods not enabled: the requested payment methods are not available for this merchant, or merchant only has Pay With Card enabled but amount is too small |


### 8.2 HTTP 401 (Unauthorized)

| Code | Description |
|  --- | --- |
| 401 | Authentication failed or invalid signature |


### 8.3 HTTP 403 (Forbidden)

| Code | Description |
|  --- | --- |
| 403 | Request rejected by policy |


### 8.4 HTTP 404 (Resource Not Found)

| Code | Description |
|  --- | --- |
| 404 | Object does not exist |
| 40401 | Order does not exist |
| 40402 | Payment does not exist |


### 8.5 HTTP 409 (Business Conflict)

| Code | Description |
|  --- | --- |
| 40901 | request_id duplicate |
| 40902 | client_reference duplicate |
| 40903 | Valid payment exists, duplicate creation prohibited |
| 40904 | Payment processing, cannot create new payment |
| 40905 | Token unauthorized to operate this order |
| 40906 | Order expired |
| 40907 | Order completed or expired, cannot create payment |
| 40908 | Can't create payment due to pending payment |
| 40909 | Already exists ongoing onramp order on this order |
| 40910 | Amount is below the minimum allowed for Pay With Card |
| 40911 | Amount is above the maximum allowed for Pay With Card |
| 40912 | Your region is not supported for purchase |


### 8.6 HTTP 500 (Internal Server Error)

| Code | Description |
|  --- | --- |
| 500 | Internal exception, please contact support team |