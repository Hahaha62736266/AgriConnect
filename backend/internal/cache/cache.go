package cache

import (
	"strings"
	"sync"
	"time"
)

type item struct {
	value     any
	expiresAt time.Time
}

// Cache is a concurrent, in-memory key-value cache with TTL expiration.
type Cache struct {
	mu         sync.RWMutex
	items      map[string]item
	defaultTTL time.Duration
	stopCh     chan struct{}
}

// New creates and starts an in-memory cache with background eviction.
func New(defaultTTL time.Duration, cleanupInterval time.Duration) *Cache {
	c := &Cache{
		items:      make(map[string]item),
		defaultTTL: defaultTTL,
		stopCh:     make(chan struct{}),
	}

	if cleanupInterval > 0 {
		go c.startCleanup(cleanupInterval)
	}

	return c
}

// Get retrieves an item by key if present and not expired.
func (c *Cache) Get(key string) (any, bool) {
	c.mu.RLock()
	it, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		return nil, false
	}

	if time.Now().After(it.expiresAt) {
		c.Delete(key)
		return nil, false
	}

	return it.value, true
}

// Set stores a value with a specific TTL. If ttl <= 0, defaultTTL is used.
func (c *Cache) Set(key string, val any, ttl time.Duration) {
	if ttl <= 0 {
		ttl = c.defaultTTL
	}

	c.mu.Lock()
	c.items[key] = item{
		value:     val,
		expiresAt: time.Now().Add(ttl),
	}
	c.mu.Unlock()
}

// Delete removes a specific key.
func (c *Cache) Delete(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

// DeletePrefix removes all entries whose keys start with prefix.
func (c *Cache) DeletePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.items {
		if strings.HasPrefix(k, prefix) {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()
}

// Clear removes all items from the cache.
func (c *Cache) Clear() {
	c.mu.Lock()
	c.items = make(map[string]item)
	c.mu.Unlock()
}

// Stop terminates the background cleanup goroutine.
func (c *Cache) Stop() {
	c.mu.Lock()
	defer c.mu.Unlock()
	select {
	case <-c.stopCh:
	default:
		close(c.stopCh)
	}
}

func (c *Cache) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.mu.Lock()
			now := time.Now()
			for k, it := range c.items {
				if now.After(it.expiresAt) {
					delete(c.items, k)
				}
			}
			c.mu.Unlock()
		case <-c.stopCh:
			return
		}
	}
}
