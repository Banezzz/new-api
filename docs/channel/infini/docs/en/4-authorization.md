## 4 API Authentication Overview

Infini API uses an authentication mechanism based on **HMAC-SHA256** signature to ensure secure, reliable, unforgeable, and tamper-proof communication between merchants and Infini.

The authorization mechanism mainly includes the following elements:

- **API Key (keyId)**: Unique merchant identity identifier, used to identify the caller's identity in the request header. The keyId is the public key generated in the backend.
- **Secret Key (Private Key)**: Used for HMAC-SHA256 signature of request content, only displayed once and must be properly saved.
- **Signing String**: Composed of keyId, HTTP method, request path, and GMT time.
- **Authorization Header**: The final signature header, used for server-side verification of request legitimacy.
- **Timestamp Requirement**: Client time must be within ±300 seconds of server time.


> **Secret Key must be stored in a secure backend environment (such as KMS) and must not be exposed to front-end or mobile clients.**


All merchant APIs (prefix /v1/acquiring) must carry the following headers:

| Header | Example | Description |
|  --- | --- | --- |
| Date | Tue, 21 Jan 2025 12:00:00 GMT | GMT format server time |
| Digest | SHA-256=47DEQpj8...uFU= | Request body digest (required for requests with Body) |
| Authorization | Signature keyId="xxx"... | HMAC signature authentication header |


### 4.2 Signing String

The signing string format is the same for all requests (with or without body):


```
{keyId}
{METHOD} {path}
date: {GMT_time}
```

> **Note**: The body/digest does not participate in signature calculation. The Digest header is calculated separately and added to the request headers, but it is not included in the signing string.


Example (without Body):


```
merchant-001
GET /v1/acquiring/order?order_id=xxx
date: Tue, 21 Jan 2025 12:00:00 GMT
```

Example (with Body):


```
merchant-001
POST /v1/acquiring/order
date: Tue, 21 Jan 2025 12:00:00 GMT
```

### 4.3 Digest & Signature Calculation

#### Body Digest Calculation (for requests with Body)


```python
body_digest = hashlib.sha256(body.encode('utf-8')).digest()
body_digest_base64 = base64.b64encode(body_digest).decode('utf-8')
```

Algorithm definition:


```
body_digest_base64 = Base64( SHA256(body) )
```

#### Signature Calculation (for all requests)

Use the merchant's secret_key to perform HMAC-SHA256 calculation on the signing_string:


```python
signature = base64.b64encode(
hmac.new(secret_key, signing_string.encode(), hashlib.sha256).digest()
).decode()
```

Algorithm definition:


```
signature = Base64( HMAC_SHA256(secret_key, signing_string) )
```

### 4.4 HTTP Headers Format

**Requests without Body:**


```
Date: {GMT_time}
Authorization: Signature keyId="{keyId}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"
```

**Requests with Body:**


```
Date: {GMT_time}
Digest: SHA-256={body_digest_base64}
Authorization: Signature keyId="{keyId}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"
```

#### Common Client Examples

##### Python


```python

from __future__ import annotations

import base64
import hashlib
import hmac
import json as json_lib
from datetime import datetime, timezone
from email.utils import format_datetime

import requests


def _gmt_rfc1123() -> str:
    return format_datetime(datetime.now(timezone.utc), usegmt=True)


class InfiniClient:
    def __init__(self, key_id: str, secret_key: str | bytes, base_url: str = "https://openapi.infini.money"):
        self.key_id = key_id
        self.secret_key = secret_key.encode() if isinstance(secret_key, str) else secret_key
        self.base_url = base_url.rstrip("/")

    def _sign_request(self, method: str, path: str, body: str | None, *, digest: bool) -> dict[str, str]:
        gmt_time = _gmt_rfc1123()
        signing_string = f"{self.key_id}\n{method} {path}\ndate: {gmt_time}\n"
        signature = base64.b64encode(
            hmac.new(self.secret_key, signing_string.encode(), hashlib.sha256).digest()
        ).decode()
        headers: dict[str, str] = {
            "Date": gmt_time,
            "Authorization": (
                f'Signature keyId="{self.key_id}",algorithm="hmac-sha256",'
                f'headers="@request-target date",signature="{signature}"'
            ),
        }
        if digest and body is not None:
            d = hashlib.sha256(body.encode("utf-8")).digest()
            headers["Digest"] = "SHA-256=" + base64.b64encode(d).decode("ascii")
        return headers

    def request(
        self,
        method: str,
        path: str,
        json: dict | None = None,
        *,
        digest: bool = False,
        timeout: float = 30.0,
    ) -> dict:
        body: str | None = None
        if json is not None:
            body = json_lib.dumps(json, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

        headers = self._sign_request(method, path, body, digest=digest)
        if json is not None:
            headers["Content-Type"] = "application/json"

        r = requests.request(
            method,
            f"{self.base_url}{path}",
            data=body,
            headers=headers,
            timeout=timeout,
        )
        r.raise_for_status()
        return r.json()
```

##### Node.js


```javascript
const crypto = require("crypto");
const axios = require("axios");

class InfiniClient {
    constructor(keyId, secretKey, baseUrl = "https://openapi.infini.money") {
        this.keyId = keyId;
        this.secretKey = secretKey; 
        this.baseUrl = baseUrl;
    }

    _signRequest(method, path, body = null) {
        const gmtTime = new Date().toUTCString();

        const signingString =
            `${this.keyId}\n` +
            `${method.toUpperCase()} ${path}\n` +
            `date: ${gmtTime}\n`;

        const signature = crypto
            .createHmac("sha256", this.secretKey)
            .update(signingString)
            .digest("base64");

        const headers = {
            "Date": gmtTime,
            "Authorization":
                `Signature keyId="${this.keyId}",algorithm="hmac-sha256",headers="@request-target date",signature="${signature}"`
        };

        // Calculate and add Digest header if body exists (not used in signature)
        if (body !== null) {
            const bodyDigest = crypto.createHash("sha256").update(body, "utf-8").digest();
            const bodyDigestBase64 = bodyDigest.toString("base64");
            headers["Digest"] = `SHA-256=${bodyDigestBase64}`;
        }

        return headers;
    }

    async request(method, path, json = null) {
        let body = null;
        if (json !== null) {
            body = JSON.stringify(json);
        }

        const headers = this._signRequest(method, path, body);

        if (json !== null) {
            headers["Content-Type"] = "application/json";
        }

        const resp = await axios({
            method,
            url: `${this.baseUrl}${path}`,
            data: body,
            headers,
        });

        return resp.data;
    }
}

module.exports = InfiniClient;
```

##### Golang


```go
package infiniclient

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type InfiniClient struct {
	KeyID     string
	SecretKey string
	BaseURL   string
	Client    *http.Client
}

func NewInfiniClient(keyID, secretKey string, baseURL string) *InfiniClient {
	if baseURL == "" {
		baseURL = "https://openapi.infini.money"
	}
	return &InfiniClient{
		KeyID:     keyID,
		SecretKey: secretKey,
		BaseURL:   baseURL,
		Client:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *InfiniClient) signRequest(method, path string, body []byte) (map[string]string, error) {
	gmtTime := time.Now().UTC().Format("Mon, 02 Jan 2006 15:04:05 GMT")

	signingString := fmt.Sprintf(
		"%s\n%s %s\ndate: %s\n",
		c.KeyID,
		strings.ToUpper(method),
		path,
		gmtTime,
	)

	mac := hmac.New(sha256.New, []byte(c.SecretKey))
	mac.Write([]byte(signingString))
  
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	authHeader := fmt.Sprintf(
		`Signature keyId="%s",algorithm="hmac-sha256",headers="@request-target date",signature="%s"`,
		c.KeyID, signature,
	)

	headers := map[string]string{
		"Date":          gmtTime,
		"Authorization": authHeader,
	}

	// Calculate and add Digest header if body exists (not used in signature)
	if body != nil && len(body) > 0 {
		bodyDigest := sha256.Sum256(body)
		bodyDigestBase64 := base64.StdEncoding.EncodeToString(bodyDigest[:])
		headers["Digest"] = fmt.Sprintf("SHA-256=%s", bodyDigestBase64)
	}

	return headers, nil
}

func (c *InfiniClient) Request(method, path string, payload interface{}) (map[string]interface{}, error) {
	// Encode JSON body if provided
	var bodyBytes []byte
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		bodyBytes = b
	}

	// Sign
	headers, err := c.signRequest(method, path, bodyBytes)
	if err != nil {
		return nil, err
	}

	var body io.Reader
	if bodyBytes != nil {
		body = bytes.NewBuffer(bodyBytes)
		headers["Content-Type"] = "application/json"
	}

	// Build request
	req, err := http.NewRequest(method, c.BaseURL+path, body)
	if err != nil {
		return nil, err
	}

	// Set headers
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	// Send
	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Check status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("request failed: %s, body=%s", resp.Status, string(respBodyBytes))
	}

	// Decode JSON
	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}
```

##### Java


```java
package com.infini.client;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Locale;

/**
 * Infini API Request Signer
 * Generates authentication headers required by Infini API
 */
public class RequestSigner {
    private final String keyId;
    private final String secretKey;

    public RequestSigner(String keyId, String secretKey) {
        this.keyId = keyId;
        this.secretKey = secretKey;
    }

    /**
     * Generate signature headers for API request
     * 
     * @param method HTTP method (GET, POST, etc.)
     * @param path Request path (e.g., /v1/acquiring/order)
     * @param body Request body (JSON string, pass null for GET requests)
     * @return Headers map containing Date, Authorization and Digest (if body present)
     */
    public Map<String, String> signRequest(String method, String path, String body) throws Exception {
        // Generate GMT time
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.ENGLISH);
        String gmtTime = now.format(formatter);

        // Build signing string (digest not included)
        StringBuilder signingString = new StringBuilder();
        signingString.append(keyId).append("\n");
        signingString.append(method).append(" ").append(path).append("\n");
        signingString.append("date: ").append(gmtTime).append("\n");

        // Calculate HMAC-SHA256 signature
        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            secretKey.getBytes(StandardCharsets.UTF_8), 
            "HmacSHA256"
        );
        hmac.init(secretKeySpec);
        byte[] signatureBytes = hmac.doFinal(signingString.toString().getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getEncoder().encodeToString(signatureBytes);

        // Build headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Date", gmtTime);
        headers.put("Authorization", 
            String.format("Signature keyId=\"%s\",algorithm=\"hmac-sha256\",headers=\"@request-target date\",signature=\"%s\"",
                keyId, signature)
        );

        // If body present, calculate and add Digest header (not used in signature)
        if (body != null && !body.isEmpty()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bodyDigest = digest.digest(body.getBytes(StandardCharsets.UTF_8));
            String bodyDigestBase64 = Base64.getEncoder().encodeToString(bodyDigest);
            headers.put("Digest", "SHA-256=" + bodyDigestBase64);
        }

        return headers;
    }

    // Usage example
    public static void main(String[] args) {
        try {
            RequestSigner signer = new RequestSigner(
                "YOUR_KEY_ID", 
                "YOUR_SECRET_KEY"
            );

            // GET request (no body)
            System.out.println("=== GET Request ===");
            Map<String, String> headers1 = signer.signRequest("GET", "/v1/acquiring/order?order_id=xxx", null);
            headers1.forEach((k, v) -> System.out.println(k + ": " + v));

            System.out.println("\n=== POST Request ===");
            // POST request (with body)
            String jsonBody = "{\"amount\":\"1.00\",\"currency\":\"USD\",\"request_id\":\"req-001\",\"client_reference\":\"client-001\",\"order_desc\":\"Test Order\",\"pay_methods\":[1,2]}";
            Map<String, String> headers2 = signer.signRequest("POST", "/v1/acquiring/order", jsonBody);
            headers2.forEach((k, v) -> System.out.println(k + ": " + v));

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### 4.5 Clock Skew Requirement

The Date in the request header must be within **±300 seconds** of the server time; otherwise, it will return:


```
401 Unauthorized
```

Please ensure the server is synchronized with NTP.

### 4.6 Webhook Signature Verification

When Infini pushes order status callbacks to merchants, it includes a signature.
Merchants need to verify the signature to confirm the message source is trustworthy and prevent content tampering.

Webhook requests contain the following headers:

| Header | Description |
|  --- | --- |
| X-Webhook-Timestamp | Unix timestamp |
| X-Webhook-Event-Id | Unique event ID |
| X-Webhook-Signature | HMAC-SHA256 signature value |


#### 4.6.1 Webhook Signing Content Format

Signature string format:


```
{timestamp}.{event_id}.{payload_body}
```

Example:


```
1700000000.1234.{"event":"order.completed", "order_id":"xxx"}
```

Calculation method:


```
expected_signature = HMAC_SHA256(webhook_secret, signing_content)
```

Verify legitimacy:


```
X-Webhook-Signature == expected_signature
```

#### 4.6.2 Webhook Verification Example (Python)


```python
@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    event_id = request.headers.get('X-Webhook-Event-Id')

    if not all([signature, timestamp, event_id]):
        return {"error": "Missing required headers"}, 400

    payload = request.get_data(as_text=True)
    signed_content = f"{timestamp}.{event_id}.{payload}"

    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_content.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_sig != signature:
        return {"error": "Invalid signature"}, 401

    # Process webhook payload
    return {"status": "ok"}
```

### 4.7 Security Best Practices

- Private key (secret_key) is only displayed once and should be backed up immediately and securely.
- Secret Key must not be exposed in web pages, JS, Apps, or public repositories.
- It is recommended to use KMS / Secret Manager to manage keys.
- IP whitelist can be enabled when creating keys to restrict access sources.
- Webhook callbacks must use HTTPS.
- Regular key rotation is recommended.