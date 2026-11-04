ALTER TABLE app.labels DROP CONSTRAINT labels_kind_check;
ALTER TABLE app.labels ADD CONSTRAINT labels_kind_check CHECK(kind IN ('tag','category','toy','emotion','setting'));
ALTER TABLE app.ai_settings ADD COLUMN ollama_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434';
ALTER TABLE app.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_provider_check;
ALTER TABLE app.ai_settings ADD CONSTRAINT ai_settings_provider_check CHECK(provider IN ('openai','openrouter','ollama'));
ALTER TABLE app.ai_turns DROP CONSTRAINT IF EXISTS ai_turns_provider_check;
ALTER TABLE app.ai_turns ADD CONSTRAINT ai_turns_provider_check CHECK(provider IN ('openai','openrouter','ollama'));
