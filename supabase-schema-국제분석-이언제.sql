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
  '$2b$10$5DDBv1wsoSchdhFs7OZF7.jUfYRFfAPsRTGpPqE3ijWAJdn1yVxn2',
  'admin'
)
ON CONFLICT (user_id) DO NOTHING;

-- RLS (Row Level Security) - anon key는 서버 API에서만 사용하므로 비활성화해도 됩니다.
-- 하지만 보안을 위해 service_role key 사용을 권장합니다.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
