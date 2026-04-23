package controller

import (
	"context"
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
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

type InfiniPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

func getInfiniPayMoney(amount int64, group string) float64 {
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
		Mul(decimal.NewFromFloat(setting.InfiniUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount)).
		InexactFloat64()
}

func normalizeInfiniTopUpAmount(amount int64) int64 {
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

func formatInfiniAmount(amount float64) string {
	value := decimal.NewFromFloat(amount).StringFixedBank(6)
	value = strings.TrimRight(value, "0")
	value = strings.TrimRight(value, ".")
	if value == "" {
		return "0"
	}
	return value
}

func resolveInfiniRedirectURL(rawURL string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL != "" {
		parsedURL, err := url.Parse(rawURL)
		if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
			return "", errors.New("Infini 跳转地址配置错误")
		}
		return rawURL, nil
	}

	serverAddress := strings.TrimRight(strings.TrimSpace(system_setting.ServerAddress), "/")
	if serverAddress == "" {
		return "", errors.New("请先配置服务器地址或 Infini 自定义跳转地址")
	}
	return serverAddress + "/console/topup?show_history=true", nil
}

func getInfiniReturnURL() (string, error) {
	return resolveInfiniRedirectURL(setting.InfiniSuccessURL)
}

func getInfiniFailureURL() (string, error) {
	return resolveInfiniRedirectURL(setting.InfiniFailureURL)
}

func resolveInfiniPayMethodConfig(paymentMethod string) (*setting.InfiniPayMethod, error) {
	methods := setting.GetInfiniPayMethods()
	if paymentMethod == "" {
		paymentMethod = model.PaymentMethodInfini
	}
	for _, method := range methods {
		if method.Type == paymentMethod {
			cp := method
			return &cp, nil
		}
	}
	return nil, errors.New("不支持的 Infini 支付方式")
}

func sanitizeInfiniPayMethods(methods []int) []int {
	if len(methods) == 0 {
		return []int{1, 2}
	}
	result := make([]int, 0, len(methods))
	seen := make(map[int]struct{}, len(methods))
	for _, method := range methods {
		if method != 1 && method != 2 {
			continue
		}
		if _, ok := seen[method]; ok {
			continue
		}
		seen[method] = struct{}{}
		result = append(result, method)
	}
	if len(result) == 0 {
		return []int{1, 2}
	}
	return result
}

func RequestInfiniAmount(c *gin.Context) {
	var req InfiniPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < int64(setting.InfiniMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", setting.InfiniMinTopUp)})
		return
	}
	if _, err := resolveInfiniPayMethodConfig(req.PaymentMethod); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getInfiniPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func RequestInfiniPay(c *gin.Context) {
	if !isInfiniTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Infini 支付未启用"})
		return
	}

	var req InfiniPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < int64(setting.InfiniMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", setting.InfiniMinTopUp)})
		return
	}

	payMethod, err := resolveInfiniPayMethodConfig(req.PaymentMethod)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
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
	payMoney := getInfiniPayMoney(req.Amount, group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	client, err := service.NewConfiguredInfiniClient()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Infini 配置不完整"})
		return
	}
	successURL, err := getInfiniReturnURL()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}
	failureURL, err := getInfiniFailureURL()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}

	tradeNo := fmt.Sprintf("INFINI-%d-%d-%s", id, time.Now().UnixMilli(), randstr.String(6))
	topUp := &model.TopUp{
		UserId:        id,
		Amount:        normalizeInfiniTopUpAmount(req.Amount),
		Money:         payMoney,
		TradeNo:       tradeNo,
		PaymentMethod: model.PaymentMethodInfini,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	createReq := &service.InfiniCreateOrderRequest{
		Amount:          formatInfiniAmount(payMoney),
		RequestID:       uuid.NewString(),
		ClientReference: tradeNo,
		OrderDesc:       fmt.Sprintf("Recharge %d credits for user %d", req.Amount, user.Id),
		MerchantAlias:   strings.TrimSpace(setting.InfiniMerchantAlias),
		SuccessURL:      successURL,
		FailureURL:      failureURL,
		PayMethods:      sanitizeInfiniPayMethods(payMethod.PayMethods),
	}
	if setting.InfiniOrderTTLSeconds > 0 {
		createReq.ExpiresIn = setting.InfiniOrderTTLSeconds
	}

	resp, err := client.CreateOrder(c.Request.Context(), createReq)
	if err != nil {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 创建远端订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 充值订单创建成功 user_id=%d trade_no=%s order_id=%s request_id=%s amount=%d money=%.2f pay_method=%s", id, tradeNo, resp.OrderID, resp.RequestID, req.Amount, payMoney, payMethod.Type))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"checkout_url": resp.CheckoutURL,
			"order_id":     resp.OrderID,
			"trade_no":     tradeNo,
		},
	})
}

func InfiniWebhook(c *gin.Context) {
	if !isInfiniWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.String(http.StatusForbidden, "webhook disabled")
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.String(http.StatusBadRequest, "bad request")
		return
	}

	payload := string(bodyBytes)
	signature := c.GetHeader("X-Webhook-Signature")
	timestamp := c.GetHeader("X-Webhook-Timestamp")
	eventID := c.GetHeader("X-Webhook-Event-Id")
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini webhook 收到请求 path=%q client_ip=%s event_id=%q signature=%q body=%q", c.Request.RequestURI, c.ClientIP(), eventID, signature, payload))

	if !service.VerifyInfiniWebhookSignature(payload, timestamp, eventID, signature, setting.InfiniWebhookSecret) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini webhook 验签失败 path=%q client_ip=%s event_id=%q", c.Request.RequestURI, c.ClientIP(), eventID))
		c.String(http.StatusUnauthorized, "invalid signature")
		return
	}

	var event service.InfiniWebhookOrderEvent
	if err := common.Unmarshal(bodyBytes, &event); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini webhook 解析失败 path=%q client_ip=%s event_id=%q error=%q body=%q", c.Request.RequestURI, c.ClientIP(), eventID, err.Error(), payload))
		c.String(http.StatusBadRequest, "bad payload")
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini webhook 验签成功 event=%s order_id=%s client_reference=%s status=%s event_id=%s", event.Event, event.OrderID, event.ClientReference, event.Status, eventID))

	switch event.Event {
	case "order.create", "order.created", "order.processing":
		c.String(http.StatusOK, "OK")
		return
	case "order.expired":
		handleInfiniOrderExpired(c, &event)
		return
	case "order.completed", "order.late_payment":
		handleInfiniOrderCompleted(c, &event, payload)
		return
	default:
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini webhook 忽略事件 event=%s order_id=%s client_reference=%s", event.Event, event.OrderID, event.ClientReference))
		c.String(http.StatusOK, "OK")
		return
	}
}

func resolveInfiniTradeNo(ctx context.Context, event *service.InfiniWebhookOrderEvent) (string, error) {
	if event == nil {
		return "", errors.New("empty event")
	}
	if strings.TrimSpace(event.ClientReference) != "" {
		return strings.TrimSpace(event.ClientReference), nil
	}
	if strings.TrimSpace(event.OrderID) == "" {
		return "", errors.New("missing order_id")
	}

	client, err := service.NewConfiguredInfiniClient()
	if err != nil {
		return "", err
	}
	order, err := client.QueryOrder(ctx, event.OrderID)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(order.ClientReference) == "" {
		return "", errors.New("missing client_reference")
	}
	return strings.TrimSpace(order.ClientReference), nil
}

func infiniOrderFullyPaid(event *service.InfiniWebhookOrderEvent) bool {
	if event == nil {
		return false
	}
	if event.Event == "order.completed" {
		return true
	}
	amount, err := service.ParseInfiniAmount(event.Amount)
	if err != nil {
		return false
	}
	confirmed, err := service.ParseInfiniAmount(event.AmountConfirmed)
	if err != nil {
		return false
	}
	return confirmed.GreaterThanOrEqual(amount)
}

func handleInfiniOrderCompleted(c *gin.Context, event *service.InfiniWebhookOrderEvent, payload string) {
	if !infiniOrderFullyPaid(event) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 完成事件未足额支付，忽略处理 event=%s order_id=%s client_reference=%s amount=%s confirmed=%s", event.Event, event.OrderID, event.ClientReference, event.Amount, event.AmountConfirmed))
		c.String(http.StatusOK, "OK")
		return
	}

	tradeNo, err := resolveInfiniTradeNo(c.Request.Context(), event)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 完成事件订单映射失败 event=%s order_id=%s client_reference=%s error=%q", event.Event, event.OrderID, event.ClientReference, err.Error()))
		c.String(http.StatusOK, "OK")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.CompleteSubscriptionOrder(tradeNo, payload, model.PaymentMethodInfini); err == nil {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 订阅订单处理成功 trade_no=%s order_id=%s event=%s", tradeNo, event.OrderID, event.Event))
		c.String(http.StatusOK, "OK")
		return
	} else if !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 订阅订单处理失败 trade_no=%s order_id=%s event=%s error=%q", tradeNo, event.OrderID, event.Event, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 完成事件未找到本地充值订单 trade_no=%s order_id=%s event=%s", tradeNo, event.OrderID, event.Event))
		c.String(http.StatusOK, "OK")
		return
	}
	if topUp.PaymentMethod != model.PaymentMethodInfini {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 完成事件充值订单支付方式不匹配 trade_no=%s order_id=%s event=%s payment_method=%s", tradeNo, event.OrderID, event.Event, topUp.PaymentMethod))
		c.String(http.StatusOK, "OK")
		return
	}
	if topUp.Status != common.TopUpStatusPending {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 完成事件充值订单状态非 pending，忽略处理 trade_no=%s order_id=%s event=%s status=%s", tradeNo, event.OrderID, event.Event, topUp.Status))
		c.String(http.StatusOK, "OK")
		return
	}

	if err := model.RechargeInfini(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 充值处理失败 trade_no=%s order_id=%s event=%s error=%q", tradeNo, event.OrderID, event.Event, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 充值成功 trade_no=%s order_id=%s event=%s", tradeNo, event.OrderID, event.Event))
	c.String(http.StatusOK, "OK")
}

func handleInfiniOrderExpired(c *gin.Context, event *service.InfiniWebhookOrderEvent) {
	tradeNo, err := resolveInfiniTradeNo(c.Request.Context(), event)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 过期事件订单映射失败 order_id=%s client_reference=%s error=%q", event.OrderID, event.ClientReference, err.Error()))
		c.String(http.StatusOK, "OK")
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	err = model.ExpireSubscriptionOrder(tradeNo, model.PaymentMethodInfini)
	if err == nil {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 订阅订单已过期 trade_no=%s order_id=%s status=%s", tradeNo, event.OrderID, event.Status))
		c.String(http.StatusOK, "OK")
		return
	}
	if err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 订阅订单过期处理失败 trade_no=%s order_id=%s status=%s error=%q", tradeNo, event.OrderID, event.Status, err.Error()))
		c.String(http.StatusInternalServerError, "retry")
		return
	}

	err = model.UpdatePendingTopUpStatus(tradeNo, model.PaymentMethodInfini, common.TopUpStatusExpired)
	if err == nil || errors.Is(err, model.ErrTopUpStatusInvalid) {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 充值订单已过期 trade_no=%s order_id=%s status=%s", tradeNo, event.OrderID, event.Status))
		c.String(http.StatusOK, "OK")
		return
	}
	if errors.Is(err, model.ErrTopUpNotFound) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Infini 过期事件未找到本地订单 trade_no=%s order_id=%s", tradeNo, event.OrderID))
		c.String(http.StatusOK, "OK")
		return
	}

	logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 充值订单过期处理失败 trade_no=%s order_id=%s status=%s error=%q", tradeNo, event.OrderID, event.Status, err.Error()))
	c.String(http.StatusInternalServerError, "retry")
}
