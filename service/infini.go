package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
)

const (
	InfiniProductionBaseURL = "https://openapi.infini.money"
	InfiniSandboxBaseURL    = "https://openapi-sandbox.infini.money"
)

type InfiniClient struct {
	KeyID     string
	SecretKey string
	BaseURL   string
	Client    *http.Client
}

type InfiniCreateOrderRequest struct {
	Amount          string `json:"amount"`
	RequestID       string `json:"request_id"`
	ClientReference string `json:"client_reference,omitempty"`
	OrderDesc       string `json:"order_desc,omitempty"`
	ExpiresIn       int    `json:"expires_in,omitempty"`
	MerchantAlias   string `json:"merchant_alias,omitempty"`
	SuccessURL      string `json:"success_url,omitempty"`
	FailureURL      string `json:"failure_url,omitempty"`
	PayMethods      []int  `json:"pay_methods,omitempty"`
}

type InfiniCreateOrderResponse struct {
	ClientReference string `json:"client_reference"`
	RequestID       string `json:"request_id"`
	OrderID         string `json:"order_id"`
	CheckoutURL     string `json:"checkout_url"`
	Token           string `json:"token"`
}

type InfiniQueryOrderResponse struct {
	MerchantID      string   `json:"merchant_id"`
	RequestID       string   `json:"request_id"`
	OrderID         string   `json:"order_id"`
	ClientReference string   `json:"client_reference"`
	OrderDesc       string   `json:"order_desc"`
	OrderCurrency   string   `json:"order_currency"`
	Status          string   `json:"status"`
	CreatedAt       int64    `json:"created_at"`
	UpdatedAt       int64    `json:"updated_at"`
	ExpiresAt       int64    `json:"expires_at"`
	ExceptionTag    []string `json:"exception_tag"`
}

type InfiniReissueOrderTokenRequest struct {
	OrderID string `json:"order_id"`
}

type InfiniReissueOrderTokenResponse struct {
	OrderID     string `json:"order_id"`
	CheckoutURL string `json:"checkout_url"`
	Token       string `json:"token"`
}

type InfiniWebhookOrderEvent struct {
	Event            string   `json:"event"`
	OrderID          string   `json:"order_id"`
	ClientReference  string   `json:"client_reference"`
	Amount           string   `json:"amount"`
	Currency         string   `json:"currency"`
	Status           string   `json:"status"`
	AmountConfirming string   `json:"amount_confirming"`
	AmountConfirmed  string   `json:"amount_confirmed"`
	CreatedAt        int64    `json:"created_at"`
	UpdatedAt        int64    `json:"updated_at"`
	ExceptionTags    []string `json:"exception_tags,omitempty"`
	ExceptionTag     []string `json:"exception_tag,omitempty"`
}

func NewConfiguredInfiniClient() (*InfiniClient, error) {
	keyID := strings.TrimSpace(setting.InfiniKeyId)
	secretKey := strings.TrimSpace(setting.InfiniSecretKey)
	if keyID == "" || secretKey == "" {
		return nil, fmt.Errorf("infini credentials are not configured")
	}

	client := GetHttpClient()
	if client == nil {
		client = http.DefaultClient
	}

	return &InfiniClient{
		KeyID:     keyID,
		SecretKey: secretKey,
		BaseURL:   resolveInfiniBaseURL(),
		Client:    client,
	}, nil
}

func resolveInfiniBaseURL() string {
	if baseURL := strings.TrimSpace(setting.InfiniBaseURL); baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}
	if setting.InfiniSandbox {
		return InfiniSandboxBaseURL
	}
	return InfiniProductionBaseURL
}

func (c *InfiniClient) CreateOrder(ctx context.Context, req *InfiniCreateOrderRequest) (*InfiniCreateOrderResponse, error) {
	var resp InfiniCreateOrderResponse
	if err := c.requestJSON(ctx, http.MethodPost, "/v1/acquiring/order", req, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *InfiniClient) QueryOrder(ctx context.Context, orderID string) (*InfiniQueryOrderResponse, error) {
	query := url.Values{}
	query.Set("order_id", orderID)
	path := "/v1/acquiring/order?" + query.Encode()
	var resp InfiniQueryOrderResponse
	if err := c.requestJSON(ctx, http.MethodGet, path, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *InfiniClient) ReissueOrderToken(ctx context.Context, orderID string) (*InfiniReissueOrderTokenResponse, error) {
	var resp InfiniReissueOrderTokenResponse
	if err := c.requestJSON(ctx, http.MethodPost, "/v1/acquiring/order/token/reissue", &InfiniReissueOrderTokenRequest{
		OrderID: orderID,
	}, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *InfiniClient) requestJSON(ctx context.Context, method string, path string, payload any, out any) error {
	var body []byte
	var err error
	if payload != nil {
		body, err = common.Marshal(payload)
		if err != nil {
			return err
		}
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}

	headers := c.signRequest(method, path, body)
	for key, value := range headers {
		httpReq.Header.Set(key, value)
	}
	if payload != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}

	httpResp, err := c.Client.Do(httpReq)
	if err != nil {
		return err
	}
	defer CloseResponseBodyGracefully(httpResp)

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return err
	}
	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return fmt.Errorf("infini api request failed: status=%d body=%s", httpResp.StatusCode, string(respBody))
	}
	if out == nil || len(respBody) == 0 {
		return nil
	}
	return common.Unmarshal(respBody, out)
}

func (c *InfiniClient) signRequest(method string, path string, body []byte) map[string]string {
	gmtTime := time.Now().UTC().Format(http.TimeFormat)
	signingString := fmt.Sprintf("%s\n%s %s\ndate: %s\n", c.KeyID, strings.ToUpper(method), path, gmtTime)

	mac := hmac.New(sha256.New, []byte(c.SecretKey))
	mac.Write([]byte(signingString))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	headers := map[string]string{
		"Date": gmtTime,
		"Authorization": fmt.Sprintf(
			`Signature keyId="%s",algorithm="hmac-sha256",headers="@request-target date",signature="%s"`,
			c.KeyID,
			signature,
		),
	}

	if len(body) > 0 {
		digest := sha256.Sum256(body)
		headers["Digest"] = "SHA-256=" + base64.StdEncoding.EncodeToString(digest[:])
	}
	return headers
}

func VerifyInfiniWebhookSignature(payload string, timestamp string, eventID string, signature string, webhookSecret string) bool {
	if strings.TrimSpace(payload) == "" ||
		strings.TrimSpace(timestamp) == "" ||
		strings.TrimSpace(eventID) == "" ||
		strings.TrimSpace(signature) == "" ||
		strings.TrimSpace(webhookSecret) == "" {
		return false
	}

	signedContent := fmt.Sprintf("%s.%s.%s", timestamp, eventID, payload)
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(signedContent))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(expectedSignature)), []byte(strings.ToLower(signature)))
}

func ParseInfiniAmount(raw string) (decimal.Decimal, error) {
	return decimal.NewFromString(strings.TrimSpace(raw))
}
