// Package middleware provides Gin middleware for the application.
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yourname/generate-cv/pkg/jwtutil"
)

const (
	// ContextKeyUserID is the Gin context key where the authenticated userID is stored.
	ContextKeyUserID = "userID"
)

// AuthJWT validates the Bearer token in the Authorization header.
// On success, it injects the userID (uuid.UUID) into the Gin context.
// On failure, it aborts with 401.
func AuthJWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing Authorization header"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid Authorization format, expected: Bearer <token>"})
			return
		}

		claims, err := jwtutil.Parse(secret, parts[1])
		if err != nil {
			switch err {
			case jwtutil.ErrTokenExpired:
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token expired"})
			default:
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			}
			return
		}

		c.Set(ContextKeyUserID, claims.UserID)
		c.Next()
	}
}

// GetUserID extracts the authenticated userID from the Gin context.
// Panics if the middleware was not applied — this is intentional to catch
// programmer errors at startup rather than runtime.
func GetUserID(c *gin.Context) uuid.UUID {
	val, exists := c.Get(ContextKeyUserID)
	if !exists {
		panic("GetUserID called without AuthJWT middleware")
	}
	return val.(uuid.UUID)
}
