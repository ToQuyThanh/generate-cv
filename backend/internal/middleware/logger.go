// Package middleware — RequestLogger and RequestID middleware.
package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const headerRequestID = "X-Request-ID"

// RequestID injects a unique request ID into every request.
// If the client sends X-Request-ID it is reused, otherwise a new UUID is generated.
// The ID is stored in the Gin context under key "requestID" and echoed back
// in the response header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.GetHeader(headerRequestID)
		if reqID == "" {
			reqID = uuid.NewString()
		}
		c.Set("requestID", reqID)
		c.Header(headerRequestID, reqID)
		c.Next()
	}
}

// RequestLogger logs every HTTP request in a structured one-liner after the
// handler chain completes. Format:
//
//	[REQUEST] method=GET path=/api/v1/cvs status=200 latency=3.21ms ip=127.0.0.1 request_id=<uuid>
//
// It replaces gin.Logger() so the two should not be used together.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		reqID, _ := c.Get("requestID")

		gin.DefaultWriter.Write([]byte( //nolint:errcheck
			fmt.Sprintf(
				"[REQUEST] method=%s path=%s status=%d latency=%s ip=%s request_id=%s\n",
				c.Request.Method,
				c.Request.URL.Path,
				status,
				latency.String(),
				c.ClientIP(),
				requestIDStr(reqID),
			),
		))
	}
}

func requestIDStr(v any) string {
	if v == nil {
		return "-"
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}
