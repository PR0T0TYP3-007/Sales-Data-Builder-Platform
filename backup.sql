--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.4

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(100),
    entity_id integer,
    changes jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    entity "char",
    created_at timestamp with time zone,
    details jsonb,
    actor_id integer
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    website character varying(255),
    phone character varying(50),
    address text,
    description text,
    socials jsonb,
    industry character varying(100),
    status character varying(50) DEFAULT 'incomplete'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    product_id integer,
    updated_at timestamp with time zone,
    email text
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_groups (
    company_id integer NOT NULL,
    group_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_groups OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    company_id integer,
    name character varying(255) NOT NULL,
    role character varying(255),
    email character varying(255),
    phone character varying(50),
    department character varying(100),
    linkedin_url character varying(255),
    source character varying(100),
    status character varying(50) DEFAULT 'not_contacted'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: group_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_companies (
    group_id integer NOT NULL,
    company_id integer NOT NULL
);


ALTER TABLE public.group_companies OWNER TO postgres;

--
-- Name: group_workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_workflows (
    id integer NOT NULL,
    group_id integer NOT NULL,
    workflow_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_workflows OWNER TO postgres;

--
-- Name: group_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.group_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.group_workflows_id_seq OWNER TO postgres;

--
-- Name: group_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.group_workflows_id_seq OWNED BY public.group_workflows.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    product_id integer DEFAULT 1 NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    org_id integer,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    workflow_id integer NOT NULL,
    company_id integer NOT NULL,
    type character varying(50) NOT NULL,
    due_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contact_id integer,
    assigned_to integer,
    outcome text,
    completed_at timestamp without time zone
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    product_id integer,
    name character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    content text NOT NULL,
    variables jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.templates OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.templates_id_seq OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    org_id integer,
    email character varying(255) NOT NULL,
    password character varying(1000) NOT NULL,
    role character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name text,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'team_member'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id integer NOT NULL,
    product_id integer DEFAULT 1 NOT NULL,
    name character varying(255) NOT NULL,
    steps jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.workflows_id_seq OWNER TO postgres;

--
-- Name: workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workflows_id_seq OWNED BY public.workflows.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: group_workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_workflows ALTER COLUMN id SET DEFAULT nextval('public.group_workflows_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workflows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows ALTER COLUMN id SET DEFAULT nextval('public.workflows_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, action, entity_type, entity_id, changes, "timestamp", entity, created_at, details, actor_id) FROM stdin;
2	upload_file	file	\N	\N	2025-09-11 22:01:49.984737	c	\N	{"count": 0, "fileType": "csv"}	1
3	upload_file	file	\N	\N	2025-09-11 22:10:59.427587	c	\N	{"count": 10, "fileType": "csv"}	1
4	upload_file	file	\N	\N	2025-09-11 22:15:49.196104	c	\N	{"count": 0, "fileType": "pdf"}	1
5	bulk_company_enrichment	company	\N	\N	2025-09-11 23:06:31.424411	s	\N	{"results": [{"status": "queued", "companyId": "14"}, {"status": "queued", "companyId": "17"}, {"status": "queued", "companyId": "18"}, {"status": "queued", "companyId": "21"}, {"status": "queued", "companyId": "22"}, {"status": "queued", "companyId": "23"}, {"status": "queued", "companyId": "24"}, {"status": "queued", "companyId": "25"}, {"status": "queued", "companyId": "26"}, {"status": "queued", "companyId": "27"}, {"status": "queued", "companyId": "28"}, {"status": "queued", "companyId": "29"}, {"status": "queued", "companyId": "30"}, {"status": "queued", "companyId": "31"}, {"status": "queued", "companyId": "32"}, {"status": "queued", "companyId": "33"}, {"status": "queued", "companyId": "34"}, {"status": "queued", "companyId": "35"}, {"status": "queued", "companyId": "36"}, {"status": "queued", "companyId": "37"}, {"status": "queued", "companyId": "16"}, {"status": "queued", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"status": "queued", "companyId": "38"}, {"status": "queued", "companyId": "39"}, {"status": "queued", "companyId": "19"}, {"status": "queued", "companyId": "40"}, {"status": "queued", "companyId": "41"}, {"status": "queued", "companyId": "15"}, {"status": "queued", "companyId": "43"}, {"status": "queued", "companyId": "42"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}, {"status": "queued", "companyId": "47"}, {"status": "queued", "companyId": "48"}, {"status": "queued", "companyId": "49"}, {"status": "queued", "companyId": "50"}, {"status": "queued", "companyId": "51"}, {"status": "queued", "companyId": "52"}, {"status": "queued", "companyId": "53"}], "companies_processed": 41}	1
6	bulk_company_enrichment	company	\N	\N	2025-09-11 23:13:03.421713	s	\N	{"results": [{"status": "queued", "companyId": "14"}, {"status": "queued", "companyId": "17"}, {"status": "queued", "companyId": "18"}, {"status": "queued", "companyId": "21"}, {"status": "queued", "companyId": "22"}, {"status": "queued", "companyId": "23"}, {"status": "queued", "companyId": "24"}, {"status": "queued", "companyId": "25"}, {"status": "queued", "companyId": "26"}, {"status": "queued", "companyId": "27"}, {"status": "queued", "companyId": "28"}, {"status": "queued", "companyId": "29"}, {"status": "queued", "companyId": "30"}, {"status": "queued", "companyId": "31"}, {"status": "queued", "companyId": "32"}, {"status": "queued", "companyId": "33"}, {"status": "queued", "companyId": "34"}, {"status": "queued", "companyId": "35"}, {"status": "queued", "companyId": "36"}, {"status": "queued", "companyId": "37"}, {"status": "queued", "companyId": "16"}, {"status": "queued", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"status": "queued", "companyId": "38"}, {"status": "queued", "companyId": "39"}, {"status": "queued", "companyId": "19"}, {"status": "queued", "companyId": "40"}, {"status": "queued", "companyId": "41"}, {"status": "queued", "companyId": "15"}, {"status": "queued", "companyId": "43"}, {"status": "queued", "companyId": "42"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}, {"status": "queued", "companyId": "47"}, {"status": "queued", "companyId": "48"}, {"status": "queued", "companyId": "49"}, {"status": "queued", "companyId": "50"}, {"status": "queued", "companyId": "51"}, {"status": "queued", "companyId": "52"}, {"status": "queued", "companyId": "53"}], "companies_processed": 41}	1
7	bulk_company_enrichment	company	\N	\N	2025-09-11 23:16:41.92542	s	\N	{"results": [{"status": "queued", "companyId": "14"}, {"status": "queued", "companyId": "17"}, {"status": "queued", "companyId": "18"}, {"status": "queued", "companyId": "21"}, {"status": "queued", "companyId": "22"}, {"status": "queued", "companyId": "23"}, {"status": "queued", "companyId": "24"}, {"status": "queued", "companyId": "25"}, {"status": "queued", "companyId": "26"}, {"status": "queued", "companyId": "27"}, {"status": "queued", "companyId": "28"}, {"status": "queued", "companyId": "29"}, {"status": "queued", "companyId": "30"}, {"status": "queued", "companyId": "31"}, {"status": "queued", "companyId": "32"}, {"status": "queued", "companyId": "33"}, {"status": "queued", "companyId": "34"}, {"status": "queued", "companyId": "35"}, {"status": "queued", "companyId": "36"}, {"status": "queued", "companyId": "37"}, {"status": "queued", "companyId": "16"}, {"status": "queued", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"status": "queued", "companyId": "38"}, {"status": "queued", "companyId": "39"}, {"status": "queued", "companyId": "19"}, {"status": "queued", "companyId": "40"}, {"status": "queued", "companyId": "41"}, {"status": "queued", "companyId": "15"}, {"status": "queued", "companyId": "43"}, {"status": "queued", "companyId": "42"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}, {"status": "queued", "companyId": "47"}, {"status": "queued", "companyId": "48"}, {"status": "queued", "companyId": "49"}, {"status": "queued", "companyId": "50"}, {"status": "queued", "companyId": "51"}, {"status": "queued", "companyId": "52"}, {"status": "queued", "companyId": "53"}], "companies_processed": 41}	1
8	bulk_company_enrichment	company	\N	\N	2025-09-11 23:19:58.68255	s	\N	{"results": [{"status": "queued", "companyId": "14"}, {"status": "queued", "companyId": "17"}, {"status": "queued", "companyId": "18"}, {"status": "queued", "companyId": "21"}, {"status": "queued", "companyId": "22"}, {"status": "queued", "companyId": "23"}, {"status": "queued", "companyId": "24"}, {"status": "queued", "companyId": "25"}, {"status": "queued", "companyId": "26"}, {"status": "queued", "companyId": "27"}, {"status": "queued", "companyId": "28"}, {"status": "queued", "companyId": "29"}, {"status": "queued", "companyId": "30"}, {"status": "queued", "companyId": "31"}, {"status": "queued", "companyId": "32"}, {"status": "queued", "companyId": "33"}, {"status": "queued", "companyId": "34"}, {"status": "queued", "companyId": "35"}, {"status": "queued", "companyId": "36"}, {"status": "queued", "companyId": "37"}, {"status": "queued", "companyId": "16"}, {"status": "queued", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"status": "queued", "companyId": "38"}, {"status": "queued", "companyId": "39"}, {"status": "queued", "companyId": "19"}, {"status": "queued", "companyId": "40"}, {"status": "queued", "companyId": "41"}, {"status": "queued", "companyId": "15"}, {"status": "queued", "companyId": "43"}, {"status": "queued", "companyId": "42"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}, {"status": "queued", "companyId": "47"}, {"status": "queued", "companyId": "48"}, {"status": "queued", "companyId": "49"}, {"status": "queued", "companyId": "50"}, {"status": "queued", "companyId": "51"}, {"status": "queued", "companyId": "52"}, {"status": "queued", "companyId": "53"}], "companies_processed": 41}	1
9	bulk_company_enrichment	company	\N	\N	2025-09-11 23:35:28.321856	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}], "companies_processed": 1}	1
10	bulk_company_enrichment	company	\N	\N	2025-09-11 23:38:51.224983	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}], "companies_processed": 1}	1
11	bulk_company_enrichment	company	\N	\N	2025-09-11 23:45:42.856803	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}], "companies_processed": 1}	1
12	bulk_company_enrichment	company	\N	\N	2025-09-11 23:48:49.853841	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}], "companies_processed": 1}	1
13	bulk_company_enrichment	company	\N	\N	2025-09-11 23:51:00.653002	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "47"}], "companies_processed": 4}	1
14	bulk_company_enrichment	company	\N	\N	2025-09-11 23:51:44.56468	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "14"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "18"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "21"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "22"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "23"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "24"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "25"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "26"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "27"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "28"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "29"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "30"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "31"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "32"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "33"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "34"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "35"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "36"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "37"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "16"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "38"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "39"}, {"status": "queued", "companyId": "19"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "40"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "41"}, {"status": "queued", "companyId": "15"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "43"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "42"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "47"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "48"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "49"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "50"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "51"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "52"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "53"}], "companies_processed": 41}	1
15	bulk_company_enrichment	company	\N	\N	2025-09-11 23:58:37.836478	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "50"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "51"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "52"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "53"}], "companies_processed": 6}	1
16	bulk_company_enrichment	company	\N	\N	2025-09-12 00:04:06.28306	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "36"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "37"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}], "companies_processed": 4}	1
17	bulk_company_enrichment	company	\N	\N	2025-09-12 00:09:22.779932	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"status": "queued", "companyId": "20"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}], "companies_processed": 5}	1
18	bulk_company_enrichment	company	\N	\N	2025-09-12 00:12:26.701059	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "18"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "16"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "13"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}], "companies_processed": 7}	1
19	bulk_company_enrichment	company	\N	\N	2025-09-12 00:14:18.605468	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "18"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}], "companies_processed": 7}	1
20	bulk_company_enrichment	company	\N	\N	2025-09-12 00:19:34.362533	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "14"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "13"}, {"status": "queued", "companyId": "20"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "47"}], "companies_processed": 8}	1
21	bulk_company_enrichment	company	\N	\N	2025-09-12 00:27:32.124508	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "14"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "17"}, {"status": "queued", "companyId": "15"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "42"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}], "companies_processed": 7}	1
22	bulk_company_enrichment	company	\N	\N	2025-09-12 00:31:18.853615	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "14"}], "companies_processed": 1}	1
23	bulk_company_enrichment	company	\N	\N	2025-09-12 00:31:43.696585	s	\N	{"results": [{"reason": "No website to enrich", "status": "skipped", "companyId": "44"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "45"}, {"reason": "No website to enrich", "status": "skipped", "companyId": "46"}], "companies_processed": 3}	1
24	bulk_company_enrichment	company	\N	\N	2025-09-12 00:32:10.581325	s	\N	{"results": [{"status": "queued", "companyId": "19"}], "companies_processed": 1}	1
25	company_enrichment	19	\N	\N	2025-09-12 00:32:17.07913	c	\N	{"socials": "{}", "website": "https://www.almadinainternational.com"}	1
26	bulk_company_enrichment	company	\N	\N	2025-09-12 00:34:44.165719	s	\N	{"results": [{"status": "queued", "companyId": "14"}], "companies_processed": 1}	1
27	bulk_company_enrichment	company	\N	\N	2025-09-12 00:35:03.514446	s	\N	{"results": [{"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}], "companies_processed": 3}	1
28	bulk_company_enrichment	company	\N	\N	2025-09-12 00:43:12.213326	s	\N	{"results": [{"status": "queued", "companyId": "14"}], "companies_processed": 1}	1
29	company_enrichment	14	\N	\N	2025-09-12 00:43:13.206268	c	\N	{"socials": "{}"}	1
30	bulk_company_enrichment	company	\N	\N	2025-09-12 00:43:50.155346	s	\N	{"results": [{"status": "queued", "companyId": "42"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "45"}, {"status": "queued", "companyId": "46"}, {"status": "queued", "companyId": "47"}, {"status": "queued", "companyId": "48"}], "companies_processed": 6}	1
31	company_enrichment	42	\N	\N	2025-09-12 00:43:51.676811	c	\N	{"socials": "{}"}	1
32	company_enrichment	44	\N	\N	2025-09-12 00:43:52.894332	c	\N	{"socials": "{}"}	1
33	company_enrichment	45	\N	\N	2025-09-12 00:43:54.824242	c	\N	{"socials": "{}"}	1
34	company_enrichment	46	\N	\N	2025-09-12 00:43:56.069182	c	\N	{"socials": "{}"}	1
35	company_enrichment	47	\N	\N	2025-09-12 00:43:57.03702	c	\N	{"socials": "{}"}	1
36	company_enrichment	48	\N	\N	2025-09-12 00:43:57.981012	c	\N	{"socials": "{}"}	1
37	bulk_company_enrichment	company	\N	\N	2025-09-12 00:51:11.868493	s	\N	{"results": [{"status": "queued", "companyId": "17"}], "companies_processed": 1}	1
38	bulk_company_enrichment	company	\N	\N	2025-09-12 00:55:36.342577	s	\N	{"results": [{"status": "queued", "companyId": "52"}, {"status": "queued", "companyId": "44"}], "companies_processed": 2}	1
39	company_enrichment	52	\N	\N	2025-09-12 00:55:42.18645	c	\N	{"socials": "{}", "website": "https://www.os.net"}	1
40	company_enrichment	44	\N	\N	2025-09-12 00:58:37.896543	c	\N	{"socials": "{}"}	1
41	bulk_company_enrichment	company	\N	\N	2025-09-12 01:09:46.480355	s	\N	{"results": [{"status": "queued", "companyId": "48"}, {"status": "queued", "companyId": "44"}, {"status": "queued", "companyId": "53"}], "companies_processed": 3}	1
42	company_enrichment	48	\N	\N	2025-09-12 01:09:55.622145	c	\N	{"socials": "{}", "website": "https://www.starkindustries.com"}	1
43	company_enrichment	44	\N	\N	2025-09-12 01:12:58.83711	c	\N	{"socials": "{}"}	1
44	company_enrichment	53	\N	\N	2025-09-12 01:13:09.859807	c	\N	{"socials": "{}", "website": "https://www.piedpiper.net"}	1
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, website, phone, address, description, socials, industry, status, created_at, product_id, updated_at, email) FROM stdin;
17	Alessandra Investments Limited	\N	(902) 420-0124	1574 Argyle St, Suite 7 Box 12, Halifax, NS B3J 2B3	\N	\N	\N	incomplete	2025-09-04 18:18:36.744095	1	\N	\N
18	Allure Construction Ltd.	\N	(902) 405-8366	196 Black Bear Circle, Lewis Lake, NS B3Z 0E3	\N	\N	\N	incomplete	2025-09-04 18:18:36.746184	1	\N	\N
21	Alternative Financing Options	\N	(902) 499-2979	Bedford, NS	\N	\N	\N	incomplete	2025-09-04 18:18:36.753879	1	\N	\N
22	Amity Developments Ltd.	\N	(902) 452-5021	1 Kingswood Drive, Suite 212, Hammonds Plains, NS B4B 0P4	\N	\N	\N	incomplete	2025-09-04 18:18:36.756654	1	\N	\N
23	Anchor Property Management LTD	\N	(902) 266-2987	Halifax, NS	\N	\N	\N	incomplete	2025-09-04 18:18:36.759218	1	\N	\N
24	AR Webber Properties Limited	\N	(902) 422-6539	1083 Queen St, Suite 105, Halifax, NS B3H 0B2	\N	\N	\N	incomplete	2025-09-04 18:18:36.760729	1	\N	\N
25	ARI Properties Limited	\N	(902) 989-5665	80 Ochterloney Street, Dartmouth, NS B2Y 4S5	\N	\N	\N	incomplete	2025-09-04 18:18:36.76229	1	\N	\N
26	Atlantic Concrete Association	\N	(902) 443-4456	168 Hobsons Lake Dr, Suite 301, Halifax, NS B3S 0G4	\N	\N	\N	incomplete	2025-09-04 18:18:36.763729	1	\N	\N
27	Atlantic Developments Inc.	\N	(902) 404-3332	2114 Gottingen Street, Halifax, NS B3K 0C5	\N	\N	\N	incomplete	2025-09-04 18:18:36.765049	1	\N	\N
28	Atlantic Home Building and Renovation	\N	(902) 240-1133	PO Box 312, Halifax, NS B3J 2N7	\N	\N	\N	incomplete	2025-09-04 18:18:36.766534	1	\N	\N
29	Atlantic Road Construction and Paving	\N	(902) 404-8547	P.O. Box 89, 6 Belmont Ave, Eastern Passage, NS B3G 1M7	\N	\N	\N	incomplete	2025-09-04 18:18:36.768316	1	\N	\N
30	Avalon Realty	\N	(902) 221-4880	Halifax, NS	\N	\N	\N	incomplete	2025-09-04 18:18:36.770487	1	\N	\N
31	Avison Young	\N	(902) 454-6185	620 Nine Mile Drive, Unit 203, Bedford, NS B4A 0H4	\N	\N	\N	incomplete	2025-09-04 18:18:36.772399	1	\N	\N
32	Avondale Construction Limited	\N	(902) 876-1818	49 Hobsons Lake Dr, Halifax, NS B3S 0E4	\N	\N	\N	incomplete	2025-09-04 18:18:36.774146	1	\N	\N
33	AW Dean Contracting & Landscaping Ltd	\N	(902) 835-9247	20 Pockwock Rd, Hammonds Plains, NS B4B 1M5	\N	\N	\N	incomplete	2025-09-04 18:18:36.775851	1	\N	\N
34	Axios Construction Limited	\N	(902) 440-0890	Dartmouth, NS	\N	\N	\N	incomplete	2025-09-04 18:18:36.7774	1	\N	\N
35	3332359 Nova Scotia limited	\N	(902) 441-1192	Halifax, NS	\N	\N	\N	incomplete	2025-09-04 19:01:39.379059	1	\N	\N
36	6100 Construction Management Inc	\N	(902) 497-0947	Bedford, NS	\N	\N	\N	incomplete	2025-09-04 19:01:39.394465	1	\N	\N
37	ACE Mechanical Limited	\N	(902) 479-1516	3016 Monaghan Drive, Halifax, NS B3K 2V9	\N	\N	\N	incomplete	2025-09-04 19:01:39.397333	1	\N	\N
16	AeroVision Canada Inc.	\N	(902) 450-2824	Halifax, NS	\N	\N	\N	failed	2025-09-04 18:18:36.741746	1	\N	\N
13	3332359 Nova Scotia limited	\N	(902) 441-1192	Halifax, NS	\N	{"instagram": "https://www.instagram.com/3332359novascotialimited"}	\N	partially_enriched	2025-09-04 18:18:36.719655	1	\N	\N
19	Almadina International Ltd.	https://www.almadinainternational.com	(902) 209-0238	Bedford, NS	Description not available.	{}	\N	enriched	2025-09-04 18:18:36.748301	1	\N	\N
15	ACE Mechanical Limited	https://www.acemechanical.ca	(250)-549-3849	3016 Monaghan Drive, Halifax, NS B3K 2V9	Plumbing, heating, airconditioning in Vernon and Area. Trusted technicians to handle all your mechanical needs. Renovations, emergency repair and installations. Hot water tanks, AC units	{}	automotive	enriched	2025-09-04 18:18:36.739738	1	\N	alvin@acemechanical.ca
20	Alpha Dream Homes ltd	https://www.alphadreamhomes.ca	(782) 882-3422	600 Bedford Highway Halifax, Unit 216, Halifax, NS B3M 0P6	Alpha Dream Homes is your premier destination for all your construction and renovation needs. With years of experience and a team of skilled professionals, we specialise in general contracting, home renovations, and new constructions.	\N	\N	enriched	2025-09-04 18:18:36.750139	1	\N	\N
38	COMPANY: 3332359 Nova Scotia limited	\N	(902) 441-1192	COMPANY: 6100 Construction Management Inc	\N	\N	\N	incomplete	2025-09-05 17:46:52.190711	1	\N	\N
39	COMPANY: Atlantic Concrete Association	\N	(902) 443-4456	ADDRESS: 168 Hobsons Lake Dr, Suite 301, Halifax, NS B3S 0G4	\N	\N	\N	incomplete	2025-09-05 17:46:52.341007	1	\N	\N
45	Globex Inc	\N	(555) 987-6543	456 Oak Ave, Somewhere, NY 67890	\N	{}	\N	incomplete	2025-09-11 22:10:59.39636	1	\N	\N
40	COMPANY: 3332359 Nova Scotia limited	\N	(902) 441-1192	COMPANY: 6100 Construction Management Inc	\N	\N	\N	incomplete	2025-09-06 22:39:14.810287	1	\N	\N
41	COMPANY: Atlantic Concrete Association	\N	(902) 443-4456	ADDRESS: 168 Hobsons Lake Dr, Suite 301, Halifax, NS B3S 0G4	\N	\N	\N	incomplete	2025-09-06 22:39:16.071466	1	\N	\N
14	6100 Construction Management Inc	\N	(902) 497-0947	Bedford, NS	\N	{}	\N	incomplete	2025-09-04 18:18:36.736295	1	\N	\N
43	COMPANY: Atlantic Concrete Association	\N	(902) 443-4456	ADDRESS: 168 Hobsons Lake Dr, Suite 301, Halifax, NS B3S 0G4	\N	\N	\N	incomplete	2025-09-08 10:57:51.406496	1	\N	\N
46	Initech LLC	\N	(555) 555-5555	789 Pine Rd, Nowhere, TX 10112	\N	{}	\N	incomplete	2025-09-11 22:10:59.399535	1	\N	\N
49	Umbrella Corp	\N	(555) 444-3333	1 Laboratory Lane, Raccoon City, IL 60601	\N	\N	\N	incomplete	2025-09-11 22:10:59.408294	1	\N	\N
50	Wonka Industries	\N	(555) 777-6666	432 Chocolate Factory Lane, Dessert, CO 80203	\N	\N	\N	incomplete	2025-09-11 22:10:59.411134	1	\N	\N
51	Cyberdyne Systems	\N	(555) 222-1111	18144 Skynet Drive, Tech Valley, CA 94105	\N	\N	\N	incomplete	2025-09-11 22:10:59.413684	1	\N	\N
42	COMPANY: 3332359 Nova Scotia limited	\N	(902) 441-1192	COMPANY: 6100 Construction Management Inc	\N	{}	\N	partially_enriched	2025-09-08 10:57:51.055016	1	\N	\N
47	Wayne Enterprises	\N	(555) 111-2222	1007 Mountain Dr, Gotham, NJ 34567	\N	{}	\N	incomplete	2025-09-11 22:10:59.402807	1	\N	\N
52	Oscorp	https://www.os.net	(555) 666-7777	1 Oscorp Tower, New York, NY 10001	\N	{}	\N	incomplete	2025-09-11 22:10:59.415379	1	\N	\N
48	Stark Industries	https://www.starkindustries.com	(555) 999-8888	10880 Malibu Point, Malibu, CA 90265	\N	{}	\N	incomplete	2025-09-11 22:10:59.405651	1	\N	\N
44	Acme Corporation	\N	(555) 123-4567	123 Main St, Anytown, CA 12345	\N	{}	\N	incomplete	2025-09-11 22:10:59.277357	1	\N	\N
53	Pied Piper	https://www.piedpiper.net	(555) 888-9999	123 Compression Ave, Palo Alto, CA 94301	\N	{}	\N	incomplete	2025-09-11 22:10:59.417084	1	\N	\N
\.


--
-- Data for Name: company_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_groups (company_id, group_id, created_at) FROM stdin;
14	1	2025-09-07 15:23:50.48811
20	1	2025-09-07 15:23:50.48811
16	1	2025-09-07 15:23:50.48811
22	2	2025-09-07 19:49:11.489807
19	2	2025-09-07 19:49:11.489807
16	2	2025-09-07 19:49:11.489807
15	2	2025-09-07 19:49:11.489807
21	1	2025-09-11 20:05:46.609797
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, company_id, name, role, email, phone, department, linkedin_url, source, status, created_at, updated_at) FROM stdin;
1	20	Oscar Holland	Oscar Holland	\N	\N	\N	\N	https://www.alphadreamhomes.ca/our-team	not_contacted	2025-09-07 19:29:56.437559	2025-09-07 19:29:56.437559
2	20	Oscar Holland	Oscar Holland	\N	\N	\N	\N	https://www.alphadreamhomes.ca/our-team	not_contacted	2025-09-07 19:29:56.510823	2025-09-07 19:29:56.510823
\.


--
-- Data for Name: group_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_companies (group_id, company_id) FROM stdin;
\.


--
-- Data for Name: group_workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_workflows (id, group_id, workflow_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, product_id, name, created_at, description) FROM stdin;
1	1	Halifax Demo Group	2025-09-07 15:22:03.39336	Test group for demonstration purposes
2	1	HAPPY	2025-09-07 19:47:51.978262	have a happy day
3	1	hello	2025-09-11 19:42:08.813831	construction
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, created_at) FROM stdin;
1	Default Org	2025-09-08 05:27:53.986914
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, org_id, name, created_at) FROM stdin;
2	\N	feed	2025-09-04 15:11:13.89574
1	\N	food	2025-09-04 15:11:13.89574
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, workflow_id, company_id, type, due_date, status, notes, created_at, contact_id, assigned_to, outcome, completed_at) FROM stdin;
1	1	14	email	2025-09-07	pending	\N	2025-09-07 15:25:42.5819	\N	\N	\N	\N
2	1	14	call	2025-09-09	pending	\N	2025-09-07 15:25:42.630037	\N	\N	\N	\N
3	1	20	email	2025-09-07	pending	\N	2025-09-07 15:25:42.632116	\N	\N	\N	\N
4	1	20	call	2025-09-09	pending	\N	2025-09-07 15:25:42.634323	\N	\N	\N	\N
5	1	16	email	2025-09-07	pending	\N	2025-09-07 15:25:42.636606	\N	\N	\N	\N
6	1	16	call	2025-09-09	pending	\N	2025-09-07 15:25:42.639719	\N	\N	\N	\N
7	1	22	email	2025-09-07	pending	\N	2025-09-07 19:49:48.418387	\N	\N	\N	\N
8	1	22	call	2025-09-09	pending	\N	2025-09-07 19:49:48.460588	\N	\N	\N	\N
9	1	16	email	2025-09-07	pending	\N	2025-09-07 19:49:48.46327	\N	\N	\N	\N
10	1	16	call	2025-09-09	pending	\N	2025-09-07 19:49:48.465828	\N	\N	\N	\N
11	1	19	email	2025-09-07	pending	\N	2025-09-07 19:49:48.46836	\N	\N	\N	\N
12	1	19	call	2025-09-09	pending	\N	2025-09-07 19:49:48.470954	\N	\N	\N	\N
13	1	15	email	2025-09-07	pending	\N	2025-09-07 19:49:48.473082	\N	\N	\N	\N
14	1	15	call	2025-09-09	pending	\N	2025-09-07 19:49:48.494561	\N	\N	\N	\N
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.templates (id, product_id, name, type, content, variables, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, org_id, email, password, role, created_at, name) FROM stdin;
1	1	admin@gmail.com	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	admin	2025-09-08 05:29:56.657966	Admin User\n
2	1	manager@example.com	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	manager	2025-09-08 12:51:45.208771	Manager User
3	1	member@example.com	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	team_member	2025-09-08 12:51:45.208771	Team Member
4	1	team@demo.com	$2b$10$z1wQw6n9w8Qw6n9w8Qw6n9u1wQw6n9w8Qw6n9w8Qw6n9w8Qw6n9w8	team_member	2025-09-11 13:41:40.110177	Team Member
5	1	\tmanager@demo.com	$2b$10$u1wQw6n9w8Qw6n9w8Qw6n9u1wQw6n9w8Qw6n9w8Qw6n9w8Qw6n9w8	manager	2025-09-11 13:41:40.110177	Manager
6	1	admin@demo.com	$2b$10$1wQw6n9w8Qw6n9w8Qw6n9u1wQw6n9w8Qw6n9w8Qw6n9w8Qw6n9w8	admin	2025-09-11 13:41:40.110177	Admin
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workflows (id, product_id, name, steps, created_at) FROM stdin;
1	1	Demo Outreach Sequence	[{"type": "email", "template": "Hello, this is a test email from our system.", "offsetDays": 0}, {"type": "call", "script": "Follow-up call regarding the email.", "offsetDays": 2}]	2025-09-05 17:52:37.654323
2	1	Demo Outreach Sequence	[{"type": "email", "template": "Hello, this is a test email from our system.", "offsetDays": 0}, {"type": "call", "script": "Follow-up call regarding the email.", "offsetDays": 2}]	2025-09-05 18:01:32.385062
3	1	Sample Outreach Sequence	[{"type": "email", "subject": "Introduction", "template": "Hello {{contact_name}}, we are reaching out from {{our_company}}.", "offsetDays": 0}, {"type": "call", "script": "Follow up on the introductory email. Ask if they had a chance to review it.", "offsetDays": 3}, {"type": "email", "subject": "Follow Up", "template": "Just checking in to see if you have any questions about our services.", "offsetDays": 7}]	2025-09-05 18:04:16.639087
4	1	Sample Outreach Sequence	[{"type": "email", "subject": "Introduction", "template": "Hello [contact_name], we are reaching out from [our_company].", "offsetDays": 0}, {"type": "call", "script": "Follow up on the introductory email for [company_name].", "offsetDays": 3}]	2025-09-05 18:10:13.069087
5	1	Sample Outreach Sequence	[{"type": "email", "subject": "Introduction", "template": "Hello {{contact_name}}, we are reaching out from {{our_company}}.", "offsetDays": 0}, {"type": "call", "script": "Follow up on the introductory email. Ask if they had a chance to review it.", "offsetDays": 3}, {"type": "email", "subject": "Follow Up", "template": "Just checking in to see if you have any questions about our services.", "offsetDays": 7}]	2025-09-05 18:14:08.891057
6	1	User Onboarding Campaign	[{"type": "email", "subject": "Welcome!", "template": "welcome", "offsetDays": 0}, {"type": "sms", "message": "Thanks for joining! Check your email for next steps.", "offsetDays": 1}, {"type": "task", "priority": "high", "offsetDays": 3, "description": "Complete your profile"}, {"type": "email", "subject": "How's it going?", "template": "checkin", "offsetDays": 7}]	2025-09-06 23:49:09.303734
7	1	Sales Outreach Campaign	[{"type": "email", "template": "Welcome email template", "offsetDays": 0, "targetRole": "CEO"}, {"type": "call", "template": "Follow-up call script", "offsetDays": 3, "targetRole": "Manager"}]	2025-09-07 19:32:28.135726
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 44, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 53, true);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 2, true);


--
-- Name: group_workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.group_workflows_id_seq', 1, false);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 3, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 1, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tasks_id_seq', 14, true);


--
-- Name: templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.templates_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workflows_id_seq', 7, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_groups company_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_groups
    ADD CONSTRAINT company_groups_pkey PRIMARY KEY (company_id, group_id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: group_companies group_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_companies
    ADD CONSTRAINT group_companies_pkey PRIMARY KEY (group_id, company_id);


--
-- Name: group_workflows group_workflows_group_id_workflow_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_workflows
    ADD CONSTRAINT group_workflows_group_id_workflow_id_key UNIQUE (group_id, workflow_id);


--
-- Name: group_workflows group_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_workflows
    ADD CONSTRAINT group_workflows_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_companies_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_product_id ON public.companies USING btree (product_id);


--
-- Name: idx_company_groups_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_groups_group_id ON public.company_groups USING btree (group_id);


--
-- Name: idx_contacts_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_company_id ON public.contacts USING btree (company_id);


--
-- Name: idx_tasks_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_company_id ON public.tasks USING btree (company_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tasks_workflow_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_workflow_id ON public.tasks USING btree (workflow_id);


--
-- Name: companies companies_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: contacts contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: company_groups fk_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_groups
    ADD CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tasks fk_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_groups fk_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_groups
    ADD CONSTRAINT fk_group FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: workflows fk_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: groups fk_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: tasks fk_workflow; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: group_companies group_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_companies
    ADD CONSTRAINT group_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: group_companies group_companies_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_companies
    ADD CONSTRAINT group_companies_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_workflows group_workflows_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_workflows
    ADD CONSTRAINT group_workflows_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_workflows group_workflows_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_workflows
    ADD CONSTRAINT group_workflows_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: products products_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks tasks_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: templates templates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

