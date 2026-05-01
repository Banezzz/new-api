## 4. 授权与安全机制

Infini API 使用基于 **HMAC-SHA256** 的签名认证机制，确保商户与 Infini 之间的通信安全可靠、不可伪造、不可篡改。

授权机制主要包含以下要素：

- **API Key（keyId）**：商户唯一身份标识，用于在请求头中标识调用方身份。keyId 就是在后台生成的 public key。
- **Secret Key（私钥）**：用于对请求内容进行 HMAC-SHA256 签名，只展示一次，必须妥善保存。
- **签名字符串（Signing String）**：由 keyId、HTTP 方法、请求路径与 GMT 时间组成。
- **Authorization Header**：最终的签名头，用于服务端验证请求合法性。
- **时间戳要求**：客户端时间需与服务器保持 ±300 秒以内偏差。


> **Secret Key 必须存放在后端安全环境（如 KMS），不得暴露给前端或移动端。**


### 4.1 API 鉴权概述

所有商户 API（前缀 /v1/acquiring）必须携带以下 Header：

| Header | 示例 | 说明 |
|  --- | --- | --- |
| Date | Tue, 21 Jan 2025 12:00:00 GMT | GMT 格式服务器时间 |
| Digest | SHA-256=47DEQpj8...uFU= | 请求体摘要（有 Body 时必须携带） |
| Authorization | Signature keyId="xxx"... | HMAC 签名认证头 |


### 4.2 签名字符串（Signing String）

签名字符串（signing_string）格式如下（有无 Body 的请求格式相同）：


```
{keyId}
{METHOD} {path}
date: {GMT_time}
```

> **注意**：body/digest 不参与签名计算。Digest header 需要单独计算并添加到请求头中，但不包含在签名字符串中。


示例（无 Body）：


```
merchant-001
GET /v1/acquiring/order?order_id=xxx
date: Tue, 21 Jan 2025 12:00:00 GMT
```

示例（有 Body）：


```
merchant-001
POST /v1/acquiring/order
date: Tue, 21 Jan 2025 12:00:00 GMT
```

### 4.3 摘要和签名计算（Digest & Signature Calculation）

#### Body Digest 计算（有 Body 时）


```python
body_digest = hashlib.sha256(body.encode('utf-8')).digest()
body_digest_base64 = base64.b64encode(body_digest).decode('utf-8')
```

算法定义：


```
body_digest_base64 = Base64( SHA256(body) )
```

#### Signature 计算（所有请求）

使用商户的 secret_key 对 signing_string 进行 HMAC-SHA256 计算：


```python
signature = base64.b64encode(
hmac.new(secret_key, signing_string.encode(), hashlib.sha256).digest()
).decode()
```

算法定义：


```
signature = Base64( HMAC_SHA256(secret_key, signing_string) )
```

### 4.4 HTTP Headers 格式

**无 Body 请求：**


```
Date: {GMT_time}
Authorization: Signature keyId="{keyId}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"
```

**有 Body 请求：**


```
Date: {GMT_time}
Digest: SHA-256={body_digest_base64}
Authorization: Signature keyId="{keyId}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"
```

#### 通用客户端示例

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

##### Nodejs


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

        // 如果有 body，计算并添加 Digest header（不参与签名）
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

	// 如果有 body，计算并添加 Digest header（不参与签名）
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
 * Infini API 请求签名工具
 * 用于生成符合 Infini API 要求的认证 Headers
 */
public class RequestSigner {
    private final String keyId;
    private final String secretKey;

    public RequestSigner(String keyId, String secretKey) {
        this.keyId = keyId;
        this.secretKey = secretKey;
    }

    /**
     * 为 API 请求生成签名 Headers
     * 
     * @param method HTTP 方法（GET、POST 等）
     * @param path 请求路径（如 /v1/acquiring/order）
     * @param body 请求体（JSON 字符串，如果是 GET 请求则传 null）
     * @return 包含 Date、Authorization 和 Digest（如有 body）的 Headers Map
     */
    public Map<String, String> signRequest(String method, String path, String body) throws Exception {
        // 生成 GMT 时间
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.ENGLISH);
        String gmtTime = now.format(formatter);

        // 构建签名字符串（不包含 digest）
        StringBuilder signingString = new StringBuilder();
        signingString.append(keyId).append("\n");
        signingString.append(method).append(" ").append(path).append("\n");
        signingString.append("date: ").append(gmtTime).append("\n");

        // 计算 HMAC-SHA256 签名
        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            secretKey.getBytes(StandardCharsets.UTF_8), 
            "HmacSHA256"
        );
        hmac.init(secretKeySpec);
        byte[] signatureBytes = hmac.doFinal(signingString.toString().getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getEncoder().encodeToString(signatureBytes);

        // 构建 headers
        Map<String, String> headers = new HashMap<>();
        headers.put("Date", gmtTime);
        headers.put("Authorization", 
            String.format("Signature keyId=\"%s\",algorithm=\"hmac-sha256\",headers=\"@request-target date\",signature=\"%s\"",
                keyId, signature)
        );

        // 如果有 body，计算并添加 Digest header（不参与签名）
        if (body != null && !body.isEmpty()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bodyDigest = digest.digest(body.getBytes(StandardCharsets.UTF_8));
            String bodyDigestBase64 = Base64.getEncoder().encodeToString(bodyDigest);
            headers.put("Digest", "SHA-256=" + bodyDigestBase64);
        }

        return headers;
    }

    // 使用示例
    public static void main(String[] args) {
        try {
            RequestSigner signer = new RequestSigner(
                "YOUR_KEY_ID", 
                "YOUR_SECRET_KEY"
            );

            // GET 请求（无 body）
            System.out.println("=== GET Request ===");
            Map<String, String> headers1 = signer.signRequest("GET", "/v1/acquiring/order?order_id=xxx", null);
            headers1.forEach((k, v) -> System.out.println(k + ": " + v));

            System.out.println("\n=== POST Request ===");
            // POST 请求（有 body）
            String jsonBody = "{\"amount\":\"1.00\",\"currency\":\"USD\",\"request_id\":\"req-001\",\"client_reference\":\"client-001\",\"order_desc\":\"Test Order\",\"pay_methods\":[1,2]}";
            Map<String, String> headers2 = signer.signRequest("POST", "/v1/acquiring/order", jsonBody);
            headers2.forEach((k, v) -> System.out.println(k + ": " + v));

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### 4.5 时间偏差要求（Clock Skew）

请求头中的 Date 必须与服务器时间保持 **±300 秒以内误差**；否则将返回：


```
401 Unauthorized
```

请确保服务器与 NTP 同步。

### 4.6 Webhook 签名验证（Webhook Verification）

Infini 向商户推送订单状态回调时，会附带签名。
商户需对签名进行校验，以确认消息来源可信并防止内容被篡改。

Webhook 请求包含以下 Header：

| Header | 说明 |
|  --- | --- |
| X-Webhook-Timestamp | Unix 时间戳 |
| X-Webhook-Event-Id | 本次事件唯一 ID |
| X-Webhook-Signature | HMAC-SHA256 签名值 |


#### 4.6.1 Webhook 签名内容格式（Signing Content）

签名字符串格式：


```
{timestamp}.{event_id}.{payload_body}
```

示例：


```
1700000000.1234.{"event":"order.completed", "order_id":"xxx"}
```

计算方式：


```
expected_signature = HMAC_SHA256(webhook_secret, signing_content)
```

判断合法性：


```
X-Webhook-Signature == expected_signature
```

#### 4.6.2 Webhook 验签示例（Python）


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

### 4.7 安全最佳实践

- 私钥（secret_key）仅展示一次，应立即安全备份。
- 不得将 Secret Key 暴露在网页、JS、App 或公共仓库中。
- 建议使用 KMS / Secret Manager 管理密钥。
- 可在创建密钥时启用 IP 白名单限制访问来源。
- Webhook 回调必须使用 HTTPS。
- 建议定期轮换密钥（Key Rotation）。