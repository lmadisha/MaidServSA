-- If you want UUIDs generated in Postgres
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- If your users table uses UUID, keep this uuid.
  -- If your user IDs are TEXT, change this to TEXT.
  owner_user_id   uuid NOT NULL,

  -- What the user uploaded
  original_name   text NOT NULL,
  mime_type       text NOT NULL,                 -- e.g. application/pdf, image/png
  size_bytes      bigint NOT NULL CHECK (size_bytes >= 0),

  -- Where the file is stored (GCS/S3/local)
  storage_provider text NOT NULL DEFAULT 'gcs',  -- 'gcs' | 's3' | 'local'
  bucket          text NOT NULL,                 -- bucket name (or 'local')
  object_key      text NOT NULL,                 -- path/key in bucket (or file path)

  -- Optional but super useful
  checksum_sha256 text,                          -- for integrity/dedup
  is_public       boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active', -- 'active' | 'deleted' | 'quarantined'

  -- Extra metadata (width/height, page_count, etc.)
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate pointers to the same stored object
  CONSTRAINT uq_user_files_storage UNIQUE (storage_provider, bucket, object_key),

  -- Basic sanity check
  CONSTRAINT chk_user_files_status CHECK (status IN ('active', 'deleted', 'quarantined'))
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_files_owner_created
  ON user_files (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_files_mime_type
  ON user_files (mime_type);

CREATE INDEX IF NOT EXISTS idx_user_files_checksum
  ON user_files (checksum_sha256);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_files_updated_at ON user_files;

CREATE TRIGGER trg_user_files_updated_at
BEFORE UPDATE ON user_files
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
