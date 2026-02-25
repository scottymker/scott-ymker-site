-- =============================================================================
-- School Photography Platform - PostgreSQL Schema
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid() if not already available
-- (UUID generation is built-in via gen_random_uuid() in PostgreSQL 13+)


-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically sets updated_at to NOW() on any row update.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: events
-- Top-level unit representing a school photography session.
-- Example: "Lincoln Elementary Fall 2025"
-- =============================================================================

CREATE TABLE events (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)  NOT NULL,
  school      VARCHAR(255)  NOT NULL,
  date        DATE,
  status      VARCHAR(20)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'closed', 'second-sale')),
  model       VARCHAR(20)   NOT NULL DEFAULT 'prepay'
                            CHECK (model IN ('prepay', 'proof', 'hybrid')),
  settings    JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- TABLE: students
-- Individual students within an event, each identified by a unique access code.
-- =============================================================================

CREATE TABLE students (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID          REFERENCES events(id) ON DELETE CASCADE,
  code                  VARCHAR(10)   UNIQUE NOT NULL,       -- 6-char access code
  first_name            VARCHAR(100)  NOT NULL,
  last_name             VARCHAR(100)  NOT NULL,
  grade                 VARCHAR(20),
  teacher               VARCHAR(100),
  school                VARCHAR(255),
  parent_name           VARCHAR(255),
  parent_email          VARCHAR(255),
  parent_phone          VARCHAR(50),
  order_status          VARCHAR(20)   NOT NULL DEFAULT 'none'
                                      CHECK (order_status IN ('none', 'paid', 'fulfilled', 'refunded')),
  order_id              UUID,
  prepay_order_id       UUID,
  prepay_pkg            VARCHAR(10),
  prepay_addons         TEXT[],
  prepay_bg             VARCHAR(10),
  gallery_email_sent_at TIMESTAMPTZ,
  reminder_email_sent_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_students_code     ON students (code);
CREATE INDEX idx_students_event_id ON students (event_id);


-- =============================================================================
-- TABLE: images
-- Tracks uploaded images (original and watermarked preview) per student.
-- =============================================================================

CREATE TABLE images (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID          REFERENCES students(id) ON DELETE CASCADE,
  filename      VARCHAR(255)  NOT NULL,
  original_path VARCHAR(500),           -- path on filesystem
  preview_path  VARCHAR(500),           -- watermarked preview path
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_student_id ON images (student_id);


-- =============================================================================
-- TABLE: orders
-- All orders regardless of type: prepay, proof, or manual.
-- amount is stored in cents (integer) to avoid floating-point issues.
-- order_number format: SYP-YYYYMMDD-XXXXXX
-- =============================================================================

CREATE TABLE orders (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id  VARCHAR(255),
  order_number              VARCHAR(50)   UNIQUE NOT NULL,   -- e.g. SYP-20251015-A3B9C2
  status                    VARCHAR(20)   NOT NULL DEFAULT 'paid'
                                          CHECK (status IN ('paid', 'submitted_to_lab', 'fulfilled', 'refunded')),
  amount                    INTEGER       NOT NULL,           -- in cents
  parent_name               VARCHAR(255),
  parent_email              VARCHAR(255),
  parent_phone              VARCHAR(50),
  event_id                  UUID          REFERENCES events(id),
  source                    VARCHAR(20)   CHECK (source IN ('prepay', 'proof', 'manual')),
  payment_method            VARCHAR(20)   NOT NULL DEFAULT 'stripe'
                                          CHECK (payment_method IN ('stripe', 'cash', 'check')),
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fulfilled_at              TIMESTAMPTZ
);

CREATE INDEX idx_orders_event_id                   ON orders (event_id);
CREATE INDEX idx_orders_stripe_payment_intent_id   ON orders (stripe_payment_intent_id);


-- =============================================================================
-- TABLE: order_items
-- Individual line items within an order, one row per student per order.
-- Denormalizes student_code and student_name for historical record keeping
-- (in case student records change after the order is placed).
-- =============================================================================

CREATE TABLE order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          REFERENCES orders(id) ON DELETE CASCADE,
  student_id    UUID          REFERENCES students(id),
  student_code  VARCHAR(10),
  student_name  VARCHAR(255),
  package       VARCHAR(10),
  addons        TEXT[],
  background    VARCHAR(10)
);
