-- Mirror copy of supabase/migrations/20261004000001_initial_schema.sql for apps/api
-- See supabase/migrations/20261004000001_initial_schema.sql for canonical migration file.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    experience_level TEXT CHECK (experience_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')) DEFAULT 'BEGINNER' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, experience_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'BEGINNER'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.diagnostic_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_board TEXT NOT NULL,
    symptom_description TEXT NOT NULL,
    status TEXT CHECK (status IN ('INTAKE', 'ACTIVE', 'RESOLVED', 'ABORTED')) DEFAULT 'ACTIVE' NOT NULL,
    image_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_cases_user_id ON public.diagnostic_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_cases_status ON public.diagnostic_cases(status);

CREATE TABLE IF NOT EXISTS public.case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.diagnostic_cases(id) ON DELETE CASCADE,
    sender TEXT CHECK (sender IN ('USER', 'ASSISTANT', 'SYSTEM')) NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON public.case_messages(case_id);

CREATE TABLE IF NOT EXISTS public.diagnostic_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.diagnostic_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    epistemic_status TEXT CHECK (epistemic_status IN ('VERIFIED_FACT', 'AI_INFERENCE', 'UNKNOWN')) NOT NULL,
    confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    explanation TEXT NOT NULL,
    eliminated BOOLEAN DEFAULT FALSE NOT NULL,
    elimination_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_hypotheses_case_id ON public.diagnostic_hypotheses(case_id);

CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.diagnostic_cases(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    measurement_type TEXT CHECK (measurement_type IN ('VOLTAGE_DC', 'RESISTANCE_OHMS', 'CONTINUITY')) NOT NULL,
    numeric_value NUMERIC(8,3),
    unit TEXT NOT NULL,
    probe_positive TEXT NOT NULL,
    probe_negative TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurements_case_id ON public.measurements(case_id);

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id TEXT PRIMARY KEY,
    component_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('MICROCONTROLLER', 'SENSOR', 'ACTUATOR', 'PASSIVE', 'SEMICONDUCTOR')) NOT NULL,
    operating_voltage_min NUMERIC(4,2),
    operating_voltage_max NUMERIC(4,2),
    max_pin_current_ma NUMERIC(5,2),
    pinout_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    known_pitfalls JSONB DEFAULT '[]'::jsonb NOT NULL,
    source_document TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_category ON public.knowledge_sources(category);

CREATE TABLE IF NOT EXISTS public.diagnostic_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.diagnostic_cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    usefulness_rating INTEGER CHECK (usefulness_rating BETWEEN 1 AND 5) NOT NULL,
    fault_resolved BOOLEAN NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_feedback_case_id ON public.diagnostic_feedback(case_id);

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_feedback ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Diagnostic Cases Policies
CREATE POLICY "Users can view their own diagnostic cases"
    ON public.diagnostic_cases FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diagnostic cases"
    ON public.diagnostic_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagnostic cases"
    ON public.diagnostic_cases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagnostic cases"
    ON public.diagnostic_cases FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Case Messages Policies
CREATE POLICY "Users can view messages for their own cases"
    ON public.case_messages FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = case_messages.case_id AND diagnostic_cases.user_id = auth.uid()));

CREATE POLICY "Users can insert messages into their own cases"
    ON public.case_messages FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = case_messages.case_id AND diagnostic_cases.user_id = auth.uid()));

-- Diagnostic Hypotheses Policies
CREATE POLICY "Users can view hypotheses for their own cases"
    ON public.diagnostic_hypotheses FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = diagnostic_hypotheses.case_id AND diagnostic_cases.user_id = auth.uid()));

CREATE POLICY "Users can insert or update hypotheses for their own cases"
    ON public.diagnostic_hypotheses FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = diagnostic_hypotheses.case_id AND diagnostic_cases.user_id = auth.uid()));

-- Measurements Policies
CREATE POLICY "Users can view measurements for their own cases"
    ON public.measurements FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = measurements.case_id AND diagnostic_cases.user_id = auth.uid()));

CREATE POLICY "Users can insert measurements into their own cases"
    ON public.measurements FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = measurements.case_id AND diagnostic_cases.user_id = auth.uid()));

-- Knowledge Sources Policies
CREATE POLICY "Knowledge sources are readable by all users"
    ON public.knowledge_sources FOR SELECT TO public USING (true);

-- Diagnostic Feedback Policies
CREATE POLICY "Users can view their submitted feedback"
    ON public.diagnostic_feedback FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = diagnostic_feedback.case_id AND diagnostic_cases.user_id = auth.uid()));

CREATE POLICY "Users can submit feedback for their cases"
    ON public.diagnostic_feedback FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.diagnostic_cases WHERE diagnostic_cases.id = diagnostic_feedback.case_id AND diagnostic_cases.user_id = auth.uid()));
