--
-- PostgreSQL database dump
--

\restrict J0MsgKMmh6ELQ81anMcBKtBfKVuXBWjhPF8wWabihtERuRdiLsgUKdQYDocdqyQ

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg13+2)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type AS ENUM (
    'FIXED',
    'HOURLY'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'CLIENT',
    'MAID',
    'ADMIN'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid,
    maid_id uuid,
    status public.application_status DEFAULT 'PENDING'::public.application_status NOT NULL,
    message text,
    applied_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: experience_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experience_answers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    question_id text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid,
    status public.job_status NOT NULL,
    note text,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid,
    title text NOT NULL,
    description text,
    location text,
    area_size integer,
    price numeric(10,2),
    currency text DEFAULT 'R'::text,
    date date,
    status public.job_status DEFAULT 'OPEN'::public.job_status NOT NULL,
    rooms smallint,
    bathrooms smallint,
    images text[],
    payment_type public.payment_type NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    duration numeric(5,2),
    work_dates date[],
    assigned_maid_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid,
    sender_id uuid,
    receiver_id uuid,
    content text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    message text NOT NULL,
    type text,
    read boolean DEFAULT false,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    job_id uuid,
    reviewer_id uuid,
    reviewee_id uuid,
    rating smallint,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: user_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    storage_provider text DEFAULT 'gcs'::text NOT NULL,
    bucket text NOT NULL,
    object_key text NOT NULL,
    checksum_sha256 text,
    is_public boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_user_files_status CHECK ((status = ANY (ARRAY['active'::text, 'deleted'::text, 'quarantined'::text]))),
    CONSTRAINT user_files_size_bytes_check CHECK ((size_bytes >= 0))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role public.user_role NOT NULL,
    avatar text,
    rating numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    bio text,
    location text,
    is_suspended boolean DEFAULT false,
    first_name text,
    middle_name text,
    surname text,
    date_of_birth date,
    address text,
    place_of_birth text,
    nationality text,
    residency_status text,
    languages text,
    education_level text,
    marital_status text,
    school text,
    cv_file_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    password_hash text,
    password_changed_at timestamp with time zone,
    password_reset_token_hash text,
    password_reset_expires_at timestamp with time zone,
    avatar_file_id uuid,
    cv_file_id uuid
);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: experience_answers experience_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experience_answers
    ADD CONSTRAINT experience_answers_pkey PRIMARY KEY (id);


--
-- Name: job_history job_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: experience_answers unique_user_question; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experience_answers
    ADD CONSTRAINT unique_user_question UNIQUE (user_id, question_id);


--
-- Name: user_files uq_user_files_storage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT uq_user_files_storage UNIQUE (storage_provider, bucket, object_key);


--
-- Name: user_files user_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_applications_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);


--
-- Name: idx_messages_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_job_id ON public.messages USING btree (job_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_reviews_reviewee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewee_id ON public.reviews USING btree (reviewee_id);


--
-- Name: idx_user_files_checksum; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_files_checksum ON public.user_files USING btree (checksum_sha256);


--
-- Name: idx_user_files_mime_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_files_mime_type ON public.user_files USING btree (mime_type);


--
-- Name: idx_user_files_owner_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_files_owner_created ON public.user_files USING btree (owner_user_id, created_at DESC);


--
-- Name: user_files trg_user_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_files_updated_at BEFORE UPDATE ON public.user_files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_maid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_maid_id_fkey FOREIGN KEY (maid_id) REFERENCES public.users(id);


--
-- Name: experience_answers experience_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experience_answers
    ADD CONSTRAINT experience_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users fk_users_avatar_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_avatar_file FOREIGN KEY (avatar_file_id) REFERENCES public.user_files(id) ON DELETE SET NULL;


--
-- Name: users fk_users_cv_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_cv_file FOREIGN KEY (cv_file_id) REFERENCES public.user_files(id) ON DELETE SET NULL;


--
-- Name: job_history job_history_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_history
    ADD CONSTRAINT job_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_assigned_maid_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_assigned_maid_id_fkey FOREIGN KEY (assigned_maid_id) REFERENCES public.users(id);


--
-- Name: jobs jobs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: messages messages_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict J0MsgKMmh6ELQ81anMcBKtBfKVuXBWjhPF8wWabihtERuRdiLsgUKdQYDocdqyQ

