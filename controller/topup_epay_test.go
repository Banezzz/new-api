package controller

import (
	"net/url"
	"testing"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSignEpayPurchaseParamsIncludesFiatInSignature(t *testing.T) {
	client, err := epay.NewClient(&epay.Config{
		PartnerID: "test-partner",
		Key:       "test-key",
	}, "https://pay.example.com")
	require.NoError(t, err)

	notifyURL, err := url.Parse("https://example.com/notify")
	require.NoError(t, err)
	returnURL, err := url.Parse("https://example.com/return")
	require.NoError(t, err)

	_, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           "usdt",
		ServiceTradeNo: "TEST123",
		Name:           "TUC10",
		Money:          "10.00",
		Device:         epay.PC,
		NotifyUrl:      notifyURL,
		ReturnUrl:      returnURL,
	})
	require.NoError(t, err)
	originalSign := params["sign"]

	signEpayPurchaseParams(params, client)

	assert.Equal(t, "USD", params["fiat"])
	assert.NotEqual(t, originalSign, params["sign"])
	verifyResult, err := client.Verify(params)
	require.NoError(t, err)
	assert.True(t, verifyResult.VerifyStatus)

	params["fiat"] = "CNY"
	verifyResult, err = client.Verify(params)
	require.NoError(t, err)
	assert.False(t, verifyResult.VerifyStatus)
}
