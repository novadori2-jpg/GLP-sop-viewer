-- Supabase에서 실행할 SQL
-- Table Editor > SQL Editor에 붙여넣고 실행

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 admin 계정 삽입 (비밀번호: admin1234)
INSERT INTO users (user_id, name, password_hash, role)
VALUES (
  'admin',
  '관리자',
  '$2b$10$K2CtDP7zSGOKgjXjFT0.BuXuBZzh3B5qKh5b1kMniGnkqg9mhxMHi',
  'admin'
)
ON CONFLICT (user_id) DO NOTHING;

-- RLS (Row Level Security) - anon key는 서버 API에서만 사용하므로 비활성화해도 됩니다.
-- 하지만 보안을 위해 service_role key 사용을 권장합니다.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ─── 바인더 테이블 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS binders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_number TEXT UNIQUE NOT NULL,   -- e.g. "F26001" or "QA F26001"
  binder_type TEXT NOT NULL,           -- "study" | "qa"
  study_type TEXT,                     -- "F" | "D" | "A" (시험바인더만)
  qa_target_study_number TEXT,         -- QA 바인더: 대상 시험번호
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing', -- "ongoing"|"sd_binder_signed"|"submitted_for_qa"|"complete"
  start_date TEXT NOT NULL,
  end_date TEXT,
  sd_id TEXT,
  director_name TEXT,
  investigator_ids JSONB DEFAULT '[]',
  investigator_names JSONB DEFAULT '[]',
  archivist_id TEXT,
  archivist_name TEXT,
  qap_id TEXT,
  qa_name TEXT,
  tfm_id TEXT,
  tfm_name TEXT,
  required_forms JSONB DEFAULT '[]',   -- BinderForm[] JSON
  sd_binder_signature JSONB,
  tfm_signature JSONB,
  qa_statement_signature TEXT,
  qa_statement_date TEXT,
  qa_statement_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
