## 9. 异常处理建议（Exception Handling）


```python
def handle_payment_with_retry(order_id, amount):
    try:
        payment = client.create_payment(order_id, "TTRON", "USDT")
    except requests.HTTPError as exc:
        error = exc.response.json()
        code = error.get("code")

        if code == 40906:
            # Order expired, create new order
            order = client.create_order(amount)
            payment = client.create_payment(order["order_id"], "TTRON", "USDT")
        elif code == 40903:
            # Payment already exists, get existing payment
            payments = client.request("GET", f"/v1/acquiring/payment/list?order_id={order_id}")
            payment = payments["list"][0]
        elif code == 40904:
            # Temporary error, retry after delay
            time.sleep(30)
            payment = client.create_payment(order_id, "TTRON", "USDT")
        elif code == 40007:
            # Unsupported currency
            currencies = client.get_currencies()
            raise UnsupportedCurrency(currencies)
        else:
            raise
    return payment
```