package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SubscriptionReader is the interface needed to check subscription status
type SubscriptionReader interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*SubscriptionInfo, error)
}

// SubscriptionInfo holds subscription details
type SubscriptionInfo struct {
	Plan   string
	Status string
	ExpiresAt *time.Time
}

// RequireSubscription returns a middleware that checks if the user has an active paid subscription
// It must be placed AFTER AuthJWT middleware
func RequireSubscription(repo SubscriptionReader) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(ContextKeyUserID)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			})
			return
		}

		userID := userIDVal.(uuid.UUID)

		sub, err := repo.GetByUserID(c.Request.Context(), userID)
		if err != nil {
			if err == pgx.ErrNoRows {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"code":    "SUBSCRIPTION_REQUIRED",
					"message": "Active subscription required. Please upgrade to Weekly or Monthly plan.",
				})
				return
			}
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to check subscription",
			})
			return
		}

		// Check if subscription is active and paid
		if !isActivePaidSubscription(sub) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"code":    "SUBSCRIPTION_REQUIRED",
				"message": "Active subscription required. Please upgrade to Weekly or Monthly plan.",
			})
			return
		}

		c.Next()
	}
}

// isActivePaidSubscription checks if the subscription is active and not free
func isActivePaidSubscription(sub *SubscriptionInfo) bool {
	// Must be non-free plan (weekly or monthly)
	if sub.Plan == "free" || sub.Plan == "" {
		return false
	}

	// Must be active status
	if sub.Status != "active" {
		return false
	}

	// Must not be expired
	if sub.ExpiresAt != nil && time.Now().After(*sub.ExpiresAt) {
		return false
	}

	return true
}

// SubscriptionRepository implements SubscriptionReader
type SubscriptionRepository struct {
	pool *pgxpool.Pool
}

// NewSubscriptionRepository creates a new SubscriptionRepository
func NewSubscriptionRepository(pool *pgxpool.Pool) *SubscriptionRepository {
	return &SubscriptionRepository{pool: pool}
}

// GetByUserID retrieves subscription info for a user
func (r *SubscriptionRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*SubscriptionInfo, error) {
	var sub SubscriptionInfo
	var expiresAt *time.Time

	err := r.pool.QueryRow(ctx,
		`SELECT plan, status, expires_at 
		 FROM subscriptions 
		 WHERE user_id = $1 
		 LIMIT 1`,
		userID,
	).Scan(&sub.Plan, &sub.Status, &expiresAt)

	if err != nil {
		return nil, err
	}

	sub.ExpiresAt = expiresAt
	return &sub, nil
}
