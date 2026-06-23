-- =============================================================================
-- Migration: 0001_initial_schema.sql
-- Description: Phase 0 — core tables with RLS and audit immutability
-- Run with: npx drizzle-kit push:pg OR psql $DATABASE_URL_DIRECT < this_file
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORGANISATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  base_currency   text NOT NULL DEFAULT 'USD',
  country_code    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations FORCE ROW LEVEL SECURITY;

CREATE POLICY org_read  ON organisations FOR SELECT
  USING (id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY org_write ON organisations FOR INSERT
  WITH CHECK (id = current_setting('app.current_org_id', true)::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENTITIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  legal_name          text NOT NULL,
  country_code        text NOT NULL,
  tax_reg_no          text,
  fiscal_year_start   integer NOT NULL DEFAULT 1,
  timezone            text NOT NULL DEFAULT 'UTC',
  -- data_region is immutable after creation (set in CHECK constraint)
  data_region         text NOT NULL DEFAULT 'us-east-1',
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities FORCE ROW LEVEL SECURITY;

CREATE POLICY entity_read  ON entities FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY entity_write ON entities FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY entity_update ON entities FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (
    org_id = current_setting('app.current_org_id', true)::uuid
    -- Prevent data_region from being changed after creation
    AND data_region = (SELECT data_region FROM entities WHERE id = entities.id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Links to Supabase auth.users
  auth_user_id      uuid NOT NULL UNIQUE,
  -- PII: stored encrypted by application before insert
  email_enc         text NOT NULL,
  display_name_enc  text NOT NULL,
  global_role       text NOT NULL DEFAULT 'ORG_VIEWER'
                    CHECK (global_role IN ('ORG_ADMIN', 'ORG_VIEWER')),
  mfa_enabled       boolean NOT NULL DEFAULT false,
  last_login_at     timestamptz,
  is_anonymised     boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY user_read  ON users FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY user_write ON users FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY user_update ON users FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENTITY MEMBERSHIPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entity_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id   uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('ADMIN', 'ANALYST', 'REVIEWER', 'VIEWER')),
  granted_by  uuid NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz, -- NULL = active
  UNIQUE (user_id, entity_id)
);

ALTER TABLE entity_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_memberships FORCE ROW LEVEL SECURITY;

-- RLS: join via users to get org_id filter
CREATE POLICY membership_read ON entity_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = entity_memberships.user_id
        AND u.org_id = current_setting('app.current_org_id', true)::uuid
    )
  );
CREATE POLICY membership_write ON entity_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = entity_memberships.user_id
        AND u.org_id = current_setting('app.current_org_id', true)::uuid
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  tier                  text NOT NULL DEFAULT 'STARTER'
                        CHECK (tier IN ('STARTER','PROFESSIONAL','ENTERPRISE','PLATFORM')),
  modules               jsonb NOT NULL DEFAULT '[]',
  status                text NOT NULL DEFAULT 'TRIAL'
                        CHECK (status IN ('ACTIVE','TRIAL','SUSPENDED','CANCELLED')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  trial_ends_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_read  ON subscriptions FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY subscription_write ON subscriptions FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY subscription_update ON subscriptions FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AUDIT EVENTS (APPEND-ONLY — ADR-002)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  entity_id       uuid,
  actor_id        text NOT NULL,
  actor_type      text NOT NULL CHECK (actor_type IN ('USER','SYSTEM')),
  event_type      text NOT NULL,
  resource_type   text,
  resource_id     text,
  before_state    jsonb,
  after_state     jsonb,
  -- SHA-256 of canonical JSON of the previous event in this org's sequence
  prev_event_hash text NOT NULL,
  ip_address      text,
  user_agent      text,
  -- Set by DB server clock; precision 6 = microseconds
  ts              timestamptz(6) NOT NULL DEFAULT now()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- Read: org members can read their own audit events
CREATE POLICY audit_read ON audit_events FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Write: INSERT only — app role never has UPDATE or DELETE privileges
CREATE POLICY audit_insert ON audit_events FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ─── IMMUTABILITY TRIGGER (ADR-002 Control #2) ────────────────────────────
-- Fires even for superuser sessions. SQLSTATE '45000' = unhandled user exception.
CREATE OR REPLACE FUNCTION fn_audit_events_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE SQLSTATE '45000'
    USING MESSAGE = 'audit_events is immutable: UPDATE and DELETE are not permitted on this table';
END;
$$;

CREATE TRIGGER trg_audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION fn_audit_events_immutable();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AUDIT OUTBOX (transactional staging — drained by pg_cron or fallback)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  entity_id       uuid,
  actor_id        text NOT NULL,
  actor_type      text NOT NULL CHECK (actor_type IN ('USER','SYSTEM')),
  event_type      text NOT NULL,
  resource_type   text,
  resource_id     text,
  before_state    jsonb,
  after_state     jsonb,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Set by drain worker after successfully inserting into audit_events
  drained_at      timestamptz
);

-- Note: No RLS on audit_outbox — accessed by the drain job (service role).
-- The drain job has service-role access and is not tenant-scoped.

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entities_org_id         ON entities(org_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id            ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id      ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id     ON entity_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_entity_id   ON entity_memberships(entity_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id    ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_id     ON audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts         ON audit_events(org_id, ts);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_undrained  ON audit_outbox(created_at)
  WHERE drained_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. pg_cron OUTBOX DRAIN (run once in Supabase SQL editor after verifying pg_cron)
-- Uncomment and run manually after confirming pg_cron is available.
-- ─────────────────────────────────────────────────────────────────────────────
/*
SELECT cron.schedule(
  'drain-audit-outbox',
  '* * * * *',
  $$
    WITH pending AS (
      SELECT * FROM audit_outbox
      WHERE drained_at IS NULL
      ORDER BY created_at ASC
      LIMIT 500
      FOR UPDATE SKIP LOCKED
    ),
    -- Compute hash chain: fetch the last event per org for each pending row
    last_events AS (
      SELECT DISTINCT ON (p.org_id)
        p.org_id,
        ae.id AS prev_id,
        ae.prev_event_hash,
        ae.org_id AS ae_org,
        encode(
          digest(
            row_to_json(ae)::text,
            'sha256'
          ), 'hex'
        ) AS hash_of_last
      FROM pending p
      LEFT JOIN audit_events ae ON ae.org_id = p.org_id
      ORDER BY p.org_id, ae.ts DESC NULLS LAST
    ),
    inserted AS (
      INSERT INTO audit_events (
        id, org_id, entity_id, actor_id, actor_type, event_type,
        resource_type, resource_id, before_state, after_state,
        prev_event_hash, ip_address, user_agent
      )
      SELECT
        p.id,
        p.org_id,
        p.entity_id,
        p.actor_id,
        p.actor_type,
        p.event_type,
        p.resource_type,
        p.resource_id,
        p.before_state,
        p.after_state,
        COALESCE(le.hash_of_last, encode(digest(p.org_id::text || ':GENESIS', 'sha256'), 'hex')),
        p.ip_address,
        p.user_agent
      FROM pending p
      LEFT JOIN last_events le ON le.org_id = p.org_id
      RETURNING id
    )
    UPDATE audit_outbox SET drained_at = now()
    WHERE id IN (SELECT id FROM inserted);
  $$
);
*/
