-- Create app_logs table for centralized telemetry
CREATE TABLE IF NOT EXISTS public.app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  service text NOT NULL, -- 'api', 'app'
  level text NOT NULL, -- 'error', 'warn', 'info'
  message text NOT NULL,
  stack_trace text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for faster querying
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON public.app_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON public.app_logs (level);

-- Enable RLS
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert from anyone (simplified for debugging, usually restrict to authenticated)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_logs' AND policyname = 'Anyone can insert logs'
    ) THEN
        CREATE POLICY "Anyone can insert logs" ON public.app_logs FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'app_logs' AND policyname = 'Authenticated users can read all logs'
    ) THEN
        CREATE POLICY "Authenticated users can read all logs" ON public.app_logs FOR SELECT TO authenticated USING (true);
    END IF;
END
$$;
