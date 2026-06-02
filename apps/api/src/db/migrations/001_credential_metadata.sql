CREATE TABLE credential_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(user_id, key_name)
);

CREATE INDEX idx_credential_metadata_user_id ON credential_metadata(user_id);