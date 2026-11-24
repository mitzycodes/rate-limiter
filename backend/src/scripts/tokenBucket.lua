local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

if not requested or requested <= 0 then
    requested = 1
end

-- Read current tokens and last_refill from Redis Hash
local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

-- Initialize to full capacity if missing, otherwise refill based on elapsed time
if not tokens or not last_refill then
    tokens = capacity
    last_refill = now
else
    local elapsed = math.max(0, (now - last_refill) / 1000)
    tokens = math.min(capacity, tokens + (elapsed * refill_rate))
    last_refill = now
end

local allowed = 0
local retry_after = 0

-- Check if enough tokens are available
if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
    retry_after = 0
else
    allowed = 0
    if refill_rate > 0 then
        retry_after = math.max(0, (1 - tokens) / refill_rate)
    else
        retry_after = 0
    end
end

-- Save updated tokens and last_refill in the Redis Hash
redis.call('HSET', key, 'tokens', tokens, 'last_refill', last_refill)

-- Set TTL equal to math.ceil((capacity / refill_rate) * 2) seconds
if refill_rate > 0 then
    local ttl = math.ceil((capacity / refill_rate) * 2)
    redis.call('EXPIRE', key, ttl)
end

-- Return { allowed, math.floor(tokens), retry_after }
return { allowed, math.floor(tokens), retry_after }
