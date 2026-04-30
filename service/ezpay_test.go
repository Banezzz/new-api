package service

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/require"
)

func TestSignEpusdtParams(t *testing.T) {
	signature, err := SignEpusdtParams(map[string]any{
		"pid":          "1000",
		"order_id":     "ORD1",
		"currency":     "cny",
		"token":        "usdt",
		"network":      "tron",
		"amount":       10.5,
		"notify_url":   "https://n.example/notify",
		"redirect_url": "",
		"signature":    "ignored",
	}, "test_secret")

	require.NoError(t, err)
	require.Equal(t, "27fe3dcbf3b0a7f71e829e7df35b32f0", signature)
}

func TestVerifyEpusdtWebhookSignature(t *testing.T) {
	event := &EpusdtOrderNotifyEvent{
		PID:                "1000",
		TradeID:            "T20260424001",
		OrderID:            "EPUORDER1",
		Amount:             10,
		ActualAmount:       1.25,
		ReceiveAddress:     "TAddress",
		Token:              "USDT",
		BlockTransactionID: "0xabc",
		Status:             2,
	}
	signature, err := SignEpusdtParams(map[string]any{
		"pid":                  event.PID,
		"trade_id":             event.TradeID,
		"order_id":             event.OrderID,
		"amount":               event.Amount,
		"actual_amount":        event.ActualAmount,
		"receive_address":      event.ReceiveAddress,
		"token":                event.Token,
		"block_transaction_id": event.BlockTransactionID,
		"status":               event.Status,
	}, "secret")
	require.NoError(t, err)
	event.Signature = signature

	require.True(t, VerifyEpusdtWebhookSignature(event, "secret"))
	event.Signature = "bad"
	require.False(t, VerifyEpusdtWebhookSignature(event, "secret"))
}

func TestResolveEpusdtPublicPaymentURL(t *testing.T) {
	originalPublicURL := setting.EpusdtPublicURL
	t.Cleanup(func() {
		setting.EpusdtPublicURL = originalPublicURL
	})

	setting.EpusdtPublicURL = "https://pay.example.com/epusdt"
	require.Equal(
		t,
		"https://pay.example.com/epusdt/pay/checkout-counter/T123?foo=bar",
		ResolveEpusdtPublicPaymentURL("http://epusdt:8000/pay/checkout-counter/T123?foo=bar"),
	)

	setting.EpusdtPublicURL = ""
	require.Equal(t, "http://epusdt:8000/pay/checkout-counter/T123", ResolveEpusdtPublicPaymentURL("http://epusdt:8000/pay/checkout-counter/T123"))
}
