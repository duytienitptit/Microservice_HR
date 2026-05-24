-- Create ai_db for AI Service (core_db is created automatically by POSTGRES_DB env var)
SELECT 'CREATE DATABASE ai_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_db')\gexec
