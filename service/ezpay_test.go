package service

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/require"
)

func TestSignEzpayParams(t *testing.T) {
	signature, err := SignEzpayParams(map[string]any{
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

func TestVerifyEzpayWebhookSignature(t *testing.T) {
	event := &EzpayOrderNotifyEvent{
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
	signature, err := SignEzpayParams(map[string]any{
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

	require.True(t, VerifyEzpayWebhookSignature(event, "secret"))
	event.Signature = "bad"
	require.False(t, VerifyEzpayWebhookSignature(event, "secret"))
}

func TestResolveEzpayPublicPaymentURL(t *testing.T) {
	originalPublicURL := setting.EzpayPublicURL
	t.Cleanup(func() {
		setting.EzpayPublicURL = originalPublicURL
	})

	setting.EzpayPublicURL = "https://pay.example.com/ezpay"
	require.Equal(
		t,
		"https://pay.example.com/ezpay/pay/checkout-counter/T123?foo=bar",
		ResolveEzpayPublicPaymentURL("http://ezpay:8000/pay/checkout-counter/T123?foo=bar"),
	)

	setting.EzpayPublicURL = ""
	require.Equal(t, "http://ezpay:8000/pay/checkout-counter/T123", ResolveEzpayPublicPaymentURL("http://ezpay:8000/pay/checkout-counter/T123"))
}
