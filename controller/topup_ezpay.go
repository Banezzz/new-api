package controller

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

const (
	ezpayOrderStatusWaiting = 1
	ezpayOrderStatusSuccess = 2
	ezpayOrderStatusExpired = 3
)

type EzpayPayRequest struct {
	Amount int64 `json:"amount"`
}

type SubscriptionEzpayPayRequest struct {
	PlanId int `json:"plan_id"`
}

func getEzpayPayMoney(amount int64, group string) float64 {
	dAmount := decimal.NewFromInt(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount = dAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && ds > 0 {
		discount = ds
	}

	return dAmount.
		Mul(decimal.NewFromFloat(setting.EzpayUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount)).
		InexactFloat64()
}

func normalizeEzpayTopUpAmount(amount int64) int64 {
	if operation_setting.GetQuotaDisplayType() != operation_setting.QuotaDisplayTypeTokens {
		return amount
	}

	normalized := decimal.NewFromInt(amount).
		Div(decimal.NewFromFloat(common.QuotaPerUnit)).
		IntPart()
	if normalized < 1 {
		return 1
	}
	return normalized
}

func newEzpayTradeNo(prefix string) string {
	prefix = strings.ToUpper(strings.TrimSpace(prefix))
	if prefix == "" {
		prefix = "EZP"
	}
	return prefix + strconv.FormatInt(time.Now().UnixMilli(), 36) + strings.ToUpper(randstr.String(8))
}

func resolveEzpayURL(rawURL string, emptyAllowed bool, emptyError string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		if emptyAllowed {
			return "", nil
		}
		return "", errors.New(emptyError)
	}
	parsedURL, err := url.Parse(rawURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", errors.New("EZPay URL 配置错误")
	}
	return strings.TrimRight(rawURL, "/"), nil
}

func getEzpayNotifyURL() (string, error) {
	if strings.TrimSpace(setting.EzpayNotifyURL) != "" {
		return resolveEzpayURL(setting.EzpayNotifyURL, false, "请先配置 EZPay 回调地址")
	}

	callbackAddress := strings.TrimRight(strings.TrimSpace(service.GetCallbackAddress()), "/")
	if callbackAddress == "" {
		return "", errors.New("请先配置服务器地址、回调地址或 EZPay 自定义回调地址")
	}
	return resolveEzpayURL(callbackAddress+"/api/ezpay/webhook", false, "请先配置 EZPay 回调地址")
}

func getEzpayReturnURL() (string, error) {
	if strings.TrimSpace(setting.EzpayReturnURL) != "" {
		return resolveEzpayURL(setting.EzpayReturnURL, false, "EZPay 跳转地址配置错误")
	}

	serverAddress := strings.TrimRight(strings.TrimSpace(system_setting.ServerAddress), "/")
	if serverAddress == "" {
		return "", nil
	}
	return resolveEzpayURL(serverAddress+"/console/topup?show_history=true", false, "EZPay 跳转地址配置错误")
}

func RequestEzpayAmount(c *gin.Context) {
	var req EzpayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < int64(setting.EzpayMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", setting.EzpayMinTopUp)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getEzpayPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func RequestEzpayPay(c *gin.Context) {
	if !isEzpayTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "EZPay 支付未启用"})
		return
	}

	var req EzpayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < int64(setting.EzpayMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", setting.EzpayMinTopUp)})
		return
	}

	id := c.GetInt("id")
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getEzpayPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	client, err := service.NewConfiguredEzpayClient()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "EZPay 配置不完整"})
		return
	}
	notifyURL, err := getEzpayNotifyURL()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}
	returnURL, err := getEzpayReturnURL()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}

	tradeNo := newEzpayTradeNo("EZP")
	topUp := &model.TopUp{
		UserId:        id,
		Amount:        normalizeEzpayTopUpAmount(req.Amount),
		Money:         payMoney,
		TradeNo:       tradeNo,
		PaymentMethod: model.PaymentMethodEzpay,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	resp, err := client.CreateTransaction(c.Request.Context(), &service.EzpayCreateTransactionRequest{
		OrderID:     tradeNo,
		Currency:    setting.EzpayDefaultCurrency,
		Token:       setting.EzpayDefaultToken,
		Network:     setting.EzpayDefaultNetwork,
		Amount:      payMoney,
		NotifyURL:   notifyURL,
		RedirectURL: returnURL,
		Name:        fmt.Sprintf("Recharge %d credits for user %d", req.Amount, user.Id),
		PaymentType: setting.EzpayDefaultPaymentType,
	})
	if err != nil {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 创建远端订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	if strings.TrimSpace(resp.PaymentURL) == "" {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 创建远端订单成功但未返回支付链接 user_id=%d trade_no=%s order_id=%s amount=%d", id, tradeNo, resp.TradeID, req.Amount))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "EZPay 未返回支付链接，请稍后重试"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 充值订单创建成功 user_id=%d trade_no=%s order_id=%s amount=%d money=%.2f", id, tradeNo, resp.TradeID, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url":   resp.PaymentURL,
			"checkout_url":  resp.PaymentURL,
			"order_id":      resp.TradeID,
			"trade_no":      tradeNo,
			"actual_amount": resp.ActualAmount,
		},
	})
}

func SubscriptionRequestEzpayPay(c *gin.Context) {
	if !isEzpayTopUpEnabled() {
		common.ApiErrorMsg(c, "EZPay 支付未启用")
		return
	}

	var req SubscriptionEzpayPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "套餐金额过低")
		return
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user == nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}

	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "已达到该套餐购买上限")
			return
		}
	}

	order := &model.SubscriptionOrder{
		UserId:        userId,
		PlanId:        plan.Id,
		Money:         plan.PriceAmount,
		TradeNo:       newEzpayTradeNo("ESU"),
		PaymentMethod: model.PaymentMethodEzpay,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}

	client, err := service.NewConfiguredEzpayClient()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, "EZPay 配置不完整")
		return
	}
	notifyURL, err := getEzpayNotifyURL()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, err.Error())
		return
	}
	returnURL, err := getEzpayReturnURL()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, err.Error())
		return
	}

	resp, err := client.CreateTransaction(c.Request.Context(), &service.EzpayCreateTransactionRequest{
		OrderID:     order.TradeNo,
		Currency:    setting.EzpayDefaultCurrency,
		Token:       setting.EzpayDefaultToken,
		Network:     setting.EzpayDefaultNetwork,
		Amount:      plan.PriceAmount,
		NotifyURL:   notifyURL,
		RedirectURL: returnURL,
		Name:        fmt.Sprintf("Subscription %s for user %d", plan.Title, user.Id),
		PaymentType: setting.EzpayDefaultPaymentType,
	})
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单创建失败 trade_no=%s plan_id=%d error=%q", order.TradeNo, plan.Id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	if strings.TrimSpace(resp.PaymentURL) == "" {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单创建成功但未返回支付链接 trade_no=%s order_id=%s plan_id=%d", order.TradeNo, resp.TradeID, plan.Id))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "EZPay 未返回支付链接，请稍后重试"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单创建成功 trade_no=%s order_id=%s plan_id=%d price=%.2f", order.TradeNo, resp.TradeID, plan.Id, plan.PriceAmount))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url":   resp.PaymentURL,
			"checkout_url":  resp.PaymentURL,
			"order_id":      resp.TradeID,
			"trade_no":      order.TradeNo,
			"actual_amount": resp.ActualAmount,
		},
	})
}

func EzpayWebhook(c *gin.Context) {
	if !isEzpayWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusForbidden, "fail")
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.String(http.StatusBadRequest, "fail")
		return
	}

	payload := string(bodyBytes)
	var event service.EzpayOrderNotifyEvent
	if err := common.Unmarshal(bodyBytes, &event); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay webhook 解析失败 path=%q client_ip=%s error=%q body=%q", c.Request.RequestURI, c.ClientIP(), err.Error(), payload))
		c.String(http.StatusBadRequest, "fail")
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay webhook 收到请求 path=%q client_ip=%s order_id=%s trade_id=%s status=%d body=%q", c.Request.RequestURI, c.ClientIP(), event.OrderID, event.TradeID, event.Status, payload))

	if strings.TrimSpace(event.PID) != strings.TrimSpace(setting.EzpayPID) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay webhook PID 不匹配 order_id=%s trade_id=%s callback_pid=%q", event.OrderID, event.TradeID, event.PID))
		c.String(http.StatusUnauthorized, "fail")
		return
	}
	if !service.VerifyEzpayWebhookSignature(&event, setting.EzpaySecretKey) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay webhook 验签失败 order_id=%s trade_id=%s client_ip=%s", event.OrderID, event.TradeID, c.ClientIP()))
		c.String(http.StatusUnauthorized, "fail")
		return
	}

	switch event.Status {
	case ezpayOrderStatusWaiting:
		c.String(http.StatusOK, "ok")
		return
	case ezpayOrderStatusSuccess:
		handleEzpayOrderCompleted(c, &event, payload)
		return
	case ezpayOrderStatusExpired:
		handleEzpayOrderExpired(c, &event)
		return
	default:
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay webhook 忽略未知状态 order_id=%s trade_id=%s status=%d", event.OrderID, event.TradeID, event.Status))
		c.String(http.StatusOK, "ok")
		return
	}
}

func handleEzpayOrderCompleted(c *gin.Context, event *service.EzpayOrderNotifyEvent, payload string) {
	tradeNo := strings.TrimSpace(event.OrderID)
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay 完成事件缺少本地订单号 trade_id=%s", event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.CompleteSubscriptionOrder(tradeNo, payload, model.PaymentMethodEzpay); err == nil {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单处理成功 trade_no=%s order_id=%s", tradeNo, event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	} else if !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单处理失败 trade_no=%s order_id=%s error=%q", tradeNo, event.TradeID, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay 完成事件未找到本地充值订单 trade_no=%s order_id=%s", tradeNo, event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}
	if topUp.PaymentMethod != model.PaymentMethodEzpay {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay 完成事件充值订单支付方式不匹配 trade_no=%s order_id=%s payment_method=%s", tradeNo, event.TradeID, topUp.PaymentMethod))
		c.String(http.StatusOK, "ok")
		return
	}
	if topUp.Status != common.TopUpStatusPending {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 完成事件充值订单状态非 pending，忽略处理 trade_no=%s order_id=%s status=%s", tradeNo, event.TradeID, topUp.Status))
		c.String(http.StatusOK, "ok")
		return
	}

	if err := model.RechargeEzpay(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 充值处理失败 trade_no=%s order_id=%s error=%q", tradeNo, event.TradeID, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 充值成功 trade_no=%s order_id=%s", tradeNo, event.TradeID))
	c.String(http.StatusOK, "ok")
}

func handleEzpayOrderExpired(c *gin.Context, event *service.EzpayOrderNotifyEvent) {
	tradeNo := strings.TrimSpace(event.OrderID)
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay 过期事件缺少本地订单号 trade_id=%s", event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	err := model.ExpireSubscriptionOrder(tradeNo, model.PaymentMethodEzpay)
	if err == nil {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单已过期 trade_no=%s order_id=%s", tradeNo, event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}
	if err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
		logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 订阅订单过期处理失败 trade_no=%s order_id=%s error=%q", tradeNo, event.TradeID, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	err = model.UpdatePendingTopUpStatus(tradeNo, model.PaymentMethodEzpay, common.TopUpStatusExpired)
	if err == nil || errors.Is(err, model.ErrTopUpStatusInvalid) {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("EZPay 充值订单已过期 trade_no=%s order_id=%s", tradeNo, event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}
	if errors.Is(err, model.ErrTopUpNotFound) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("EZPay 过期事件未找到本地订单 trade_no=%s order_id=%s", tradeNo, event.TradeID))
		c.String(http.StatusOK, "ok")
		return
	}

	logger.LogError(c.Request.Context(), fmt.Sprintf("EZPay 充值订单过期处理失败 trade_no=%s order_id=%s error=%q", tradeNo, event.TradeID, err.Error()))
	c.String(http.StatusInternalServerError, "retry")
}
