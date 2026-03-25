--
-- PostgreSQL database dump
--

\restrict Dhep2MM3H44HlSbyA1siWEfuqbQvhLekFUomwQQZ9hxH1xuq0V8UYFlgQngUsq6

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ensure_profile_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_profile_role() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  required_role TEXT := TG_ARGV[0];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
      AND r.code = required_role
  ) THEN
    RAISE EXCEPTION 'User % must have role % before creating profile', NEW.user_id, required_role;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ensure_profile_role() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: class_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    section_code character varying(50) NOT NULL,
    semester character varying(20) NOT NULL,
    academic_year character varying(20) NOT NULL,
    section_name character varying(255),
    starts_at date,
    ends_at date,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_class_sections_dates CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (starts_at <= ends_at))),
    CONSTRAINT ck_class_sections_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.class_sections OWNER TO postgres;

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_section_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status character varying(20) DEFAULT 'enrolled'::character varying NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    dropped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_enrollments_status CHECK (((status)::text = ANY ((ARRAY['enrolled'::character varying, 'dropped'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.enrollments OWNER TO postgres;

--
-- Name: import_batch_errors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batch_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw_payload jsonb,
    error_message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_import_batch_errors_row_number CHECK ((row_number > 0))
);


ALTER TABLE public.import_batch_errors OWNER TO postgres;

--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    success_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_import_batches_failed_rows CHECK ((failed_rows >= 0)),
    CONSTRAINT ck_import_batches_row_sum CHECK (((success_rows + failed_rows) <= total_rows)),
    CONSTRAINT ck_import_batches_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT ck_import_batches_success_rows CHECK ((success_rows >= 0)),
    CONSTRAINT ck_import_batches_time_range CHECK (((finished_at IS NULL) OR (started_at IS NULL) OR (finished_at >= started_at))),
    CONSTRAINT ck_import_batches_total_rows CHECK ((total_rows >= 0))
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_code character varying(50) NOT NULL,
    major character varying(255),
    cohort_year integer,
    class_name character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_student_profiles_cohort_year CHECK (((cohort_year IS NULL) OR (cohort_year > 0)))
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    credits integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_subjects_credits CHECK (((credits IS NULL) OR (credits >= 0)))
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: teacher_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    teacher_code character varying(50) NOT NULL,
    department character varying(255),
    title character varying(100),
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teacher_profiles OWNER TO postgres;

--
-- Name: teaching_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teaching_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_section_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.teaching_assignments OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    google_sub character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    avatar_url text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_users_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: class_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_sections (id, subject_id, section_code, semester, academic_year, section_name, starts_at, ends_at, status, created_at, updated_at) FROM stdin;
408e4453-f9dc-4381-a26d-0ab1f482c2c8	af1d5595-d65e-4ea9-a724-24fcca2e7b9f	01	HK2	2025-2026	SE101 - Lop 01	2026-02-01	2026-05-30	active	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
74cf0da2-e1d5-4b29-879e-d5434e96d312	399ee043-b750-4f17-862f-e9b3e67e5070	01	HK2	2025-2026	DB201 - Lop 01	2026-02-10	2026-05-28	active	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enrollments (id, class_section_id, student_id, status, enrolled_at, dropped_at, created_at, updated_at) FROM stdin;
ea5077ee-dd3f-4174-af94-9abe58cb8a11	408e4453-f9dc-4381-a26d-0ab1f482c2c8	7a77d9cb-00c3-466c-9a53-67aa97bbae13	enrolled	2026-03-25 16:37:45.223426+00	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
c451aa58-98a4-4bb1-8694-c356c68f7949	408e4453-f9dc-4381-a26d-0ab1f482c2c8	28ba62db-628a-4d46-8154-e06535ccdffc	enrolled	2026-03-25 16:37:45.223426+00	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
40ed0fae-6289-41ef-ae57-7b4ac384f4c5	74cf0da2-e1d5-4b29-879e-d5434e96d312	28ba62db-628a-4d46-8154-e06535ccdffc	enrolled	2026-03-25 16:37:45.223426+00	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
0e05556a-0dd1-489b-94e0-a484dad3e956	74cf0da2-e1d5-4b29-879e-d5434e96d312	3cae5fcb-c953-47e9-b3aa-bd4dfeb5fbf7	enrolled	2026-03-25 16:37:45.223426+00	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: import_batch_errors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batch_errors (id, batch_id, row_number, raw_payload, error_message, created_at) FROM stdin;
07a6e7a7-e26f-4589-9764-103265502aac	c85f1aea-1480-4ce5-868b-676c833449de	4	{"email": "invalid@course.local", "student_code": "SV999"}	Student code does not exist in uploaded user list	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: import_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batches (id, entity_type, file_name, uploaded_by_user_id, status, total_rows, success_rows, failed_rows, started_at, finished_at, created_at, updated_at) FROM stdin;
afbca25a-c921-4645-b784-59e20b55de59	subjects	subjects_import.xlsx	67cd5c89-9913-4550-bf35-7cc90fa61803	completed	2	2	0	2026-03-25 16:29:45.223426+00	2026-03-25 16:30:45.223426+00	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
c85f1aea-1480-4ce5-868b-676c833449de	students	students_import.xlsx	67cd5c89-9913-4550-bf35-7cc90fa61803	completed	3	3	0	2026-03-25 16:27:45.223426+00	2026-03-25 16:28:45.223426+00	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, name, description, created_at, updated_at) FROM stdin;
56a4b7f3-966e-4b80-9ec6-9f4f99611554	admin	Administrator	System administrator	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
3a06ca01-5cd1-4fbe-b66f-d9240d1e236a	teacher	Teacher	Lecturer/teacher role	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
2337727d-d0a1-416b-9c21-5e037d9e5063	student	Student	Student role	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_profiles (id, user_id, student_code, major, cohort_year, class_name, created_at, updated_at) FROM stdin;
7a77d9cb-00c3-466c-9a53-67aa97bbae13	c83ebf08-d68a-4dbb-9242-531a906d0356	SV001	Software Engineering	2023	SE23A	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
28ba62db-628a-4d46-8154-e06535ccdffc	19b7d198-d1d8-4b58-ae20-58f078a7600f	SV002	Software Engineering	2023	SE23A	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
3cae5fcb-c953-47e9-b3aa-bd4dfeb5fbf7	524a6f80-4c61-4ba2-85a3-8d5da21f0b3b	SV003	Information Systems	2022	IS22B	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, code, name, description, credits, is_active, created_at, updated_at) FROM stdin;
af1d5595-d65e-4ea9-a724-24fcca2e7b9f	SE101	Software Engineering	Introduction to software engineering	3	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
399ee043-b750-4f17-862f-e9b3e67e5070	DB201	Database Systems	Relational database fundamentals	3	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: teacher_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher_profiles (id, user_id, teacher_code, department, title, bio, created_at, updated_at) FROM stdin;
f9e47afa-0ef3-4b9d-90d9-bca0999ba09a	eaf9c839-e2f4-40f5-8b0b-41b25d170dfe	GV001	Computer Science	Lecturer	Main lecturer of SE101	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
d8f8b09e-1d1e-47f0-bb18-9c78e55ffefa	58e4e939-0913-48bd-a644-1a7dcfb9a172	GV002	Information Systems	Lecturer	Main lecturer of DB201	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: teaching_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teaching_assignments (id, class_section_id, teacher_id, assigned_at, created_at, updated_at) FROM stdin;
23eb3742-4f5f-4c7d-a921-47897c7b9d3b	408e4453-f9dc-4381-a26d-0ab1f482c2c8	f9e47afa-0ef3-4b9d-90d9-bca0999ba09a	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
e6eaed86-abfe-444d-b984-a699dbc49898	74cf0da2-e1d5-4b29-879e-d5434e96d312	d8f8b09e-1d1e-47f0-bb18-9c78e55ffefa	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role_id, is_primary, created_at, updated_at) FROM stdin;
4bf3cdba-c9fb-4f69-9829-23b46bfa6533	67cd5c89-9913-4550-bf35-7cc90fa61803	56a4b7f3-966e-4b80-9ec6-9f4f99611554	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
86d2eadc-3afd-4113-bf79-5ea1c2b77e4a	eaf9c839-e2f4-40f5-8b0b-41b25d170dfe	3a06ca01-5cd1-4fbe-b66f-d9240d1e236a	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
19a26bd0-0662-4613-ab75-fc6acc863e58	58e4e939-0913-48bd-a644-1a7dcfb9a172	3a06ca01-5cd1-4fbe-b66f-d9240d1e236a	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
deb018c6-e460-4f9d-aa31-83f0f51a5108	c83ebf08-d68a-4dbb-9242-531a906d0356	2337727d-d0a1-416b-9c21-5e037d9e5063	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
157d79aa-beda-4f0f-a7aa-b46fa7f54566	19b7d198-d1d8-4b58-ae20-58f078a7600f	2337727d-d0a1-416b-9c21-5e037d9e5063	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
0a816ee4-6100-4c31-8e40-0bd0e2aee891	524a6f80-4c61-4ba2-85a3-8d5da21f0b3b	2337727d-d0a1-416b-9c21-5e037d9e5063	t	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, google_sub, email, full_name, avatar_url, status, last_login_at, created_at, updated_at) FROM stdin;
67cd5c89-9913-4550-bf35-7cc90fa61803	google-admin-001	admin@course.local	System Admin	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
eaf9c839-e2f4-40f5-8b0b-41b25d170dfe	google-teacher-001	teacher1@course.local	Nguyen Van Teacher	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
58e4e939-0913-48bd-a644-1a7dcfb9a172	google-teacher-002	teacher2@course.local	Le Thi Teacher	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
c83ebf08-d68a-4dbb-9242-531a906d0356	google-student-001	student1@course.local	Tran Thi Student	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
19b7d198-d1d8-4b58-ae20-58f078a7600f	google-student-002	student2@course.local	Pham Van Student	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
524a6f80-4c61-4ba2-85a3-8d5da21f0b3b	google-student-003	student3@course.local	Vo Thi Student	\N	active	\N	2026-03-25 16:37:45.223426+00	2026-03-25 16:37:45.223426+00
\.


--
-- Name: class_sections class_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT class_sections_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: import_batch_errors import_batch_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batch_errors
    ADD CONSTRAINT import_batch_errors_pkey PRIMARY KEY (id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_student_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_student_code_key UNIQUE (student_code);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: teacher_profiles teacher_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_profiles
    ADD CONSTRAINT teacher_profiles_pkey PRIMARY KEY (id);


--
-- Name: teacher_profiles teacher_profiles_teacher_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_profiles
    ADD CONSTRAINT teacher_profiles_teacher_code_key UNIQUE (teacher_code);


--
-- Name: teacher_profiles teacher_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_profiles
    ADD CONSTRAINT teacher_profiles_user_id_key UNIQUE (user_id);


--
-- Name: teaching_assignments teaching_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT teaching_assignments_pkey PRIMARY KEY (id);


--
-- Name: class_sections uq_class_sections_unique_semester; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT uq_class_sections_unique_semester UNIQUE (subject_id, semester, academic_year, section_code);


--
-- Name: enrollments uq_enrollments_class_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT uq_enrollments_class_student UNIQUE (class_section_id, student_id);


--
-- Name: teaching_assignments uq_teaching_assignments_one_teacher_per_class; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT uq_teaching_assignments_one_teacher_per_class UNIQUE (class_section_id);


--
-- Name: user_roles uq_user_roles_user_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_sub_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_sub_key UNIQUE (google_sub);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_class_sections_subject_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sections_subject_id ON public.class_sections USING btree (subject_id);


--
-- Name: idx_enrollments_class_section_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_class_section_id ON public.enrollments USING btree (class_section_id);


--
-- Name: idx_enrollments_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_student_id ON public.enrollments USING btree (student_id);


--
-- Name: idx_import_batch_errors_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batch_errors_batch_id ON public.import_batch_errors USING btree (batch_id);


--
-- Name: idx_import_batches_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_entity_type ON public.import_batches USING btree (entity_type);


--
-- Name: idx_import_batches_uploaded_by_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_uploaded_by_user_id ON public.import_batches USING btree (uploaded_by_user_id);


--
-- Name: idx_subjects_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_is_active ON public.subjects USING btree (is_active);


--
-- Name: idx_teaching_assignments_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teaching_assignments_teacher_id ON public.teaching_assignments USING btree (teacher_id);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: uq_user_roles_primary_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_user_roles_primary_per_user ON public.user_roles USING btree (user_id) WHERE (is_primary = true);


--
-- Name: class_sections trg_class_sections_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_class_sections_set_updated_at BEFORE UPDATE ON public.class_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: enrollments trg_enrollments_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_enrollments_set_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: import_batches trg_import_batches_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_import_batches_set_updated_at BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles trg_roles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_roles_set_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_profiles trg_student_profiles_require_student_role; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_student_profiles_require_student_role BEFORE INSERT OR UPDATE OF user_id ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_role('student');


--
-- Name: student_profiles trg_student_profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_student_profiles_set_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subjects trg_subjects_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_subjects_set_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teacher_profiles trg_teacher_profiles_require_teacher_role; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_teacher_profiles_require_teacher_role BEFORE INSERT OR UPDATE OF user_id ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_role('teacher');


--
-- Name: teacher_profiles trg_teacher_profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_teacher_profiles_set_updated_at BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teaching_assignments trg_teaching_assignments_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_teaching_assignments_set_updated_at BEFORE UPDATE ON public.teaching_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_roles trg_user_roles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_roles_set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: class_sections fk_class_sections_subject; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sections
    ADD CONSTRAINT fk_class_sections_subject FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: enrollments fk_enrollments_class_section; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_enrollments_class_section FOREIGN KEY (class_section_id) REFERENCES public.class_sections(id);


--
-- Name: enrollments fk_enrollments_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id);


--
-- Name: import_batch_errors fk_import_batch_errors_batch; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batch_errors
    ADD CONSTRAINT fk_import_batch_errors_batch FOREIGN KEY (batch_id) REFERENCES public.import_batches(id);


--
-- Name: import_batches fk_import_batches_uploaded_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT fk_import_batches_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id);


--
-- Name: student_profiles fk_student_profiles_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teacher_profiles fk_teacher_profiles_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_profiles
    ADD CONSTRAINT fk_teacher_profiles_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: teaching_assignments fk_teaching_assignments_class_section; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT fk_teaching_assignments_class_section FOREIGN KEY (class_section_id) REFERENCES public.class_sections(id);


--
-- Name: teaching_assignments fk_teaching_assignments_teacher; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teaching_assignments
    ADD CONSTRAINT fk_teaching_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id);


--
-- Name: user_roles fk_user_roles_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles fk_user_roles_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Dhep2MM3H44HlSbyA1siWEfuqbQvhLekFUomwQQZ9hxH1xuq0V8UYFlgQngUsq6

