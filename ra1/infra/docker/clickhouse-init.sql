CREATE DATABASE ra1_analytics;

CREATE TABLE usage_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID,
    payload String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (created_at, id)
TTL created_at = addYears(created_at, 2);

CREATE TABLE IF NOT EXISTS ra1_analytics.credential_access_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime DEFAULT now(),
    user_id UUID,
    key_name String,
    success UInt8,
    error_code Nullable(String)
)
ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 2 YEAR;

GRANT ALL PRIVILEGES ON DATABASE ra1_analytics TO DEFAULT;
