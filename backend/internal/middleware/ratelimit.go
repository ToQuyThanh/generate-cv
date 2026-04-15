// Package middleware — Redis sliding-window rate limiter.
package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimit returns a middleware that limits requests per authenticated userID
// using a Redis sliding-window algorithm.
//
//   - maxReq: maximum number of requests allowed within the window
//   - window: duration of the sliding window (e.g. time.Minute)
//
// The middleware must be placed AFTER AuthJWT so that GetUserID works.
// On Redis failure it fails open (lets the request through) to avoid
// cascading Redis downtime into API downtime.
func RateLimit(rdb *redis.Client, maxReq int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)
		key := fmt.Sprintf("rl:user:%s", userID.String())

		now := time.Now()
		windowStart := now.Add(-window).UnixMilli()
		nowMs := now.UnixMilli()
		member := strconv.FormatInt(nowMs, 10)

		ctx := c.Request.Context()

		// Sliding-window with sorted set:
		//   1. Remove members older than window start
		//   2. Count remaining members
		//   3. If under limit → add current timestamp + set TTL
		pipe := rdb.TxPipeline()
		pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))
		countCmd := pipe.ZCard(ctx, key)
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(nowMs), Member: member})
		pipe.Expire(ctx, key, window+time.Second)

		if _, err := pipe.Exec(ctx); err != nil {
			// Fail open — Redis error should not block users
			c.Next()
			return
		}

		count := countCmd.Val()
		if count >= int64(maxReq) {
			c.Header("X-RateLimit-Limit", strconv.Itoa(maxReq))
			c.Header("X-RateLimit-Remaining", "0")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": fmt.Sprintf("rate limit exceeded: max %d requests per %s", maxReq, window),
			})
			return
		}

		remaining := int64(maxReq) - count - 1
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(maxReq))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))

		c.Next()
	}
}
