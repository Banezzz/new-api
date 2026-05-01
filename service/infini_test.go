package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/require"
)

func TestVerifyInfiniWebhookSignature(t *testing.T) {
	payload := `{"event":"order.completed","order_id":"ord_123"}`
	timestamp := "1710000000"
	eventID := "evt_123"
	secret := "whsec_test"

	signedContent := timestamp + "." + eventID + "." + payload
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedContent))
	signature := hex.EncodeToString(mac.Sum(nil))

	require.True(t, VerifyInfiniWebhookSignature(payload, timestamp, eventID, signature, secret))
	require.True(t, VerifyInfiniWebhookSignature(payload, timestamp, eventID, strings.ToUpper(signature), secret))
	require.False(t, VerifyInfiniWebhookSignature(payload, timestamp, eventID, "bad_signature", secret))
	require.False(t, VerifyInfiniWebhookSignature(payload, timestamp, eventID, signature, "wrong_secret"))
}

func TestResolveInfiniBaseURL(t *testing.T) {
	originalSandbox := setting.InfiniSandbox
	originalBaseURL := setting.InfiniBaseURL
	t.Cleanup(func() {
		setting.InfiniSandbox = originalSandbox
		setting.InfiniBaseURL = originalBaseURL
	})

	setting.InfiniBaseURL = ""
	setting.InfiniSandbox = false
	require.Equal(t, InfiniProductionBaseURL, resolveInfiniBaseURL())

	setting.InfiniSandbox = true
	require.Equal(t, InfiniSandboxBaseURL, resolveInfiniBaseURL())

	setting.InfiniBaseURL = "https://custom.infini.test/"
	require.Equal(t, "https://custom.infini.test", resolveInfiniBaseURL())
}

func TestUnmarshalInfiniResponseSupportsWrappedPayload(t *testing.T) {
	body := []byte(`{"code":0,"message":"","data":{"order_id":"ord_123","request_id":"req_123","checkout_url":"https://checkout.infini.money/pay/abc"}}`)
	var resp InfiniCreateOrderResponse
	require.NoError(t, unmarshalInfiniResponse(body, &resp))
	require.Equal(t, "ord_123", resp.OrderID)
	require.Equal(t, "req_123", resp.RequestID)
	require.Equal(t, "https://checkout.infini.money/pay/abc", resp.CheckoutURL)
}

func TestCreateOrderReissuesCheckoutURLWhenMissing(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/acquiring/order", func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":0,"message":"","data":{"order_id":"ord_123","request_id":"req_123","client_reference":"trade_123"}}`))
	})
	mux.HandleFunc("/v1/acquiring/order/token/reissue", func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"code":0,"message":"","data":{"order_id":"ord_123","checkout_url":"https://checkout.infini.money/pay/abc","token":"token_123"}}`))
	})

	server := httptest.NewServer(mux)
	defer server.Close()

	client := &InfiniClient{
		KeyID:     "test_key",
		SecretKey: "test_secret",
		BaseURL:   server.URL,
		Client:    server.Client(),
	}

	resp, err := client.CreateOrder(context.Background(), &InfiniCreateOrderRequest{
		Amount:    "1",
		RequestID: "req_123",
	})
	require.NoError(t, err)
	require.Equal(t, "ord_123", resp.OrderID)
	require.Equal(t, "req_123", resp.RequestID)
	require.Equal(t, "https://checkout.infini.money/pay/abc", resp.CheckoutURL)
	require.Equal(t, "token_123", resp.Token)
}
