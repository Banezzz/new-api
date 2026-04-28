package service

import (
	"bytes"
	"context"
	"crypto/md5" // #nosec G401,G501 -- EPUSDT protocol requires MD5 signatures.
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
)

const EpusdtDefaultBaseURL = "http://epusdt:8001"

type EpusdtClient struct {
	BaseURL   string
	PID       string
	SecretKey string
	Client    *http.Client
}

type EpusdtCreateTransactionRequest struct {
	OrderID     string
	Currency    string
	Token       string
	Network     string
	Amount      float64
	NotifyURL   string
	RedirectURL string
	Name        string
	PaymentType string
}

type EpusdtCreateTransactionResponse struct {
	TradeID        string  `json:"trade_id"`
	OrderID        string  `json:"order_id"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	ActualAmount   float64 `json:"actual_amount"`
	ReceiveAddress string  `json:"receive_address"`
	Token          string  `json:"token"`
	ExpirationTime int64   `json:"expiration_time"`
	PaymentURL     string  `json:"payment_url"`
}

type EpusdtOrderNotifyEvent struct {
	PID                string  `json:"pid"`
	TradeID            string  `json:"trade_id"`
	OrderID            string  `json:"order_id"`
	Amount             float64 `json:"amount"`
	ActualAmount       float64 `json:"actual_amount"`
	ReceiveAddress     string  `json:"receive_address"`
	Token              string  `json:"token"`
	BlockTransactionID string  `json:"block_transaction_id"`
	Signature          string  `json:"signature"`
	Status             int     `json:"status"`
}

type epusdtAPIResponseEnvelope struct {
	StatusCode int             `json:"status_code"`
	Message    string          `json:"message"`
	Data       json.RawMessage `json:"data"`
}

func NewConfiguredEpusdtClient() (*EpusdtClient, error) {
	pid := strings.TrimSpace(setting.EpusdtPID)
	secretKey := strings.TrimSpace(setting.EpusdtSecretKey)
	if pid == "" || secretKey == "" {
		return nil, fmt.Errorf("epusdt credentials are not configured")
	}

	client := GetHttpClient()
	if client == nil {
		client = http.DefaultClient
	}

	return &EpusdtClient{
		BaseURL:   resolveEpusdtBaseURL(),
		PID:       pid,
		SecretKey: secretKey,
		Client:    client,
	}, nil
}

func resolveEpusdtBaseURL() string {
	if baseURL := strings.TrimSpace(setting.EpusdtBaseURL); baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}
	return EpusdtDefaultBaseURL
}

func (c *EpusdtClient) CreateTransaction(ctx context.Context, req *EpusdtCreateTransactionRequest) (*EpusdtCreateTransactionResponse, error) {
	if req == nil {
		return nil, errors.New("epusdt create transaction request is nil")
	}
	payload := map[string]any{
		"pid":          c.PID,
		"order_id":     strings.TrimSpace(req.OrderID),
		"currency":     strings.TrimSpace(req.Currency),
		"token":        strings.TrimSpace(req.Token),
		"network":      strings.TrimSpace(req.Network),
		"amount":       req.Amount,
		"notify_url":   strings.TrimSpace(req.NotifyURL),
		"redirect_url": strings.TrimSpace(req.RedirectURL),
		"name":         strings.TrimSpace(req.Name),
		"payment_type": strings.TrimSpace(req.PaymentType),
	}
	signature, err := SignEpusdtParams(payload, c.SecretKey)
	if err != nil {
		return nil, err
	}
	payload["signature"] = signature

	var resp EpusdtCreateTransactionResponse
	if err := c.requestJSON(ctx, http.MethodPost, "/payments/gmpay/v1/order/create-transaction", payload, &resp); err != nil {
		return nil, err
	}
	resp.PaymentURL = ResolveEpusdtPublicPaymentURL(resp.PaymentURL)
	return &resp, nil
}

func (c *EpusdtClient) requestJSON(ctx context.Context, method string, path string, payload any, out any) error {
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
		return fmt.Errorf("epusdt api request failed: status=%d body=%s", httpResp.StatusCode, string(respBody))
	}
	if out == nil || len(respBody) == 0 {
		return nil
	}
	return unmarshalEpusdtResponse(respBody, out)
}

func unmarshalEpusdtResponse(respBody []byte, out any) error {
	var envelope epusdtAPIResponseEnvelope
	if err := common.Unmarshal(respBody, &envelope); err == nil && envelope.StatusCode != 0 {
		if envelope.StatusCode != http.StatusOK {
			return fmt.Errorf("epusdt api request failed: code=%d message=%s", envelope.StatusCode, strings.TrimSpace(envelope.Message))
		}
		if len(envelope.Data) == 0 || string(envelope.Data) == "null" {
			return nil
		}
		return common.Unmarshal(envelope.Data, out)
	}
	return common.Unmarshal(respBody, out)
}

func SignEpusdtParams(params map[string]any, secretKey string) (string, error) {
	secretKey = strings.TrimSpace(secretKey)
	if secretKey == "" {
		return "", errors.New("epusdt secret key is empty")
	}

	pairs := make([]string, 0, len(params))
	for key, value := range params {
		if key == "signature" || value == nil {
			continue
		}
		valueStr, err := epusdtSignatureValue(value)
		if err != nil {
			return "", err
		}
		if valueStr == "" {
			continue
		}
		pairs = append(pairs, key+"="+valueStr)
	}
	sort.Strings(pairs)

	sum := md5.Sum([]byte(strings.Join(pairs, "&") + secretKey))
	return hex.EncodeToString(sum[:]), nil
}

func epusdtSignatureValue(value any) (string, error) {
	switch v := value.(type) {
	case string:
		return v, nil
	case []byte:
		return string(v), nil
	case int:
		return strconv.Itoa(v), nil
	case int8:
		return strconv.Itoa(int(v)), nil
	case int16:
		return strconv.Itoa(int(v)), nil
	case int32:
		return strconv.Itoa(int(v)), nil
	case int64:
		return strconv.FormatInt(v, 10), nil
	case uint:
		return strconv.FormatUint(uint64(v), 10), nil
	case uint8:
		return strconv.FormatUint(uint64(v), 10), nil
	case uint16:
		return strconv.FormatUint(uint64(v), 10), nil
	case uint32:
		return strconv.FormatUint(uint64(v), 10), nil
	case uint64:
		return strconv.FormatUint(v, 10), nil
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 64), nil
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), nil
	case json.Number:
		return v.String(), nil
	default:
		return "", fmt.Errorf("unsupported epusdt signature value type %T", value)
	}
}

func VerifyEpusdtWebhookSignature(event *EpusdtOrderNotifyEvent, secretKey string) bool {
	if event == nil || strings.TrimSpace(event.Signature) == "" || strings.TrimSpace(secretKey) == "" {
		return false
	}
	params := map[string]any{
		"pid":                  event.PID,
		"trade_id":             event.TradeID,
		"order_id":             event.OrderID,
		"amount":               event.Amount,
		"actual_amount":        event.ActualAmount,
		"receive_address":      event.ReceiveAddress,
		"token":                event.Token,
		"block_transaction_id": event.BlockTransactionID,
		"status":               event.Status,
	}
	expected, err := SignEpusdtParams(params, secretKey)
	if err != nil {
		return false
	}
	return strings.EqualFold(expected, event.Signature)
}

func ResolveEpusdtPublicPaymentURL(rawPaymentURL string) string {
	rawPaymentURL = strings.TrimSpace(rawPaymentURL)
	publicBase := strings.TrimSpace(setting.EpusdtPublicURL)
	if rawPaymentURL == "" || publicBase == "" {
		return rawPaymentURL
	}

	paymentURL, err := url.Parse(rawPaymentURL)
	if err != nil || paymentURL.Path == "" {
		return rawPaymentURL
	}
	baseURL, err := url.Parse(strings.TrimRight(publicBase, "/"))
	if err != nil || baseURL.Scheme == "" || baseURL.Host == "" {
		return rawPaymentURL
	}
	baseURL.Path = strings.TrimRight(baseURL.Path, "/") + paymentURL.Path
	baseURL.RawQuery = paymentURL.RawQuery
	return baseURL.String()
}
