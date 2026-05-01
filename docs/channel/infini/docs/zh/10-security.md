## 10. 安全与合规（Security & Compliance）

1. HMAC secret_key 仅可存放于服务端安全存储中，禁止透传至前端或移动端。
2. 调用方应使用全局唯一的 request_id 以保证业务幂等性。
3. 默认速率限制为每个 API Key 每分钟 600 次请求，如需更高配额请联系技术支持。


### 10.1 支持渠道

- 技术支持邮箱：**dev@infini.money**