package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
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
