--
-- PostgreSQL database dump
--

\restrict pPt6qQjotoNZTc97qC6alVWDHTgVfXnvPcNcPbyiElyKSafy5nDTX3cWTnUajbP

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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
-- Name: ExpectedReceiptEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpectedReceiptEventType" AS ENUM (
    'CREATED',
    'RECEIVED',
    'UPDATED',
    'CANCELLED',
    'CLOSED'
);


--
-- Name: ExpectedReceiptStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpectedReceiptStatus" AS ENUM (
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
);


--
-- Name: LotStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LotStatus" AS ENUM (
    'OK',
    'WARNING',
    'QUARANTINE',
    'BLOCKED'
);


--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementType" AS ENUM (
    'RECEIPT',
    'ISSUE',
    'ADJUSTMENT',
    'QUARANTINE',
    'UNBLOCK',
    'RECALL',
    'BLOCK'
);


--
-- Name: NotificationPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'CRITICAL'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'OPERATOR',
    'VIEWER',
    'MANAGER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    actor_id text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: barcode_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barcode_records (
    id text NOT NULL,
    barcode text NOT NULL,
    product_id text,
    lot_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: expected_receipt_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expected_receipt_events (
    id text NOT NULL,
    expected_receipt_id text NOT NULL,
    type public."ExpectedReceiptEventType" NOT NULL,
    quantity numeric(18,4),
    message text,
    actor_email text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: expected_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expected_receipts (
    id text NOT NULL,
    product_id text NOT NULL,
    ordered_qty numeric(18,4) NOT NULL,
    received_qty numeric(18,4) DEFAULT 0 NOT NULL,
    status public."ExpectedReceiptStatus" DEFAULT 'ORDERED'::public."ExpectedReceiptStatus" NOT NULL,
    comment text,
    created_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id text NOT NULL,
    product_id text NOT NULL,
    lot_id text NOT NULL,
    quantity numeric(18,4) NOT NULL,
    location text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    reserved_quantity numeric(18,4) DEFAULT 0 NOT NULL
);


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots (
    id text NOT NULL,
    product_id text NOT NULL,
    lot_number text NOT NULL,
    expiry_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    mfg_date timestamp(3) without time zone,
    status public."LotStatus" DEFAULT 'OK'::public."LotStatus" NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text,
    channel text NOT NULL,
    payload jsonb,
    read_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type text NOT NULL,
    priority public."NotificationPriority" DEFAULT 'NORMAL'::public."NotificationPriority" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    href text
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    manufacturer text,
    min_stock numeric(18,4),
    reorder_point numeric(18,4)
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id text NOT NULL,
    reference text NOT NULL,
    product_id text NOT NULL,
    lot_id text,
    type public."MovementType" NOT NULL,
    quantity numeric(18,4) NOT NULL,
    actor_email text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    write_off_destination text,
    write_off_comment text,
    write_off_destination_id text,
    operation_group_id text,
    corrected_movement_id text,
    correction_session_id text,
    edit_reason text
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    payload jsonb NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public."UserRole" DEFAULT 'OPERATOR'::public."UserRole" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    display_name text,
    last_login_at timestamp(3) without time zone,
    deleted_at timestamp(3) without time zone
);


--
-- Name: write_off_destinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.write_off_destinations (
    id text NOT NULL,
    name text NOT NULL,
    type text,
    is_active boolean DEFAULT true NOT NULL,
    legacy_code text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2e993d7d-d734-4948-9844-053e53f8dd1a	a27431a47d07b55184130771a286ccbb7f64692e2a19a80af5aa2d4988cffb9d	2026-05-20 11:06:42.495502+00	20250520090000_init	\N	\N	2026-05-20 11:06:42.447312+00	1
36512e4d-15c0-45df-8aaf-ce07710e9a33	0e3e4b3842c097424281453ad67379e7b9516eb5d2e9255014942207a4ff16f0	2026-05-20 11:25:30.823134+00	20250520120000_refresh_tokens	\N	\N	2026-05-20 11:25:30.807831+00	1
b1182594-629d-4b15-9f15-2c2357d60c11	30da6b97e591f43afa2ff6c721922d30ec4fb2bbb65f0173404641921ff45587	2026-05-22 13:00:55.478353+00	20250522100000_movement_operation_group	\N	\N	2026-05-22 13:00:55.463236+00	1
878afbe2-8401-476b-9bb6-5c9dbb206566	c2f8ece0ad966b5a24abcf988112fdfe79cb096a317bd1777037e9b5771c83a0	2026-05-20 12:01:07.06873+00	20250520140000_inventory_workflows	\N	\N	2026-05-20 12:01:07.015688+00	1
b6a8b15f-4780-4641-a12e-10881d4246c4	ab17c04771de487687e8f193473d9be0c2f87376bb04f4781b7e323e16435e77	2026-05-20 14:15:14.284056+00	20250520160000_movement_types_recall_block	\N	\N	2026-05-20 14:15:14.244079+00	1
e96b7658-045c-4b33-b163-19b56af87cc2	47a640fb090d294eea2b244de58350cf0fced9c56abbe29a48ca7998b6f373e6	2026-05-20 14:15:14.286429+00	20250520180000_add_manager_role	\N	\N	2026-05-20 14:15:14.28463+00	1
2061ff10-33d7-4f14-a615-1206eceb5041	0f7c360660799f09cbd2b2822e6bdd162ba4e0233d4e24c9a1c035101818844e	2026-05-22 15:28:25.886004+00	20250522120000_movement_corrections	\N	\N	2026-05-22 15:28:25.850607+00	1
eb5a7932-0371-428b-8700-b8d455165a1c	a24f9f3f9a530a9cfceaa3c858245ae9b7e9c7854d5180d4e0b940edda132565	2026-05-20 14:15:14.376496+00	20250520200000_inventory_ops_stage	\N	\N	2026-05-20 14:15:14.286889+00	1
9be12dcf-28f6-45ee-85dc-7dd99ac0e230	2a286a27e3a44f5d0d3aedf14ecd3e7ac86287a288c83225802f0f3b262358c9	2026-05-20 14:15:14.378916+00	20250520220000_user_display_name	\N	\N	2026-05-20 14:15:14.377082+00	1
8f5d2706-9556-40c9-babc-ed53af1d820a	0e5532a181ec78bb24eed9746ebb6195fd7e0747a8a432d03074029f5d2599de	2026-05-20 14:35:36.851858+00	20250520240000_user_delete_password_reset	\N	\N	2026-05-20 14:35:36.755486+00	1
f1ad51eb-b618-4b6f-8e16-62fb6f408244	cc43f5cb239bebe3ca38b15dcdc044f45da59cc46790bdde635acc41039e6bc4	2026-05-20 14:41:20.364369+00	20250520260000_users_email_partial_unique	\N	\N	2026-05-20 14:41:20.353273+00	1
b762b823-b6fc-4cf8-b6f1-2d25caaa26d7	b0ca2c10d2c88f4bcb22f28bdb95d76b556957c995c5540d31bfb1c9b1266434	2026-05-20 15:21:28.161887+00	20250520150000_mail_settings_payload	\N	\N	2026-05-20 15:21:28.154114+00	1
3d82046e-7c0e-4f2b-8c3d-d65649ead2d0	3df4186acf5bf56aa574ea2a9cd22907e607a203a35fae90b2920238e9a38b97	2026-05-21 11:05:13.21493+00	20250521000000_writeoff_destination	\N	\N	2026-05-21 11:05:13.203129+00	1
973f0f45-bf3b-406d-8d35-f4a69eb8ae86	1df5871e93eca7eb11d89b3ca4aadd761b927859c68ca0b22a95b42c9f79dad9	2026-05-21 12:32:22.970072+00	20250521120000_writeoff_destinations_ref	\N	\N	2026-05-21 12:32:22.935339+00	1
e0f394fb-bf21-4432-9957-17f91ef4fb8b	8effa9acefea0b9520b9c49af9309a88cf47d3302aa518cb3b827982dfd97cf9	2026-05-21 14:22:00.791635+00	20250521140000_expected_receipts	\N	\N	2026-05-21 14:22:00.751986+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) FROM stdin;
cmpe176du0007dzs0ewgtrc4g	\N	lot.status.quarantine	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "QUARANTINE"}	2026-05-20 12:21:49.458
cmpe177e6000bdzs00vknpp4t	\N	lot.status.ok	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "OK"}	2026-05-20 12:21:50.767
cmpe18ykg00095iox8l5z6o0z	\N	lot.status.quarantine	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "QUARANTINE"}	2026-05-20 12:23:12.641
cmpe18zkd000d5ioxmbba6ydh	\N	lot.status.ok	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "OK"}	2026-05-20 12:23:13.933
cmpe5ba830001m16kqmx2u1mr	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe5ba810000m16kgcrcln4m	{"role": "MANAGER", "email": "am@medicine-2000.ru"}	2026-05-20 14:16:59.523
cmpe5c5nk0002m16k2y4oh8g8	cmpe5ba810000m16kgcrcln4m	auth.login_failed	auth	cmpe5ba810000m16kgcrcln4m	{"email": "am@medicine-2000.ru", "reason": "invalid_password"}	2026-05-20 14:17:40.256
cmpe5cgpr0005m16ka417ofbq	cmpe5ba810000m16kgcrcln4m	auth.login	auth	cmpe5ba810000m16kgcrcln4m	{"email": "am@medicine-2000.ru"}	2026-05-20 14:17:54.592
cmpe5cywl0006m16kipgp1qiz	cmpdz6zq70000qua72g7ns5dg	user.disable	user	cmpe5ba810000m16kgcrcln4m	{"email": "am@medicine-2000.ru"}	2026-05-20 14:18:18.165
cmpe5tunz0009m16kbryka79q	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 14:31:25.824
cmpe609q60000xr7y3fxrqqyw	cmpdz6zq70000qua72g7ns5dg	USER_DELETE	user	cmpe5ba810000m16kgcrcln4m	{"email": "am@medicine-2000.ru"}	2026-05-20 14:36:25.279
cmpe6fx870004zatukozb8qxl	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 14:48:35.575
cmpe6fxb50006zatuvq4mnsda	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe6fxb20005zatu3t20boo1	{"role": "OPERATOR", "email": "api-e2e-reuse-1779288515@test.local"}	2026-05-20 14:48:35.682
cmpe6fxcu0007zatuvf4szabz	cmpdz6zq70000qua72g7ns5dg	USER_DELETE	user	cmpe6fxb20005zatu3t20boo1	{"email": "api-e2e-reuse-1779288515@test.local"}	2026-05-20 14:48:35.743
cmpe6fxf70009zatu4hyx73ku	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe6fxf60008zatuonkit2z0	{"role": "OPERATOR", "email": "api-e2e-reuse-1779288515@test.local"}	2026-05-20 14:48:35.828
cmpe6fxgk000azatuuswgshrs	cmpdz6zq70000qua72g7ns5dg	USER_DELETE	user	cmpe6fxf60008zatuonkit2z0	{"email": "api-e2e-reuse-1779288515@test.local"}	2026-05-20 14:48:35.877
cmpe6jdj00002eityqwi75k87	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 14:51:16.669
cmpe6jdw50004eitypndcq1pt	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe6jdw20003eity5j2hxnmp	{"role": "OPERATOR", "email": "prod-verify-reuse@test.local"}	2026-05-20 14:51:17.141
cmpe6jdy40005eity5js29dve	cmpdz6zq70000qua72g7ns5dg	USER_DELETE	user	cmpe6jdw20003eity5j2hxnmp	{"email": "prod-verify-reuse@test.local"}	2026-05-20 14:51:17.212
cmpe6je0o0007eityh5bd9qas	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe6je0n0006eity4vane1iz	{"role": "OPERATOR", "email": "prod-verify-reuse@test.local"}	2026-05-20 14:51:17.304
cmpe6je260008eitymajq5qvj	cmpdz6zq70000qua72g7ns5dg	USER_DELETE	user	cmpe6je0n0006eity4vane1iz	{"email": "prod-verify-reuse@test.local"}	2026-05-20 14:51:17.359
cmpe6lgws000aeitytkgz3nc1	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpe6lgwq0009eityq7uocwm4	{"role": "ADMIN", "email": "am@medicine-2000.ru"}	2026-05-20 14:52:54.364
cmpe6lv2w000beityjwy89bvq	cmpdz6zq70000qua72g7ns5dg	auth.logout	auth	cmpdz6zq70000qua72g7ns5dg	\N	2026-05-20 14:53:12.729
cmpe7n6je0002r5k7okqvxncl	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:22:13.851
cmpe7nnpn0005r5k7x69ojnrc	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:22:36.107
cmpe7nnqc0006r5k7no2pihq3	cmpdz6zq70000qua72g7ns5dg	MAIL_SETTINGS_UPDATE	system_settings	default	{"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}, "passwordChanged": false}	2026-05-20 15:22:36.132
cmpe7pean0002jv5lylajm42n	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-20 15:23:57.216
cmpe7qetx0003jv5l79jzlye2	cmpe6lgwq0009eityq7uocwm4	MAIL_SETTINGS_UPDATE	system_settings	default	{"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}, "passwordChanged": true}	2026-05-20 15:24:44.565
cmpe7qhhp0004jv5lqh4h1fjn	cmpe6lgwq0009eityq7uocwm4	MAIL_TEST_FAILED	system_settings	default	{"to": "am@medicine-2000.ru", "message": "Ошибка SMTP — проверьте настройки и подключение"}	2026-05-20 15:24:48.014
cmpe7qsxt0005jv5l05uf6968	cmpe6lgwq0009eityq7uocwm4	MAIL_TEST_FAILED	system_settings	default	{"to": "am@medicine-2000.ru", "message": "Ошибка SMTP — проверьте настройки и подключение"}	2026-05-20 15:25:02.85
cmpe7wwbe0008jv5l0srykms7	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:29:47.162
cmpe7x48r000bjv5lofs5iktw	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:29:57.435
cmpe7x4du000cjv5li4o1ft7p	cmpdz6zq70000qua72g7ns5dg	MAIL_TEST_FAILED	system_settings	default	{"to": "am@medicine-2000.ru", "message": "Ошибка SMTP — проверьте настройки и подключение"}	2026-05-20 15:29:57.619
cmpe85bwh0002t700pwdptzbg	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:36:20.602
cmpe85c1c0003t700wxof7ctz	cmpdz6zq70000qua72g7ns5dg	MAIL_TEST_FAILED	system_settings	default	{"to": "am@medicine-2000.ru", "message": "SMTP auth failed (535): неверный логин или пароль приложения Яндекс. Создайте новый пароль приложения для ящика SMTP User и сохраните в настройках."}	2026-05-20 15:36:20.784
cmpe88mp30004t700smy7l3mj	cmpe6lgwq0009eityq7uocwm4	MAIL_SETTINGS_UPDATE	system_settings	default	{"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}, "passwordChanged": true}	2026-05-20 15:38:54.568
cmpe88q1m0007t700mccpa8qx	cmpe6lgwq0009eityq7uocwm4	MAIL_TEST_SUCCESS	system_settings	default	{"to": "am@medicine-2000.ru", "message": "Письмо успешно отправлено"}	2026-05-20 15:38:58.907
cmpe8aeyv0008t7000ke1lk08	cmpe6lgwq0009eityq7uocwm4	auth.logout	auth	cmpe6lgwq0009eityq7uocwm4	\N	2026-05-20 15:40:17.863
cmpe8b45c000bt700ed8rsrwb	cmpe6lgwq0009eityq7uocwm4	PASSWORD_RESET	user	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru", "source": "self_service"}	2026-05-20 15:40:50.497
cmpe8bkmj000et7005769cbqz	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-20 15:41:11.851
cmpe8c28h000gt700nflnrfoi	cmpe6lgwq0009eityq7uocwm4	user.create	user	cmpe8c28f000ft7005ljr56w2	{"role": "ADMIN", "email": "ds@medicine-2000.ru"}	2026-05-20 15:41:34.673
cmpe8c8qw000ht700c5xixf7w	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zqf0002qua7og3fmd74	{"email": "operator@med.local"}	2026-05-20 15:41:43.113
cmpe8c9i4000it70090dqwnly	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zqd0001qua7wn0v1ths	{"email": "manager@med.local"}	2026-05-20 15:41:44.092
cmpe8cao3000jt700ejbcviez	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-20 15:41:45.603
cmpef020q001at700m28ofplh	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-20 18:48:11.835
cmpef0xh6001et700zl5ou102	\N	lot.status.quarantine	lot	cmpe0tvo2000ezrd44mq4qiq4	{"status": "QUARANTINE"}	2026-05-20 18:48:52.603
cmpef15zl001it700ivyl479t	\N	lot.status.blocked	lot	cmpe10v2q000b8m1d7mvkp5i9	{"status": "BLOCKED"}	2026-05-20 18:49:03.634
cmpf6kcjz004ht700vqinjnqf	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-21 07:39:48.24
cmpf6kehk004it700cf2xmepl	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-21 07:39:50.745
cmpf6l1m8004jt700s8kbsfy6	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-21 07:40:20.72
cmpf6l1mp004kt700tv8isooo	cmpdz6zqd0001qua7wn0v1ths	auth.login_failed	auth	cmpdz6zqd0001qua7wn0v1ths	{"email": "manager@med.local", "reason": "disabled"}	2026-05-21 07:40:20.737
cmpf6l1nb004lt700jjfilhbx	cmpdz6zqf0002qua7og3fmd74	auth.login_failed	auth	cmpdz6zqf0002qua7og3fmd74	{"email": "operator@med.local", "reason": "disabled"}	2026-05-21 07:40:20.759
cmpf6l1ny004mt700zjoxyxu8	\N	auth.login_failed	auth	\N	{"email": "viewer@med.local", "reason": "unknown_user"}	2026-05-21 07:40:20.782
cmpf6lqla000221lumqeqs84y	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 07:40:53.086
cmpf6mamq000521luno2uvkft	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 07:41:19.058
cmpf6st6s000821lum5t3esqx	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 07:46:23.045
cmpf6zwi20002rygguz5nqlyy	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 07:51:53.93
cmpf7abjf0002oo6weronrozg	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 07:59:59.979
cmpf7abnx0004oo6wpbo0jdm5	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpf7abnv0003oo6wrotcesbq	{"role": "VIEWER", "email": "pilot-pwd-1779350399@med.local"}	2026-05-21 08:00:00.142
cmpf7abr30007oo6wxd9xrvjr	cmpf7abnv0003oo6wrotcesbq	auth.login	auth	cmpf7abnv0003oo6wrotcesbq	{"email": "pilot-pwd-1779350399@med.local"}	2026-05-21 08:00:00.255
cmpf7abu80008oo6w75g6ygqe	cmpdz6zq70000qua72g7ns5dg	user.password_reset	user	cmpf7abnv0003oo6wrotcesbq	{"email": "pilot-pwd-1779350399@med.local"}	2026-05-21 08:00:00.368
cmpf7abwk000boo6worvy9ard	cmpf7abnv0003oo6wrotcesbq	auth.login	auth	cmpf7abnv0003oo6wrotcesbq	{"email": "pilot-pwd-1779350399@med.local"}	2026-05-21 08:00:00.452
cmpf7ajl00005rygga0mvhvqu	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 08:00:10.405
cmpf7bn6o00029de7p3isywz2	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 08:01:01.728
cmpf7bnax00049de73hn08962	cmpdz6zq70000qua72g7ns5dg	user.create	user	cmpf7bnav00039de7k0xutha0	{"role": "VIEWER", "email": "pilot-pwd-1779350461@med.local"}	2026-05-21 08:01:01.882
cmpf7bne900079de7iqqv5h9m	cmpf7bnav00039de7k0xutha0	auth.login	auth	cmpf7bnav00039de7k0xutha0	{"email": "pilot-pwd-1779350461@med.local"}	2026-05-21 08:01:02.002
cmpf7bnhb00089de7jbanv2xu	cmpdz6zq70000qua72g7ns5dg	user.password_reset	user	cmpf7bnav00039de7k0xutha0	{"email": "pilot-pwd-1779350461@med.local"}	2026-05-21 08:01:02.111
cmpf7bnjq000b9de7nnk4lf84	cmpf7bnav00039de7k0xutha0	auth.login	auth	cmpf7bnav00039de7k0xutha0	{"email": "pilot-pwd-1779350461@med.local"}	2026-05-21 08:01:02.198
cmpf7c6ds000c9de73akj7i06	cmpe6lgwq0009eityq7uocwm4	USER_DELETE	user	cmpf7bnav00039de7k0xutha0	{"email": "pilot-pwd-1779350461@med.local"}	2026-05-21 08:01:26.609
cmpf7c851000d9de73liq67eo	cmpe6lgwq0009eityq7uocwm4	USER_DELETE	user	cmpf7abnv0003oo6wrotcesbq	{"email": "pilot-pwd-1779350399@med.local"}	2026-05-21 08:01:28.885
cmpf7cy2d000f9de7yvm4kx53	cmpe6lgwq0009eityq7uocwm4	user.create	user	cmpf7cy2c000e9de7xtf3doa3	{"role": "MANAGER", "email": "sklad@navitek.biz"}	2026-05-21 08:02:02.486
cmpf8ikt00002oxdtzxa17gbh	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-21 08:34:24.853
cmpf8l16g0008oxdtdx9h3ygt	\N	lot.status.quarantine	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "QUARANTINE"}	2026-05-21 08:36:19.385
cmpf8l471000coxdthuejfxpd	\N	lot.status.ok	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "OK"}	2026-05-21 08:36:23.293
cmpf8lcfz000goxdtw0z60ixf	\N	lot.status.blocked	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "BLOCKED"}	2026-05-21 08:36:33.984
cmpf8lhqf000koxdt819ehls7	\N	lot.status.ok	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "OK"}	2026-05-21 08:36:40.84
cmpf8lu5i000ooxdtaj5fqck8	\N	lot.status.blocked	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "BLOCKED"}	2026-05-21 08:36:56.934
cmpf8nhjv000soxdt4r5gfh6l	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpe10v2c00038m1da5d1yjvt	{"lines": [{"lotId": "cmpe10v2j00078m1dp1e0w710", "quantity": 100}], "references": ["ПЕР-0019"]}	2026-05-21 08:38:13.916
cmpf8p7o2000toxdtgruyd8b8	cmpf7cy2c000e9de7xtf3doa3	auth.logout	auth	cmpf7cy2c000e9de7xtf3doa3	\N	2026-05-21 08:39:34.418
cmpf8pjsm000woxdta0z6eari	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-21 08:39:50.135
cmpf8qw6k000xoxdth84lsbeh	cmpe6lgwq0009eityq7uocwm4	user.role_change	user	cmpf7cy2c000e9de7xtf3doa3	{"to": "ADMIN", "from": "MANAGER", "email": "sklad@navitek.biz"}	2026-05-21 08:40:52.844
cmpf8qytt000yoxdtot17qpib	cmpe6lgwq0009eityq7uocwm4	auth.logout	auth	cmpe6lgwq0009eityq7uocwm4	\N	2026-05-21 08:40:56.273
cmpf8r4s20011oxdt2zehsfte	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-21 08:41:03.986
cmpf9404t0014oxdtejgmt63v	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-21 08:51:04.493
cmpf94op00017oxdtqmvwe7p7	cmpe8c28f000ft7005ljr56w2	PASSWORD_RESET	user	cmpe8c28f000ft7005ljr56w2	{"email": "ds@medicine-2000.ru", "source": "self_service"}	2026-05-21 08:51:36.324
cmpf94wua001aoxdtlbhim1t1	cmpe8c28f000ft7005ljr56w2	auth.login	auth	cmpe8c28f000ft7005ljr56w2	{"email": "ds@medicine-2000.ru"}	2026-05-21 08:51:46.883
cmpf9trme001joxdtyx60xmcv	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-21 09:11:06.519
cmpfa4ljw001ooxdtgk2wdsth	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 09:19:31.868
cmpfa4st1001roxdt2476v0r7	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 09:19:41.27
cmpfa4sur001soxdt0uyi6i5q	cmpdz6zq70000qua72g7ns5dg	settings.update	system_settings	default	{"changes": {"fefoEnabled": false, "scannerDebounceMs": 500}}	2026-05-21 09:19:41.332
cmpfa8xul00047uvc8v70kszj	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 09:22:54.43
cmpfa8xw600057uvcyxduuhex	cmpdz6zq70000qua72g7ns5dg	settings.update	system_settings	default	{"changes": {"fefoEnabled": true, "uiCompactMode": true, "scannerDebounceMs": 450}}	2026-05-21 09:22:54.487
cmpfa8y4r00067uvcmwl8gxh9	cmpdz6zq70000qua72g7ns5dg	MAIL_SETTINGS_UPDATE	system_settings	default	{"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}, "passwordChanged": false}	2026-05-21 09:22:54.795
cmpfa9tut00097uvcxptjqtph	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 09:23:35.909
cmpfa9txr000a7uvcyvenswtw	cmpdz6zq70000qua72g7ns5dg	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 90, "scannerDebounceMs": 450, "expiryCriticalDays": 30, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:23:36.015
cmpfaeruk000f7uvcafcasjyr	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": true, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 90, "scannerDebounceMs": 450, "expiryCriticalDays": 30, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:27:26.588
cmpfaetx9000g7uvcnr6c0ei6	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 90, "scannerDebounceMs": 450, "expiryCriticalDays": 30, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:27:29.277
cmpfaeyg6000h7uvcmr2ua3t2	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 30, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:27:35.142
cmpfaf0x7000i7uvc83k59ljm	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:27:38.348
cmpfafct8000j7uvchz2eb8in	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": true, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:27:53.756
cmpfafjak000k7uvc1uue618j	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:28:02.156
cmpfafwzm000l7uvcagtz2cda	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": true, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:28:19.907
cmpfag0xg000m7uvctlz5gs6d	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:28:25.012
cmpfagaix000n7uvc5vmvu587	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 450, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:28:37.45
cmpfal24b000q7uvc5bmctzq7	cmpdz6zq70000qua72g7ns5dg	auth.login	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 09:32:19.836
cmpfal262000r7uvccmbxedir	cmpdz6zq70000qua72g7ns5dg	settings.update	system_settings	default	{"changes": {"fefoEnabled": false, "scannerDebounceMs": 300}}	2026-05-21 09:32:19.898
cmpfkyabm0002jzrrb7lrmztt	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-21 14:22:33.155
cmpfbawpg000ath6nvudxodfm	cmpf7cy2c000e9de7xtf3doa3	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 09:52:25.877
cmpfd207y000mv4chx0k6rw3s	\N	product.quick_create	product	cmpfd207r000kv4chvmc61n7j	{"sku": "FM-EK0004(2300)A", "name": "Нож эндоскопический электрохирургический ClearCut", "barcode": "01088093273511521729040510002600А8"}	2026-05-21 10:41:29.758
cmpfd2oi2000wv4chzhb93evj	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfd2oho000pv4chvwse0p63	{"quantity": 2, "lotNumber": "002600F8", "productId": "cmpfd207r000kv4chvmc61n7j"}	2026-05-21 10:42:01.226
cmpfd48og0011v4ch1k9hlbok	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-21 10:43:14.033
cmpfd751y0015v4chm7iu3zm3	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 1}], "references": ["ПЕР-0021"]}	2026-05-21 10:45:29.302
cmpfdexdh0016v4ch49l7g2fi	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 10:51:32.597
cmpfg9ca90005vqmuo7loced1	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 1}], "references": ["ПЕР-0022"], "writeOffComment": "тест", "writeOffDestination": "OTHER", "writeOffDestinationLabel": "Другое: тест"}	2026-05-21 12:11:10.833
cmpfhim8v0006strvx867fm1z	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "invalid_password"}	2026-05-21 12:46:23.263
cmpfhjm3z0007strv4m6zazpi	cmpe6lgwq0009eityq7uocwm4	writeoff_destination.delete	writeoff_destination	wod_department	{"name": "Отделение / кабинет"}	2026-05-21 12:47:09.744
cmpfhk0af0009strvdvax4jnk	cmpe6lgwq0009eityq7uocwm4	writeoff_destination.create	writeoff_destination	cmpfhk0ad0008strv6345lbu6	{"name": "Больница №"}	2026-05-21 12:47:28.119
cmpfhk9m1000astrv2b8jekoo	cmpe6lgwq0009eityq7uocwm4	writeoff_destination.delete	writeoff_destination	cmpfhk0ad0008strv6345lbu6	{"name": "Больница №"}	2026-05-21 12:47:40.202
cmpfii3yy000mstrvok9sjfzr	cmpf7cy2c000e9de7xtf3doa3	writeoff_destination.create	writeoff_destination	cmpfii3yx000lstrvkacz7ks2	{"name": "ДГБ 2"}	2026-05-21 13:13:59.195
cmpfijgb4000wstrvz1z50k18	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfd2oho000pv4chvwse0p63	{"quantity": 100, "lotNumber": "002600F8", "productId": "cmpfd207r000kv4chvmc61n7j"}	2026-05-21 13:15:01.841
cmpfikak0000ystrve5zgosxj	cmpf7cy2c000e9de7xtf3doa3	writeoff_destination.create	writeoff_destination	cmpfikajy000xstrvk9e0lrz6	{"name": "ЛОКБ"}	2026-05-21 13:15:41.04
cmpfilrbb0014strvjekqdlzh	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 15}], "references": ["ПЕР-0024"], "writeOffComment": "сАНТЬЯГГО", "writeOffDestinationId": "cmpfikajy000xstrvk9e0lrz6", "writeOffDestinationLabel": "ЛОКБ: сАНТЬЯГГО"}	2026-05-21 13:16:49.415
cmpfin0dz001estrvxb6x59r2	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfin0dq0017strv4srq0tbd	{"quantity": 10, "lotNumber": "222228", "productId": "cmpfd207r000kv4chvmc61n7j"}	2026-05-21 13:17:47.831
cmpfio96v001fstrv3bw2cvry	cmpf7cy2c000e9de7xtf3doa3	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": false, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 13:18:45.895
cmpfj87o60002131nn9ro9lqq	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 13:34:17.046
cmpfj8nqb0003131n5cm4ubd3	cmpe6lgwq0009eityq7uocwm4	settings.update	system_settings	default	{"changes": {"fefoStrict": true, "fefoEnabled": false, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}}	2026-05-21 13:34:37.86
cmpfj97rc0006131nzltpzrpt	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-21 13:35:03.817
cmpfja9u5000c131n3i90xnyb	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 3}, {"lotId": "cmpfin0dq0017strv4srq0tbd", "quantity": 3}], "references": ["ПЕР-0026", "ПЕР-0027"], "writeOffComment": "КУЗЬМ БЕЗ ДОКОВ", "writeOffDestinationId": "cmpfikajy000xstrvk9e0lrz6", "writeOffDestinationLabel": "ЛОКБ: КУЗЬМ БЕЗ ДОКОВ"}	2026-05-21 13:35:53.166
cmpfjj1kk000m131n6meeaz06	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfjj1ka000f131n7q686emm	{"quantity": 10, "lotNumber": "123456789", "productId": "cmpfd207r000kv4chvmc61n7j"}	2026-05-21 13:42:42.357
cmpfkm1j7001a131nb6534fqc	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfkm1iz0013131nwrtm69kw	{"quantity": 20, "lotNumber": "111111111111", "productId": "cmpfd207r000kv4chvmc61n7j"}	2026-05-21 14:13:01.891
cmpfkotm9001g131nr7f5qb6b	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 82}, {"lotId": "cmpfkm1iz0013131nwrtm69kw", "quantity": 20}], "references": ["ПЕР-0030", "ПЕР-0031"], "writeOffComment": "КУЗЬМ БЕЗ ДОКОВ", "writeOffDestinationId": "cmpfikajy000xstrvk9e0lrz6", "writeOffDestinationLabel": "ЛОКБ: КУЗЬМ БЕЗ ДОКОВ"}	2026-05-21 14:15:11.601
cmpfkzvun0008jzrrhr74otfh	cmpf7cy2c000e9de7xtf3doa3	expected_receipt.create	expected_receipt	cmpfkzvuj0006jzrrrxkhn2kk	{"productId": "cmpfd207r000kv4chvmc61n7j", "orderedQty": 50}	2026-05-21 14:23:47.712
cmpfl1901000ijzrrewk3t5wc	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfd2oho000pv4chvwse0p63	{"quantity": 35, "lotNumber": "002600F8", "productId": "cmpfd207r000kv4chvmc61n7j", "expectedReceiptId": "cmpfkzvuj0006jzrrrxkhn2kk"}	2026-05-21 14:24:51.409
cmpfl2s13000sjzrrw0givjfb	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpfd2oho000pv4chvwse0p63	{"quantity": 15, "lotNumber": "002600F8", "productId": "cmpfd207r000kv4chvmc61n7j", "expectedReceiptId": "cmpfkzvuj0006jzrrrxkhn2kk"}	2026-05-21 14:26:02.727
cmpfl6gyf0010jzrrjcpy6t0p	cmpf7cy2c000e9de7xtf3doa3	user.create	user	cmpfl6gyd000zjzrra4c7q7u0	{"role": "VIEWER", "email": "ekaterina.s@navitek.biz"}	2026-05-21 14:28:54.999
cmpfl898x0011jzrr42ijtc1k	\N	auth.login_failed	auth	\N	{"email": "ekaterina.s@medicine-2000.ru", "reason": "unknown_user"}	2026-05-21 14:30:18.322
cmpfl8i1g0014jzrrh7bbjpv3	cmpfl6gyd000zjzrra4c7q7u0	auth.login	auth	cmpfl6gyd000zjzrra4c7q7u0	{"email": "ekaterina.s@navitek.biz"}	2026-05-21 14:30:29.716
cmpfl97vm0018jzrr1z8w6i3x	cmpf7cy2c000e9de7xtf3doa3	expected_receipt.create	expected_receipt	cmpfl97vh0016jzrriu6ymtcw	{"productId": "cmpfd207r000kv4chvmc61n7j", "orderedQty": 10}	2026-05-21 14:31:03.202
cmpfl9af4001cjzrrmv8rdh0s	cmpf7cy2c000e9de7xtf3doa3	expected_receipt.close	expected_receipt	cmpfl97vh0016jzrriu6ymtcw	\N	2026-05-21 14:31:06.496
cmpfl9vby001gjzrr8e3ucjt5	cmpf7cy2c000e9de7xtf3doa3	expected_receipt.create	expected_receipt	cmpfl9vbv001ejzrrs2hks1vu	{"productId": "cmpfd207r000kv4chvmc61n7j", "orderedQty": 10}	2026-05-21 14:31:33.599
cmpfl9x0a001kjzrrfrp7xhwt	cmpf7cy2c000e9de7xtf3doa3	expected_receipt.cancel	expected_receipt	cmpfl9vbv001ejzrrs2hks1vu	\N	2026-05-21 14:31:35.771
cmpflc9zh001ojzrrno1y5ad7	cmpe6lgwq0009eityq7uocwm4	expected_receipt.create	expected_receipt	cmpflc9zd001mjzrr4goa1xq1	{"productId": "cmpfd207r000kv4chvmc61n7j", "orderedQty": 10}	2026-05-21 14:33:25.901
cmpfu67tj0057jzrrcv9pk5fw	\N	auth.login_failed	auth	\N	{"email": "am@medciine-2000.ru", "reason": "unknown_user"}	2026-05-21 18:40:39.703
cmpfu6azy0058jzrr0mxpwvk3	\N	auth.login_failed	auth	\N	{"email": "am@medcine-2000.ru", "reason": "unknown_user"}	2026-05-21 18:40:43.823
cmpfu6d54005bjzrrxx85itxs	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-21 18:40:46.6
cmpfufezb005ijzrr4fyliah9	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zqf0002qua7og3fmd74	{"email": "operator@med.local"}	2026-05-21 18:47:48.887
cmpfuffme005jjzrr745q7kuv	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zqd0001qua7wn0v1ths	{"email": "manager@med.local"}	2026-05-21 18:47:49.718
cmpfufhue005kjzrrwsuc8mil	cmpe6lgwq0009eityq7uocwm4	user.disable	user	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local"}	2026-05-21 18:47:52.598
cmpgl4qk7000248tr61s12ple	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 07:15:20.312
cmpgnxa2f0002qkcagtnaw866	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 08:33:31.192
cmpgpablv000hqkcaszga0ldg	\N	product.quick_create	product	cmpgpablr000fqkcazam971bt	{"sku": "M00546620", "name": "Autolith Bipolar Electrohydraulic Lithotripter Probe", "barcode": "0100817183020448172803131018563"}	2026-05-22 09:11:39.331
cmpgpazfr000rqkcam1z1oflr	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpgpazfk000kqkcauqakdy9p	{"quantity": 1, "lotNumber": "18563", "productId": "cmpgpablr000fqkcazam971bt", "expectedReceiptId": null}	2026-05-22 09:12:10.216
cmpgpdevw000vqkca8qplwk6u	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpgpablr000fqkcazam971bt	{"lines": [{"lotId": "cmpgpazfk000kqkcauqakdy9p", "quantity": 1}], "references": ["ПЕР-0035"], "writeOffComment": "tests", "writeOffDestinationId": "wod_other", "writeOffDestinationLabel": "Другое: tests"}	2026-05-22 09:14:03.549
cmpgph0yl000yqkcasi95dos4	\N	product.quick_create	product	cmpgph0yh000wqkcab1dviulk	{"sku": "ВАФЕЛЬКА", "name": "GOODMIX CHOKOLATE", "barcode": "4600680032160"}	2026-05-22 09:16:52.125
cmpgphjb60018qkca3g9hnlx9	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpgphjav0011qkcahapfwynd	{"quantity": 25, "lotNumber": "1", "productId": "cmpgph0yh000wqkcab1dviulk", "expectedReceiptId": null}	2026-05-22 09:17:15.907
cmpgpih0z001cqkcaerhem10m	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpgph0yh000wqkcab1dviulk	{"lines": [{"lotId": "cmpgphjav0011qkcahapfwynd", "quantity": 2}], "references": ["ПЕР-0037"], "writeOffComment": "Съел", "writeOffDestinationId": "wod_internal", "writeOffDestinationLabel": "Внутреннее потребление: Съел"}	2026-05-22 09:17:59.604
cmpgpk100001qqkcavgh82wzv	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpgpk0zu001jqkcas2xnvqgp	{"quantity": 10, "lotNumber": "2", "productId": "cmpgph0yh000wqkcab1dviulk", "expectedReceiptId": null}	2026-05-22 09:19:12.144
cmpgpku1d001wqkcat750m1cw	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff	product	cmpgph0yh000wqkcab1dviulk	{"lines": [{"lotId": "cmpgphjav0011qkcahapfwynd", "quantity": 3}, {"lotId": "cmpgpk0zu001jqkcas2xnvqgp", "quantity": 5}], "references": ["ПЕР-0039", "ПЕР-0040"], "writeOffComment": "Съел", "writeOffDestinationId": "wod_internal", "writeOffDestinationLabel": "Внутреннее потребление: Съел"}	2026-05-22 09:19:49.778
cmpgpmppf0026qkca2t4fldrw	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpgpmpp6001zqkcajduswemo	{"quantity": 5, "lotNumber": "3", "productId": "cmpgph0yh000wqkcab1dviulk", "expectedReceiptId": null}	2026-05-22 09:21:17.475
cmpguzscg000w60xby1yh38c1	cmpfl6gyd000zjzrra4c7q7u0	auth.login	auth	cmpfl6gyd000zjzrra4c7q7u0	{"email": "ekaterina.s@navitek.biz"}	2026-05-22 11:51:25.504
cmpgv0j1l000x60xbkg5sg3qk	cmpfl6gyd000zjzrra4c7q7u0	auth.logout	auth	cmpfl6gyd000zjzrra4c7q7u0	\N	2026-05-22 11:52:00.105
cmpgv0wqy001060xb4ann5sn7	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 11:52:17.867
cmpgv4ry0001c60xb2hh3bat2	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff	product	cmpgph0yh000wqkcab1dviulk	{"lines": [{"lotId": "cmpgphjav0011qkcahapfwynd", "quantity": 20}, {"lotId": "cmpgpk0zu001jqkcas2xnvqgp", "quantity": 5}], "references": ["ПЕР-0042", "ПЕР-0043"], "writeOffComment": null, "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}	2026-05-22 11:55:18.265
cmpgv9yo6001g60xbcmxmiqd4	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff	product	cmpfd207r000kv4chvmc61n7j	{"lines": [{"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 3}], "references": ["ПЕР-0044"], "writeOffComment": null, "writeOffDestinationId": "cmpfikajy000xstrvk9e0lrz6", "writeOffDestinationLabel": "ЛОКБ"}	2026-05-22 11:59:20.262
cmpgvev02001o60xby13dgz7k	cmpe6lgwq0009eityq7uocwm4	inventory.receive	lot	cmpfjj1ka000f131n7q686emm	{"quantity": 10, "lotNumber": "123456789", "productId": "cmpfd207r000kv4chvmc61n7j", "expectedReceiptId": "cmpflc9zd001mjzrr4goa1xq1"}	2026-05-22 12:03:08.786
cmpgvkz4c001v60xblmwj16x5	cmpfl6gyd000zjzrra4c7q7u0	auth.login	auth	cmpfl6gyd000zjzrra4c7q7u0	{"email": "ekaterina.s@navitek.biz"}	2026-05-22 12:07:54.06
cmpgw8z8k0002r7ngyt98i9xa	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 12:26:33.956
cmpgzfggk000054n52k8ydclg	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-22 13:55:35.06
cmph07u1i000268nlw8ky6mxm	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 14:17:39.03
cmph0suq70002fxr2xxvlcxvv	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 14:33:59.695
cmph1pdi70000x931d0wlvds1	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-22 14:59:17.023
cmph1pfjw0001x931ob5902q7	cmpdz6zqf0002qua7og3fmd74	auth.login_failed	auth	cmpdz6zqf0002qua7og3fmd74	{"email": "operator@med.local", "reason": "disabled"}	2026-05-22 14:59:19.677
cmph1pfk80002x931dnxr4f6h	cmpdz6zqd0001qua7wn0v1ths	auth.login_failed	auth	cmpdz6zqd0001qua7wn0v1ths	{"email": "manager@med.local", "reason": "disabled"}	2026-05-22 14:59:19.689
cmph1pfkm0003x931gamx3vzy	cmpdz6zq70000qua72g7ns5dg	auth.login_failed	auth	cmpdz6zq70000qua72g7ns5dg	{"email": "admin@med.local", "reason": "disabled"}	2026-05-22 14:59:19.702
cmph1qbmk0007x931tv06cn2d	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.batch	writeoff_batch	ПЕР-0046	{"items": [{"lines": [{"lotId": "cmpgpmpp6001zqkcajduswemo", "quantity": 2}], "productId": "cmpgph0yh000wqkcab1dviulk", "references": ["ПЕР-0046"], "writeOffComment": null, "operationGroupId": null, "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}], "itemCount": 1, "lineCount": 1, "references": ["ПЕР-0046"], "operationGroupId": null}	2026-05-22 15:00:01.245
cmph1wg1i000cx931e7cffbyl	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 15:04:46.902
cmph1xaz6000ox931yn7iye1g	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.batch	writeoff_batch	f403decd-063b-423b-a467-4cf64a032cb6	{"items": [{"lines": [{"lotId": "cmpe10v2j00078m1dp1e0w710", "quantity": 1}, {"lotId": "cmpe178qa000edzs0z8wbpp6y", "quantity": 2}, {"lotId": "cmpe190zi000g5iox88qpk98e", "quantity": 3}], "productId": "cmpe10v2c00038m1da5d1yjvt", "references": ["ПЕР-0047", "ПЕР-0048", "ПЕР-0049"], "writeOffComment": null, "operationGroupId": "f403decd-063b-423b-a467-4cf64a032cb6", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}, {"lines": [{"lotId": "cmpe10v34000t8m1dux09rrjt", "quantity": 5}], "productId": "cmpe10v32000p8m1dz7po43yk", "references": ["ПЕР-0050"], "writeOffComment": "123", "operationGroupId": "f403decd-063b-423b-a467-4cf64a032cb6", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2: 123"}, {"lines": [{"lotId": "cmpgpmpp6001zqkcajduswemo", "quantity": 1}], "productId": "cmpgph0yh000wqkcab1dviulk", "references": ["ПЕР-0051"], "writeOffComment": "123", "operationGroupId": "f403decd-063b-423b-a467-4cf64a032cb6", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2: 123"}], "itemCount": 3, "lineCount": 5, "references": ["ПЕР-0047", "ПЕР-0048", "ПЕР-0049", "ПЕР-0050", "ПЕР-0051"], "operationGroupId": "f403decd-063b-423b-a467-4cf64a032cb6"}	2026-05-22 15:05:26.994
cmph23grl000px931p275lmfj	cmpe6lgwq0009eityq7uocwm4	auth.logout	auth	cmpe6lgwq0009eityq7uocwm4	\N	2026-05-22 15:10:14.433
cmph23l3b000sx9312hb1bto4	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 15:10:20.04
cmph2sbkx00033jich9r93g8a	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.correct	writeoff_correction	f403decd-063b-423b-a467-4cf64a032cb6	{"additions": [], "editReason": "Клиент поменял заказ", "operationGroupId": "f403decd-063b-423b-a467-4cf64a032cb6", "updatedReferences": ["ПЕР-0051"], "correctionSessionId": "854d6568-693c-490a-a11f-e9689107a48e", "correctionReferences": ["ПЕР-0052"]}	2026-05-22 15:29:34.114
cmph8jv46000610ae8n6weo28	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 18:10:57.223
cmph9roay000h10aedjksd3hk	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-22 18:45:01.258
cmpiq95y200c510ae09155lkn	\N	lot.status.ok	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "OK"}	2026-05-23 19:14:17.307
cmpiq96sq00c910aedqezcisb	\N	lot.status.blocked	lot	cmpe10v3c00178m1dy3lsz9oq	{"status": "BLOCKED"}	2026-05-23 19:14:18.41
cmpiqdzch00cn10ae3o81w6vk	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.batch	writeoff_batch	2e5c6853-c187-4986-9841-b5d965e57ee9	{"items": [{"lines": [{"lotId": "cmpe10v2j00078m1dp1e0w710", "quantity": 1}, {"lotId": "cmpe178qa000edzs0z8wbpp6y", "quantity": 1}, {"lotId": "cmpe190zi000g5iox88qpk98e", "quantity": 1}], "productId": "cmpe10v2c00038m1da5d1yjvt", "references": ["ПЕР-0055", "ПЕР-0056", "ПЕР-0057"], "writeOffComment": "тест", "operationGroupId": "2e5c6853-c187-4986-9841-b5d965e57ee9", "writeOffDestinationId": "wod_samples", "writeOffDestinationLabel": "Тест / образцы: тест"}, {"lines": [{"lotId": "cmpfjj1ka000f131n7q686emm", "quantity": 1}, {"lotId": "cmpfd2oho000pv4chvwse0p63", "quantity": 1}, {"lotId": "cmpfin0dq0017strv4srq0tbd", "quantity": 1}], "productId": "cmpfd207r000kv4chvmc61n7j", "references": ["ПЕР-0058", "ПЕР-0059", "ПЕР-0060"], "writeOffComment": "тест", "operationGroupId": "2e5c6853-c187-4986-9841-b5d965e57ee9", "writeOffDestinationId": "wod_samples", "writeOffDestinationLabel": "Тест / образцы: тест"}], "itemCount": 2, "lineCount": 6, "references": ["ПЕР-0055", "ПЕР-0056", "ПЕР-0057", "ПЕР-0058", "ПЕР-0059", "ПЕР-0060"], "operationGroupId": "2e5c6853-c187-4986-9841-b5d965e57ee9"}	2026-05-23 19:18:02.034
cmpiqf4rx00ct10aeifqvsgwr	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.correct	writeoff_correction	2e5c6853-c187-4986-9841-b5d965e57ee9	{"additions": [], "editReason": "Клиент попросил больше", "operationGroupId": "2e5c6853-c187-4986-9841-b5d965e57ee9", "updatedReferences": ["ПЕР-0057", "ПЕР-0055"], "correctionSessionId": "05978ed9-387f-41ec-ac59-eb58a66dceca", "correctionReferences": ["ПЕР-0061", "ПЕР-0062"]}	2026-05-23 19:18:55.725
cmpirgcdv00d710aehp7mfuzh	cmpe6lgwq0009eityq7uocwm4	expected_receipt.create	expected_receipt	cmpirgcdm00d510aeia5idt4q	{"productId": "cmpfd207r000kv4chvmc61n7j", "orderedQty": 5}	2026-05-23 19:47:51.86
cmpirih5g00dr10ae8amjhuii	cmpe6lgwq0009eityq7uocwm4	inventory.receive	lot	cmpirih5500dk10aeojky3a8p	{"quantity": 5, "lotNumber": "123123123", "productId": "cmpfd207r000kv4chvmc61n7j", "expectedReceiptId": "cmpirgcdm00d510aeia5idt4q"}	2026-05-23 19:49:31.349
cmpkv9z0900um10ae4b0rqgz5	cmpfl6gyd000zjzrra4c7q7u0	auth.login	auth	cmpfl6gyd000zjzrra4c7q7u0	{"email": "ekaterina.s@navitek.biz"}	2026-05-25 07:10:25.401
cmpkvmogq00ur10aecfyot4bc	cmpe6lgwq0009eityq7uocwm4	user.password_reset	user	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-25 07:20:18.267
cmpkvmzp100uu10aemle3hjqu	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-25 07:20:32.821
cmpkvrowm00ux10ae16647sym	\N	product.quick_create	product	cmpkvrowi00uv10aevpyo6amj	{"sku": "322", "name": "Сырники", "barcode": "4630446153358"}	2026-05-25 07:24:12.118
cmpkvs20n00v710ae70lekv5k	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpkvs20g00v010aeoc2r4kvy	{"quantity": 50, "lotNumber": "100", "productId": "cmpkvrowi00uv10aevpyo6amj", "expectedReceiptId": null}	2026-05-25 07:24:29.112
cmpkvsmn900vh10aeg1rbl3gn	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpkvsmn300va10ae2o17jm7k	{"quantity": 40, "lotNumber": "1666", "productId": "cmpgph0yh000wqkcab1dviulk", "expectedReceiptId": null}	2026-05-25 07:24:55.845
cmpkvts7o00vp10ae0a13ians	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff.batch	writeoff_batch	449d6dbd-f3aa-4135-9486-a04f3e5b4703	{"items": [{"lines": [{"lotId": "cmpkvs20g00v010aeoc2r4kvy", "quantity": 22}], "productId": "cmpkvrowi00uv10aevpyo6amj", "references": ["ПЕР-0066"], "writeOffComment": null, "operationGroupId": "449d6dbd-f3aa-4135-9486-a04f3e5b4703", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}, {"lines": [{"lotId": "cmpgpmpp6001zqkcajduswemo", "quantity": 1}, {"lotId": "cmpkvsmn300va10ae2o17jm7k", "quantity": 32}], "productId": "cmpgph0yh000wqkcab1dviulk", "references": ["ПЕР-0067", "ПЕР-0068"], "writeOffComment": null, "operationGroupId": "449d6dbd-f3aa-4135-9486-a04f3e5b4703", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}], "itemCount": 2, "lineCount": 3, "references": ["ПЕР-0066", "ПЕР-0067", "ПЕР-0068"], "operationGroupId": "449d6dbd-f3aa-4135-9486-a04f3e5b4703"}	2026-05-25 07:25:49.716
cmpkvv64t00vz10aenro5vpp1	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff.correct	writeoff_correction	449d6dbd-f3aa-4135-9486-a04f3e5b4703	{"additions": [], "editReason": "косяк склад", "operationGroupId": "449d6dbd-f3aa-4135-9486-a04f3e5b4703", "updatedReferences": ["ПЕР-0068", "ПЕР-0066"], "correctionSessionId": "55a071b3-c065-44a9-8d5c-e9732e91efa7", "correctionReferences": ["ПЕР-0069", "ПЕР-0070"]}	2026-05-25 07:26:54.414
cmpkx5wcs00wl10aekdx6euk5	cmpe6lgwq0009eityq7uocwm4	inventory.writeoff.correct	writeoff_correction	449d6dbd-f3aa-4135-9486-a04f3e5b4703	{"additions": [], "editReason": "Менеджер ошибся", "operationGroupId": "449d6dbd-f3aa-4135-9486-a04f3e5b4703", "updatedReferences": ["ПЕР-0068"], "correctionSessionId": "4abb851a-45bb-4aa7-a98d-e4a1197732f8", "correctionReferences": ["ПЕР-0071"]}	2026-05-25 08:03:14.572
\.


--
-- Data for Name: barcode_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.barcode_records (id, barcode, product_id, lot_id, created_at, updated_at) FROM stdin;
cmpe0j5js0003zrd41gu53s5s	1010101111100011010011	cmpe0j5js0002zrd4icojhvzh	\N	2026-05-20 12:03:08.633	2026-05-20 12:03:08.633
cmpe0tvmi000bzrd4e37kxqtg	1234567890123	cmpe0tvmi000azrd4rq39dn2g	\N	2026-05-20 12:11:28.987	2026-05-20 12:11:28.987
cmpe10v2w000g8m1diobixppq	011021000	cmpe10v2v000e8m1dchq6dvsw	\N	2026-05-20 12:16:54.873	2026-05-20 12:16:54.873
cmpe10v33000r8m1dhpgwn3uv	099311000	cmpe10v32000p8m1dz7po43yk	\N	2026-05-20 12:16:54.88	2026-05-20 12:16:54.88
cmpe10v37000y8m1davq995mc	022341000	cmpe10v36000w8m1dxjttui57	\N	2026-05-20 12:16:54.884	2026-05-20 12:16:54.884
cmpe10v3b00158m1du990fqxg	066321000	cmpe10v3b00138m1dfblshukq	\N	2026-05-20 12:16:54.888	2026-05-20 12:16:54.888
cmpe10v3f001c8m1dc9fekd32	044211000	cmpe10v3e001a8m1di7jbqpjq	\N	2026-05-20 12:16:54.891	2026-05-20 12:16:54.891
cmpe16hdn0003dzs0z9g9bqlj	999676979	cmpe16hdn0002dzs05jflxk34	\N	2026-05-20 12:21:17.052	2026-05-20 12:21:17.052
cmpe18x9900055iox4cxnxutu	999788746	cmpe18vlu00025ioxy7v543xq	\N	2026-05-20 12:23:10.942	2026-05-20 12:23:10.942
cmpe10v2f00058m1dcj9nmwpn	088421000	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	2026-05-20 12:16:54.856	2026-05-20 12:23:15.778
cmpe1c0ad000t5iox2j24ph7d	22020202202202022020	cmpe1c0ad000s5iox7m9anfrn	\N	2026-05-20 12:25:34.838	2026-05-20 12:25:34.838
cmpgpablr000gqkcaqf91d4sj	0100817183020448172803131018563	cmpgpablr000fqkcazam971bt	cmpgpazfk000kqkcauqakdy9p	2026-05-22 09:11:39.328	2026-05-22 09:12:10.212
cmpgveuzy001l60xbv2fx59y7	002600F8	cmpfd207r000kv4chvmc61n7j	cmpfjj1ka000f131n7q686emm	2026-05-22 12:03:08.783	2026-05-22 12:03:08.783
cmpfd207r000lv4charlqtetu	01088093273511521729040510002600А8	cmpfd207r000kv4chvmc61n7j	cmpirih5500dk10aeojky3a8p	2026-05-21 10:41:29.752	2026-05-23 19:49:31.343
cmpkvrowi00uw10ae1eakeynb	4630446153358	cmpkvrowi00uv10aevpyo6amj	cmpkvs20g00v010aeoc2r4kvy	2026-05-25 07:24:12.114	2026-05-25 07:24:29.108
cmpgph0yh000xqkcaj3bcxx1x	4600680032160	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	2026-05-22 09:16:52.122	2026-05-25 07:24:55.843
\.


--
-- Data for Name: expected_receipt_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expected_receipt_events (id, expected_receipt_id, type, quantity, message, actor_email, created_at) FROM stdin;
cmpfkzvuj0007jzrr4ordk0j0	cmpfkzvuj0006jzrrrxkhn2kk	CREATED	50.0000	МОКОЛ	sklad@navitek.biz	2026-05-21 14:23:47.707
cmpfl1904000kjzrrzxonyz7d	cmpfkzvuj0006jzrrrxkhn2kk	RECEIVED	35.0000	\N	sklad@navitek.biz	2026-05-21 14:24:51.412
cmpfl2s15000ujzrrhc831bfe	cmpfkzvuj0006jzrrrxkhn2kk	RECEIVED	15.0000	\N	sklad@navitek.biz	2026-05-21 14:26:02.73
cmpfl2s16000wjzrr8ex2p6fm	cmpfkzvuj0006jzrrrxkhn2kk	CLOSED	\N	\N	sklad@navitek.biz	2026-05-21 14:26:02.731
cmpfl97vi0017jzrrgj9qgchl	cmpfl97vh0016jzrriu6ymtcw	CREATED	10.0000	tju	sklad@navitek.biz	2026-05-21 14:31:03.198
cmpfl9af0001bjzrrhk1rid3c	cmpfl97vh0016jzrriu6ymtcw	CLOSED	\N	\N	sklad@navitek.biz	2026-05-21 14:31:06.493
cmpfl9vbv001fjzrrezj5w5ns	cmpfl9vbv001ejzrrs2hks1vu	CREATED	10.0000	opio	sklad@navitek.biz	2026-05-21 14:31:33.596
cmpfl9x07001jjzrrdponykpa	cmpfl9vbv001ejzrrs2hks1vu	CANCELLED	\N	\N	sklad@navitek.biz	2026-05-21 14:31:35.767
cmpflc9zd001njzrrcf3scref	cmpflc9zd001mjzrr4goa1xq1	CREATED	10.0000	11111	am@medicine-2000.ru	2026-05-21 14:33:25.898
cmpgvev05001q60xb8rp1hf45	cmpflc9zd001mjzrr4goa1xq1	RECEIVED	10.0000	\N	am@medicine-2000.ru	2026-05-22 12:03:08.789
cmpgvev06001s60xbjxwhyvwu	cmpflc9zd001mjzrr4goa1xq1	CLOSED	\N	\N	am@medicine-2000.ru	2026-05-22 12:03:08.791
cmpirgcdm00d610aexalmkgvp	cmpirgcdm00d510aeia5idt4q	CREATED	5.0000	тест	am@medicine-2000.ru	2026-05-23 19:47:51.851
cmpirih5k00dt10aexthgb0sp	cmpirgcdm00d510aeia5idt4q	RECEIVED	5.0000	\N	am@medicine-2000.ru	2026-05-23 19:49:31.352
cmpirih5l00dv10aerhy3nl7a	cmpirgcdm00d510aeia5idt4q	CLOSED	\N	\N	am@medicine-2000.ru	2026-05-23 19:49:31.354
\.


--
-- Data for Name: expected_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expected_receipts (id, product_id, ordered_qty, received_qty, status, comment, created_by, created_at, updated_at) FROM stdin;
cmpfkzvuj0006jzrrrxkhn2kk	cmpfd207r000kv4chvmc61n7j	50.0000	50.0000	RECEIVED	МОКОЛ	sklad@navitek.biz	2026-05-21 14:23:47.707	2026-05-21 14:26:02.732
cmpfl97vh0016jzrriu6ymtcw	cmpfd207r000kv4chvmc61n7j	10.0000	0.0000	RECEIVED	tju	sklad@navitek.biz	2026-05-21 14:31:03.198	2026-05-21 14:31:06.494
cmpfl9vbv001ejzrrs2hks1vu	cmpfd207r000kv4chvmc61n7j	10.0000	0.0000	CANCELLED	opio	sklad@navitek.biz	2026-05-21 14:31:33.596	2026-05-21 14:31:35.768
cmpflc9zd001mjzrr4goa1xq1	cmpfd207r000kv4chvmc61n7j	10.0000	10.0000	RECEIVED	11111	am@medicine-2000.ru	2026-05-21 14:33:25.898	2026-05-22 12:03:08.792
cmpirgcdm00d510aeia5idt4q	cmpfd207r000kv4chvmc61n7j	5.0000	5.0000	RECEIVED	тест	am@medicine-2000.ru	2026-05-23 19:47:51.851	2026-05-23 19:49:31.354
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_items (id, product_id, lot_id, quantity, location, created_at, updated_at, reserved_quantity) FROM stdin;
cmpe10v2u000d8m1d6htnqxhk	cmpe10v2c00038m1da5d1yjvt	cmpe10v2q000b8m1d7mvkp5i9	10400.0000	Зона B-04	2026-05-20 12:16:54.87	2026-05-20 12:16:54.87	0.0000
cmpe10v2z000k8m1dx8ugmn15	cmpe10v2v000e8m1dchq6dvsw	cmpe10v2y000i8m1d8p9tmwjz	400.0000	Зона C-01	2026-05-20 12:16:54.876	2026-05-20 12:16:54.876	0.0000
cmpe10v32000o8m1d592m85dt	cmpe10v2v000e8m1dchq6dvsw	cmpe10v30000m8m1d49k9zged	2000.0000	Зона C-02	2026-05-20 12:16:54.878	2026-05-20 12:16:54.878	0.0000
cmpe10v3a00128m1dig8qi6kk	cmpe10v36000w8m1dxjttui57	cmpe10v3800108m1d8i87srsx	8900.0000	Зона D-01	2026-05-20 12:16:54.886	2026-05-20 12:16:54.886	0.0000
cmpe10v3d00198m1dg8v66g4e	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	120.0000	Зона E-02	2026-05-20 12:16:54.89	2026-05-20 12:16:54.89	0.0000
cmpe0tvo8000gzrd4tqqs24jp	cmpe0tvmi000azrd4rq39dn2g	cmpe0tvo2000ezrd44mq4qiq4	70.0000	A-01	2026-05-20 12:11:29.048	2026-05-20 12:28:40.527	0.0000
cmpkvs20i00v210aedrcp5paj	cmpkvrowi00uv10aevpyo6amj	cmpkvs20g00v010aeoc2r4kvy	25.0000	\N	2026-05-25 07:24:29.107	2026-05-25 07:26:54.411	0.0000
cmpkx5wco00wi10aeraw6s6k3	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	2.0000	\N	2026-05-25 08:03:14.568	2026-05-25 08:03:14.568	0.0000
cmpe10v36000v8m1dyo4y8hiv	cmpe10v32000p8m1dz7po43yk	cmpe10v34000t8m1dux09rrjt	445.0000	Зона A-05	2026-05-20 12:16:54.882	2026-05-22 15:05:26.988	0.0000
cmpe178qf000gdzs0xud77cts	cmpe10v2c00038m1da5d1yjvt	cmpe178qa000edzs0z8wbpp6y	22.0000	\N	2026-05-20 12:21:52.503	2026-05-23 19:18:01.995	0.0000
cmpfjj1kd000h131nn10jlw6d	cmpfd207r000kv4chvmc61n7j	cmpfjj1ka000f131n7q686emm	19.0000	\N	2026-05-21 13:42:42.35	2026-05-23 19:18:02.013	0.0000
cmpfl18zs000djzrrr2m1se0n	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	46.0000	\N	2026-05-21 14:24:51.401	2026-05-23 19:18:02.02	0.0000
cmpfin0dt0019strvpno1g5l1	cmpfd207r000kv4chvmc61n7j	cmpfin0dq0017strv4srq0tbd	6.0000	\N	2026-05-21 13:17:47.825	2026-05-23 19:18:02.027	0.0000
cmpe190zk000i5ioxkmdb82a5	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	20.0000	\N	2026-05-20 12:23:15.777	2026-05-23 19:18:55.715	0.0000
cmpe10v2n00098m1d4oyldjin	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	4891.0000	Зона A-12	2026-05-20 12:16:54.864	2026-05-23 19:18:55.721	0.0000
cmpirih5900dm10aeja223pww	cmpfd207r000kv4chvmc61n7j	cmpirih5500dk10aeojky3a8p	5.0000	\N	2026-05-23 19:49:31.341	2026-05-23 19:49:31.341	0.0000
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, product_id, lot_number, expiry_date, created_at, updated_at, mfg_date, status) FROM stdin;
cmpe10v2j00078m1dp1e0w710	cmpe10v2c00038m1da5d1yjvt	ПАР-2023-A	2027-04-12 00:00:00	2026-05-20 12:16:54.859	2026-05-20 12:16:54.859	\N	OK
cmpe10v2y000i8m1d8p9tmwjz	cmpe10v2v000e8m1dchq6dvsw	ПАР-2023-A	2026-06-01 00:00:00	2026-05-20 12:16:54.874	2026-05-20 12:16:54.874	\N	OK
cmpe10v30000m8m1d49k9zged	cmpe10v2v000e8m1dchq6dvsw	ПАР-2023-C	2027-01-15 00:00:00	2026-05-20 12:16:54.877	2026-05-20 12:16:54.877	\N	OK
cmpe10v34000t8m1dux09rrjt	cmpe10v32000p8m1dz7po43yk	ПАР-2024-M	2026-06-15 00:00:00	2026-05-20 12:16:54.881	2026-05-20 12:16:54.881	\N	OK
cmpe10v3800108m1d8i87srsx	cmpe10v36000w8m1dxjttui57	ПАР-2024-S	2028-01-20 00:00:00	2026-05-20 12:16:54.884	2026-05-20 12:16:54.884	\N	OK
cmpe178qa000edzs0z8wbpp6y	cmpe10v2c00038m1da5d1yjvt	E2E-RCV-1779279712069	2028-06-15 00:00:00	2026-05-20 12:21:52.498	2026-05-20 12:21:52.498	\N	OK
cmpe190zi000g5iox88qpk98e	cmpe10v2c00038m1da5d1yjvt	E2E-RCV-1779279795247	2028-06-15 00:00:00	2026-05-20 12:23:15.774	2026-05-20 12:23:15.774	\N	OK
cmpe0tvo2000ezrd44mq4qiq4	cmpe0tvmi000azrd4rq39dn2g	LOT-E2E-1	2027-12-31 00:00:00	2026-05-20 12:11:29.043	2026-05-20 18:48:52.596	\N	QUARANTINE
cmpe10v2q000b8m1d7mvkp5i9	cmpe10v2c00038m1da5d1yjvt	ПАР-2023-B	2028-01-10 00:00:00	2026-05-20 12:16:54.867	2026-05-20 18:49:03.629	\N	BLOCKED
cmpfin0dq0017strv4srq0tbd	cmpfd207r000kv4chvmc61n7j	222228	3033-03-30 00:00:00	2026-05-21 13:17:47.822	2026-05-21 13:17:47.822	\N	OK
cmpfkm1iz0013131nwrtm69kw	cmpfd207r000kv4chvmc61n7j	111111111111	2030-02-20 00:00:00	2026-05-21 14:13:01.883	2026-05-21 14:13:01.883	\N	OK
cmpfd2oho000pv4chvwse0p63	cmpfd207r000kv4chvmc61n7j	002600F8	2029-04-05 00:00:00	2026-05-21 10:42:01.212	2026-05-21 14:26:02.72	\N	OK
cmpgpazfk000kqkcauqakdy9p	cmpgpablr000fqkcazam971bt	18563	2028-03-13 00:00:00	2026-05-22 09:12:10.208	2026-05-22 09:12:10.208	\N	OK
cmpgphjav0011qkcahapfwynd	cmpgph0yh000wqkcab1dviulk	1	2027-03-28 00:00:00	2026-05-22 09:17:15.895	2026-05-22 09:17:15.895	\N	OK
cmpgpk0zu001jqkcas2xnvqgp	cmpgph0yh000wqkcab1dviulk	2	2030-05-30 00:00:00	2026-05-22 09:19:12.138	2026-05-22 09:19:12.138	\N	OK
cmpgpmpp6001zqkcajduswemo	cmpgph0yh000wqkcab1dviulk	3	2026-05-22 00:00:00	2026-05-22 09:21:17.466	2026-05-22 09:21:17.466	\N	OK
cmpfjj1ka000f131n7q686emm	cmpfd207r000kv4chvmc61n7j	123456789	2026-05-22 00:00:00	2026-05-21 13:42:42.346	2026-05-22 12:03:08.778	\N	OK
cmpe10v3c00178m1dy3lsz9oq	cmpe10v3b00138m1dfblshukq	ПАР-2025-B	2026-05-25 00:00:00	2026-05-20 12:16:54.889	2026-05-23 19:14:18.405	\N	BLOCKED
cmpirih5500dk10aeojky3a8p	cmpfd207r000kv4chvmc61n7j	123123123	2027-10-10 00:00:00	2026-05-23 19:49:31.337	2026-05-23 19:49:31.337	\N	OK
cmpkvs20g00v010aeoc2r4kvy	cmpkvrowi00uv10aevpyo6amj	100	2026-05-29 00:00:00	2026-05-25 07:24:29.104	2026-05-25 07:24:29.104	\N	OK
cmpkvsmn300va10ae2o17jm7k	cmpgph0yh000wqkcab1dviulk	1666	2027-12-12 00:00:00	2026-05-25 07:24:55.84	2026-05-25 07:24:55.84	\N	OK
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, channel, payload, read_at, created_at, type, priority, title, message, href) FROM stdin;
login-fail-cmpfu67tj0057jzrrcv9pk5fw	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpfu67tj0057jzrrcv9pk5fw"}	\N	2026-05-21 18:40:46.719	failed_login	HIGH	Неудачный вход	am@medciine-2000.ru	/users
login-fail-cmpf6kcjz004ht700vqinjnqf	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6kcjz004ht700vqinjnqf"}	\N	2026-05-21 07:40:19.091	failed_login	HIGH	Неудачный вход	admin@med.local	/users
login-fail-cmpe5c5nk0002m16k2y4oh8g8	cmpdz6zq70000qua72g7ns5dg	in_app	{"key": "login-fail-cmpe5c5nk0002m16k2y4oh8g8"}	\N	2026-05-20 14:17:53.744	failed_login	HIGH	Неудачный вход	am@medicine-2000.ru	/users
login-fail-cmpfl898x0011jzrr42ijtc1k	cmpfl6gyd000zjzrra4c7q7u0	in_app	{"key": "login-fail-cmpfl898x0011jzrr42ijtc1k"}	\N	2026-05-21 14:30:29.839	failed_login	HIGH	Неудачный вход	ekaterina.s@medicine-2000.ru	/users
login-fail-cmpf6l1ny004mt700zjoxyxu8	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6l1ny004mt700zjoxyxu8"}	\N	2026-05-21 07:41:19.194	failed_login	HIGH	Неудачный вход	viewer@med.local	/users
login-fail-cmpfhim8v0006strvx867fm1z	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpfhim8v0006strvx867fm1z"}	\N	2026-05-21 12:46:39.785	failed_login	HIGH	Неудачный вход	admin@med.local	/users
login-fail-cmpf6kehk004it700cf2xmepl	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6kehk004it700cf2xmepl"}	\N	2026-05-21 07:40:19.088	failed_login	HIGH	Неудачный вход	admin@med.local	/users
quarantine-cmpe0tvo2000ezrd44mq4qiq4	\N	in_app	{"key": "quarantine-cmpe0tvo2000ezrd44mq4qiq4"}	\N	2026-05-20 18:49:07.283	quarantine	HIGH	Карантин партии	E2E Test Product — LOT-E2E-1	/lots?search=LOT-E2E-1
login-fail-cmpf6l1m8004jt700s8kbsfy6	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6l1m8004jt700s8kbsfy6"}	\N	2026-05-21 07:41:19.216	failed_login	HIGH	Неудачный вход	admin@med.local	/users
login-fail-cmpf6l1nb004lt700jjfilhbx	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6l1nb004lt700jjfilhbx"}	\N	2026-05-21 07:41:19.2	failed_login	HIGH	Неудачный вход	operator@med.local	/users
exp-cmpfjj1ka000f131n7q686emm	\N	in_app	{"key": "exp-cmpfjj1ka000f131n7q686emm"}	2026-05-21 18:43:26.648	2026-05-21 13:42:46.975	expiring	CRITICAL	Истекает срок годности	Нож эндоскопический электрохирургический ClearCut (123456789) — -3 дн.	/expiry-control
exp-cmpe10v34000t8m1dux09rrjt	\N	in_app	{"key": "exp-cmpe10v34000t8m1dux09rrjt"}	\N	2026-05-20 14:15:53.742	expiring	HIGH	Истекает срок годности	Перчатки латексные M (ПАР-2024-M) — 21 дн.	/expiry-control
login-fail-cmpf6l1mp004kt700tv8isooo	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpf6l1mp004kt700tv8isooo"}	\N	2026-05-21 07:41:19.209	failed_login	HIGH	Неудачный вход	manager@med.local	/users
exp-cmpe10v3c00178m1dy3lsz9oq	\N	in_app	{"key": "exp-cmpe10v3c00178m1dy3lsz9oq"}	\N	2026-05-20 14:15:53.73	expiring	CRITICAL	Истекает срок годности	Бинты марлевые 10см стерильные (ПАР-2025-B) — 0 дн.	/expiry-control
login-fail-cmph1pdi70000x931d0wlvds1	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmph1pdi70000x931d0wlvds1"}	\N	2026-05-22 14:59:41.518	failed_login	HIGH	Неудачный вход	admin@med.local	/users
exp-cmpkvs20g00v010aeoc2r4kvy	\N	in_app	{"key": "exp-cmpkvs20g00v010aeoc2r4kvy"}	\N	2026-05-25 07:24:32.955	expiring	HIGH	Истекает срок годности	Сырники (100) — 4 дн.	/expiry-control
exp-cmpe10v2y000i8m1d8p9tmwjz	\N	in_app	{"key": "exp-cmpe10v2y000i8m1d8p9tmwjz"}	\N	2026-05-20 14:15:53.738	expiring	HIGH	Истекает срок годности	Раствор натрия хлорида 500мл (ПАР-2023-A) — 7 дн.	/expiry-control
blocked-cmpe10v2q000b8m1d7mvkp5i9	\N	in_app	{"key": "blocked-cmpe10v2q000b8m1d7mvkp5i9"}	\N	2026-05-20 18:49:07.28	blocked	HIGH	Партия заблокирована	Маски хирургические L3 — ПАР-2023-B	/recall
login-fail-cmpgzfggk000054n52k8ydclg	cmpe8c28f000ft7005ljr56w2	in_app	{"key": "login-fail-cmpgzfggk000054n52k8ydclg"}	\N	2026-05-22 13:55:46.618	failed_login	HIGH	Неудачный вход	admin@med.local	/users
login-fail-cmpfu6azy0058jzrr0mxpwvk3	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmpfu6azy0058jzrr0mxpwvk3"}	\N	2026-05-21 18:40:46.715	failed_login	HIGH	Неудачный вход	am@medcine-2000.ru	/users
blocked-cmpe10v3c00178m1dy3lsz9oq	\N	in_app	{"key": "blocked-cmpe10v3c00178m1dy3lsz9oq"}	\N	2026-05-21 08:36:35.764	blocked	HIGH	Партия заблокирована	Бинты марлевые 10см стерильные — ПАР-2025-B	/recall
login-fail-cmph1pfkm0003x931gamx3vzy	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmph1pfkm0003x931gamx3vzy"}	\N	2026-05-22 14:59:41.507	failed_login	HIGH	Неудачный вход	admin@med.local	/users
login-fail-cmph1pfk80002x931dnxr4f6h	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmph1pfk80002x931dnxr4f6h"}	\N	2026-05-22 14:59:41.511	failed_login	HIGH	Неудачный вход	manager@med.local	/users
login-fail-cmph1pfjw0001x931ob5902q7	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmph1pfjw0001x931ob5902q7"}	\N	2026-05-22 14:59:41.516	failed_login	HIGH	Неудачный вход	operator@med.local	/users
exp-cmpgpmpp6001zqkcajduswemo	\N	in_app	{"key": "exp-cmpgpmpp6001zqkcajduswemo"}	\N	2026-05-22 09:21:19.428	expiring	CRITICAL	Истекает срок годности	GOODMIX CHOKOLATE (3) — -3 дн.	/expiry-control
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
cmpe8ajnm000at700myf7ta9j	cmpe6lgwq0009eityq7uocwm4	41159e330c12ea3e392290d9d4bc9cee3da6649cdaecd5434a9dcccfc7d833da	2026-05-20 15:55:23.936	2026-05-20 15:40:50.491	2026-05-20 15:40:23.938
cmpf941q00016oxdtokw07xjf	cmpe8c28f000ft7005ljr56w2	ee0d37b9c04c7e5ab1a226e5d5f8f358a45732f4c1c11817e2b06349f5740322	2026-05-21 09:06:06.55	2026-05-21 08:51:36.317	2026-05-21 08:51:06.552
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, sku, name, created_at, updated_at, manufacturer, min_stock, reorder_point) FROM stdin;
cmpe0j5js0002zrd4icojhvzh	11111	тест	2026-05-20 12:03:08.633	2026-05-20 12:03:08.633	тест_тест	\N	\N
cmpe0tvmi000azrd4rq39dn2g	E2E-001	E2E Test Product	2026-05-20 12:11:28.987	2026-05-20 12:11:28.987	TestCo	\N	\N
cmpe0ujp4000lzrd4ce89rpro	TEST2	Name Only	2026-05-20 12:12:00.185	2026-05-20 12:12:00.185	\N	\N	\N
cmpe10v2c00038m1da5d1yjvt	REF-8842	Маски хирургические L3	2026-05-20 12:16:54.853	2026-05-20 12:16:54.853	МедТех Плюс	\N	\N
cmpe10v2v000e8m1dchq6dvsw	REF-1102	Раствор натрия хлорида 500мл	2026-05-20 12:16:54.871	2026-05-20 12:16:54.871	ФармаКорп	\N	\N
cmpe10v32000p8m1dz7po43yk	REF-9931	Перчатки латексные M	2026-05-20 12:16:54.879	2026-05-20 12:16:54.879	ГловМед	\N	\N
cmpe10v36000w8m1dxjttui57	REF-2234	Шприцы 5мл Луер-Лок	2026-05-20 12:16:54.883	2026-05-20 12:16:54.883	МедТех Плюс	\N	\N
cmpe10v3b00138m1dfblshukq	REF-6632	Бинты марлевые 10см стерильные	2026-05-20 12:16:54.887	2026-05-20 12:16:54.887	ТекстильМед	\N	\N
cmpe10v3e001a8m1di7jbqpjq	REF-4421	Обезболивающее в/в 100мг	2026-05-20 12:16:54.891	2026-05-20 12:16:54.891	ФармаКорп	\N	\N
cmpe16hdn0002dzs05jflxk34	E2E-1779279676865	E2E Product 1779279676865	2026-05-20 12:21:17.052	2026-05-20 12:21:17.052	E2E Mfg	\N	\N
cmpe18vlu00025ioxy7v543xq	E2E-1779279788653	E2E Product 1779279788653 UPD	2026-05-20 12:23:08.803	2026-05-20 12:23:10.937	E2E Mfg	\N	\N
cmpe1c0ad000s5iox7m9anfrn	2222222	ТЕСТ2	2026-05-20 12:25:34.838	2026-05-20 12:25:34.838	тест2	\N	\N
cmpe1imn40002rtl576pje2si	PERSIST-1779280243	Stabilization Test Product	2026-05-20 12:30:43.744	2026-05-20 12:30:43.744	QA	\N	\N
cmpfd207r000kv4chvmc61n7j	FM-EK0004(2300)A	Нож эндоскопический электрохирургический ClearCut	2026-05-21 10:41:29.752	2026-05-21 10:41:29.752	FINEMEDIX	\N	\N
cmpgpablr000fqkcazam971bt	M00546620	Autolith Bipolar Electrohydraulic Lithotripter Probe	2026-05-22 09:11:39.328	2026-05-22 09:11:39.328	Boston Scientific	\N	\N
cmpgph0yh000wqkcab1dviulk	ВАФЕЛЬКА	GOODMIX CHOKOLATE	2026-05-22 09:16:52.122	2026-05-22 09:16:52.122	GOODMiX	\N	\N
cmpkvrowi00uv10aevpyo6amj	322	Сырники	2026-05-25 07:24:12.114	2026-05-25 07:24:12.114	Шаверно	\N	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, created_at) FROM stdin;
cmph7zkm7000110ae1wu2lr9k	cmpe6lgwq0009eityq7uocwm4	8d7ca9fe86002a5b9ae5e6a8f31e7a835736696f602146de8b68515a5029e757	2026-05-29 17:55:10.493	2026-05-22 17:55:10.496
cmpk7l28000pn10ae8tlovgzm	cmpe6lgwq0009eityq7uocwm4	587d02eaf03943a87002ae3559b66333cd693230496e3b2ea91c64a0f1c82421	2026-05-31 20:07:11.997	2026-05-24 20:07:12
cmpgz49d00003mw1xoxmxvge6	cmpfl6gyd000zjzrra4c7q7u0	f3c868f982b8876c0ab278b4302e886a36c0080614c4a7d2afcd09b8cf664891	2026-05-29 13:46:52.642	2026-05-22 13:46:52.644
cmpkyuhha00xb10ae4zqy2csl	cmpe6lgwq0009eityq7uocwm4	96b5110e0c33495e2ee9bc5318b63f3b6a13abd5c8ba528f094bb8dc6beedff4	2026-06-01 08:50:21.308	2026-05-25 08:50:21.31
cmpkywjom00xd10aekgcu8a13	cmpf7cy2c000e9de7xtf3doa3	4a56f2a48ccf784aae654a91a315b8fa695c7f60e8412e9d7d3096315aebdfc4	2026-06-01 08:51:57.477	2026-05-25 08:51:57.478
cmpkz1mqi00xf10aeduc1d1qj	cmpfl6gyd000zjzrra4c7q7u0	75932a3db771bcb886af022e4e8191df55bf2eaddeed310067464cb6fd327bd2	2026-06-01 08:55:54.712	2026-05-25 08:55:54.714
cmpkz2q0x00xh10aei7x9rp3p	cmpe8c28f000ft7005ljr56w2	bf054b15391038a2ed04df24f1f79c818d4e50b022c58d81baa87073caaf43f5	2026-06-01 08:56:45.631	2026-05-25 08:56:45.634
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, reference, product_id, lot_id, type, quantity, actor_email, created_at, write_off_destination, write_off_comment, write_off_destination_id, operation_group_id, corrected_movement_id, correction_session_id, edit_reason) FROM stdin;
cmpe0tvod000izrd4p7bmnjxj	ПЕР-0001	cmpe0tvmi000azrd4rq39dn2g	cmpe0tvo2000ezrd44mq4qiq4	RECEIPT	100.0000	admin@med.local	2026-05-20 12:11:29.053	\N	\N	\N	\N	\N	\N	\N
cmpe0xn12000qzrd4wyasfyki	ПЕР-0002	cmpe0tvmi000azrd4rq39dn2g	cmpe0tvo2000ezrd44mq4qiq4	ISSUE	25.0000	admin@med.local	2026-05-20 12:14:24.47	\N	\N	\N	\N	\N	\N	\N
cmpe176ds0006dzs07ipgpba5	ПЕР-0003	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	QUARANTINE	0.0000	admin@med.local	2026-05-20 12:21:49.456	\N	\N	\N	\N	\N	\N	\N
cmpe177e4000adzs0xusp5njr	ПЕР-0004	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	UNBLOCK	0.0000	admin@med.local	2026-05-20 12:21:50.765	\N	\N	\N	\N	\N	\N	\N
cmpe178qn000kdzs0swv8daeh	ПЕР-0005	cmpe10v2c00038m1da5d1yjvt	cmpe178qa000edzs0z8wbpp6y	RECEIPT	25.0000	admin@med.local	2026-05-20 12:21:52.511	\N	\N	\N	\N	\N	\N	\N
cmpe17bhv000ndzs0851aryod	ПЕР-0006	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	3.0000	admin@med.local	2026-05-20 12:21:56.083	\N	\N	\N	\N	\N	\N	\N
cmpe18ykf00085ioxl4nxk2nh	ПЕР-0007	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	QUARANTINE	0.0000	admin@med.local	2026-05-20 12:23:12.639	\N	\N	\N	\N	\N	\N	\N
cmpe18zkb000c5ioxnxsfnmkw	ПЕР-0008	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	UNBLOCK	0.0000	admin@med.local	2026-05-20 12:23:13.932	\N	\N	\N	\N	\N	\N	\N
cmpe190zo000m5ioxiwdiige5	ПЕР-0009	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	RECEIPT	25.0000	admin@med.local	2026-05-20 12:23:15.78	\N	\N	\N	\N	\N	\N	\N
cmpe193p8000p5ioxxchife9o	ПЕР-0010	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	3.0000	admin@med.local	2026-05-20 12:23:19.293	\N	\N	\N	\N	\N	\N	\N
cmpe1fzki000w5ioxjtgsx4gz	ПЕР-0011	cmpe0tvmi000azrd4rq39dn2g	cmpe0tvo2000ezrd44mq4qiq4	ISSUE	5.0000	admin@med.local	2026-05-20 12:28:40.53	\N	\N	\N	\N	\N	\N	\N
cmpef0xh4001dt7001kp28avk	ПЕР-0012	cmpe0tvmi000azrd4rq39dn2g	cmpe0tvo2000ezrd44mq4qiq4	QUARANTINE	0.0000	am@medicine-2000.ru	2026-05-20 18:48:52.6	\N	\N	\N	\N	\N	\N	\N
cmpef15zk001ht700r4heej98	ПЕР-0013	cmpe10v2c00038m1da5d1yjvt	cmpe10v2q000b8m1d7mvkp5i9	BLOCK	0.0000	am@medicine-2000.ru	2026-05-20 18:49:03.632	\N	\N	\N	\N	\N	\N	\N
cmpf8l16d0007oxdtqx1ph4jm	ПЕР-0014	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	QUARANTINE	0.0000	sklad@navitek.biz	2026-05-21 08:36:19.382	\N	\N	\N	\N	\N	\N	\N
cmpf8l46z000boxdt616pqy8u	ПЕР-0015	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	UNBLOCK	0.0000	sklad@navitek.biz	2026-05-21 08:36:23.291	\N	\N	\N	\N	\N	\N	\N
cmpf8lcfy000foxdtc21pb74d	ПЕР-0016	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	BLOCK	0.0000	sklad@navitek.biz	2026-05-21 08:36:33.983	\N	\N	\N	\N	\N	\N	\N
cmpf8lhqe000joxdtfikvolid	ПЕР-0017	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	UNBLOCK	0.0000	sklad@navitek.biz	2026-05-21 08:36:40.839	\N	\N	\N	\N	\N	\N	\N
cmpf8lu5h000noxdttfqp2iy7	ПЕР-0018	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	BLOCK	0.0000	sklad@navitek.biz	2026-05-21 08:36:56.933	\N	\N	\N	\N	\N	\N	\N
cmpf8nhjt000roxdt3ddt8kx5	ПЕР-0019	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	100.0000	sklad@navitek.biz	2026-05-21 08:38:13.914	\N	\N	\N	\N	\N	\N	\N
cmpfd2oi0000vv4chjcdp6oaq	ПЕР-0020	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	RECEIPT	2.0000	sklad@navitek.biz	2026-05-21 10:42:01.224	\N	\N	\N	\N	\N	\N	\N
cmpfd751w0014v4chqvm58h9z	ПЕР-0021	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	1.0000	sklad@navitek.biz	2026-05-21 10:45:29.3	\N	\N	\N	\N	\N	\N	\N
cmpfg9ca60004vqmudhbcoxrc	ПЕР-0022	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	1.0000	am@medicine-2000.ru	2026-05-21 12:11:10.831	OTHER	тест	wod_other	\N	\N	\N	\N
cmpfijgb2000vstrvue8wdfx4	ПЕР-0023	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	RECEIPT	100.0000	sklad@navitek.biz	2026-05-21 13:15:01.838	\N	\N	\N	\N	\N	\N	\N
cmpfilrb90013strvo2axebqn	ПЕР-0024	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	15.0000	sklad@navitek.biz	2026-05-21 13:16:49.414	\N	сАНТЬЯГГО	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpfin0dx001dstrvgevjxh14	ПЕР-0025	cmpfd207r000kv4chvmc61n7j	cmpfin0dq0017strv4srq0tbd	RECEIPT	10.0000	sklad@navitek.biz	2026-05-21 13:17:47.829	\N	\N	\N	\N	\N	\N	\N
cmpfja9tz0009131neuwk38q8	ПЕР-0026	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	3.0000	sklad@navitek.biz	2026-05-21 13:35:53.159	\N	КУЗЬМ БЕЗ ДОКОВ	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpfja9u4000b131nhvew7erb	ПЕР-0027	cmpfd207r000kv4chvmc61n7j	cmpfin0dq0017strv4srq0tbd	ISSUE	3.0000	sklad@navitek.biz	2026-05-21 13:35:53.165	\N	КУЗЬМ БЕЗ ДОКОВ	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpfjj1ki000l131nkqbgvp5b	ПЕР-0028	cmpfd207r000kv4chvmc61n7j	cmpfjj1ka000f131n7q686emm	RECEIPT	10.0000	sklad@navitek.biz	2026-05-21 13:42:42.355	\N	\N	\N	\N	\N	\N	\N
cmpfkm1j50019131nu18jysk4	ПЕР-0029	cmpfd207r000kv4chvmc61n7j	cmpfkm1iz0013131nwrtm69kw	RECEIPT	20.0000	sklad@navitek.biz	2026-05-21 14:13:01.89	\N	\N	\N	\N	\N	\N	\N
cmpfkotm3001d131niyztwq9f	ПЕР-0030	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	82.0000	sklad@navitek.biz	2026-05-21 14:15:11.595	\N	КУЗЬМ БЕЗ ДОКОВ	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpfkotm7001f131ngou67h2g	ПЕР-0031	cmpfd207r000kv4chvmc61n7j	cmpfkm1iz0013131nwrtm69kw	ISSUE	20.0000	sklad@navitek.biz	2026-05-21 14:15:11.6	\N	КУЗЬМ БЕЗ ДОКОВ	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpfl18zy000hjzrrak6t4fu0	ПЕР-0032	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	RECEIPT	35.0000	sklad@navitek.biz	2026-05-21 14:24:51.407	\N	\N	\N	\N	\N	\N	\N
cmpfl2s11000rjzrrjawxpzn7	ПЕР-0033	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	RECEIPT	15.0000	sklad@navitek.biz	2026-05-21 14:26:02.726	\N	\N	\N	\N	\N	\N	\N
cmpgpazfq000qqkcad0v47910	ПЕР-0034	cmpgpablr000fqkcazam971bt	cmpgpazfk000kqkcauqakdy9p	RECEIPT	1.0000	sklad@navitek.biz	2026-05-22 09:12:10.214	\N	\N	\N	\N	\N	\N	\N
cmpgpdevv000uqkcai6tol601	ПЕР-0035	cmpgpablr000fqkcazam971bt	cmpgpazfk000kqkcauqakdy9p	ISSUE	1.0000	sklad@navitek.biz	2026-05-22 09:14:03.547	OTHER	tests	wod_other	\N	\N	\N	\N
cmpgphjb50017qkcaefowjm1u	ПЕР-0036	cmpgph0yh000wqkcab1dviulk	cmpgphjav0011qkcahapfwynd	RECEIPT	25.0000	sklad@navitek.biz	2026-05-22 09:17:15.905	\N	\N	\N	\N	\N	\N	\N
cmpgpih0x001bqkcakebwziza	ПЕР-0037	cmpgph0yh000wqkcab1dviulk	cmpgphjav0011qkcahapfwynd	ISSUE	2.0000	sklad@navitek.biz	2026-05-22 09:17:59.602	INTERNAL	Съел	wod_internal	\N	\N	\N	\N
cmpgpk0zz001pqkcaxxxcdblt	ПЕР-0038	cmpgph0yh000wqkcab1dviulk	cmpgpk0zu001jqkcas2xnvqgp	RECEIPT	10.0000	sklad@navitek.biz	2026-05-22 09:19:12.143	\N	\N	\N	\N	\N	\N	\N
cmpgpku19001tqkca5t91yr73	ПЕР-0039	cmpgph0yh000wqkcab1dviulk	cmpgphjav0011qkcahapfwynd	ISSUE	3.0000	sklad@navitek.biz	2026-05-22 09:19:49.773	INTERNAL	Съел	wod_internal	\N	\N	\N	\N
cmpgpku1c001vqkcakvs9bolv	ПЕР-0040	cmpgph0yh000wqkcab1dviulk	cmpgpk0zu001jqkcas2xnvqgp	ISSUE	5.0000	sklad@navitek.biz	2026-05-22 09:19:49.777	INTERNAL	Съел	wod_internal	\N	\N	\N	\N
cmpgpmppd0025qkcacvbkoqmp	ПЕР-0041	cmpgph0yh000wqkcab1dviulk	cmpgpmpp6001zqkcajduswemo	RECEIPT	5.0000	sklad@navitek.biz	2026-05-22 09:21:17.474	\N	\N	\N	\N	\N	\N	\N
cmpgv4rxu001960xbf5sy6jx8	ПЕР-0042	cmpgph0yh000wqkcab1dviulk	cmpgphjav0011qkcahapfwynd	ISSUE	20.0000	am@medicine-2000.ru	2026-05-22 11:55:18.258	\N	\N	cmpfii3yx000lstrvkacz7ks2	\N	\N	\N	\N
cmpgv4rxz001b60xbq48htw80	ПЕР-0043	cmpgph0yh000wqkcab1dviulk	cmpgpk0zu001jqkcas2xnvqgp	ISSUE	5.0000	am@medicine-2000.ru	2026-05-22 11:55:18.263	\N	\N	cmpfii3yx000lstrvkacz7ks2	\N	\N	\N	\N
cmpgv9yo3001f60xbbbggtp2x	ПЕР-0044	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	3.0000	am@medicine-2000.ru	2026-05-22 11:59:20.26	\N	\N	cmpfikajy000xstrvk9e0lrz6	\N	\N	\N	\N
cmpgvev01001n60xbokgmgpht	ПЕР-0045	cmpfd207r000kv4chvmc61n7j	cmpfjj1ka000f131n7q686emm	RECEIPT	10.0000	am@medicine-2000.ru	2026-05-22 12:03:08.785	\N	\N	\N	\N	\N	\N	\N
cmph1qbmi0006x9312gauy42e	ПЕР-0046	cmpgph0yh000wqkcab1dviulk	cmpgpmpp6001zqkcajduswemo	ISSUE	2.0000	am@medicine-2000.ru	2026-05-22 15:00:01.243	\N	\N	cmpfii3yx000lstrvkacz7ks2	\N	\N	\N	\N
cmph1xayq000fx9319xqwfvga	ПЕР-0047	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	1.0000	am@medicine-2000.ru	2026-05-22 15:05:26.978	\N	\N	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	\N	\N	\N
cmph1xayv000hx931qcfmy2wm	ПЕР-0048	cmpe10v2c00038m1da5d1yjvt	cmpe178qa000edzs0z8wbpp6y	ISSUE	2.0000	am@medicine-2000.ru	2026-05-22 15:05:26.983	\N	\N	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	\N	\N	\N
cmph1xayy000jx931sb76sr26	ПЕР-0049	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	ISSUE	3.0000	am@medicine-2000.ru	2026-05-22 15:05:26.986	\N	\N	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	\N	\N	\N
cmph1xaz1000lx931qr6jun4s	ПЕР-0050	cmpe10v32000p8m1dz7po43yk	cmpe10v34000t8m1dux09rrjt	ISSUE	5.0000	am@medicine-2000.ru	2026-05-22 15:05:26.99	\N	123	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	\N	\N	\N
cmph1xaz5000nx931q2xv4mbd	ПЕР-0051	cmpgph0yh000wqkcab1dviulk	cmpgpmpp6001zqkcajduswemo	ISSUE	1.0000	am@medicine-2000.ru	2026-05-22 15:05:26.993	\N	123	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	\N	\N	\N
cmph2sbkv00023jiczbvcpgkq	ПЕР-0052	cmpgph0yh000wqkcab1dviulk	cmpgpmpp6001zqkcajduswemo	ISSUE	1.0000	am@medicine-2000.ru	2026-05-22 15:29:34.112	\N	123	cmpfii3yx000lstrvkacz7ks2	f403decd-063b-423b-a467-4cf64a032cb6	cmph1xaz5000nx931q2xv4mbd	854d6568-693c-490a-a11f-e9689107a48e	Клиент поменял заказ
cmpiq95y000c410aeiwvhhhw6	ПЕР-0053	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	UNBLOCK	0.0000	am@medicine-2000.ru	2026-05-23 19:14:17.304	\N	\N	\N	\N	\N	\N	\N
cmpiq96sn00c810aelaamaega	ПЕР-0054	cmpe10v3b00138m1dfblshukq	cmpe10v3c00178m1dy3lsz9oq	BLOCK	0.0000	am@medicine-2000.ru	2026-05-23 19:14:18.408	\N	\N	\N	\N	\N	\N	\N
cmpiqdzb700cc10ae8qayznpp	ПЕР-0055	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:01.988	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqdzbi00ce10aej5mw1vqn	ПЕР-0056	cmpe10v2c00038m1da5d1yjvt	cmpe178qa000edzs0z8wbpp6y	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:01.998	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqdzbq00cg10aenkxv4kqz	ПЕР-0057	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:02.006	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqdzbz00ci10aeolelhvvb	ПЕР-0058	cmpfd207r000kv4chvmc61n7j	cmpfjj1ka000f131n7q686emm	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:02.016	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqdzc600ck10aec15m709r	ПЕР-0059	cmpfd207r000kv4chvmc61n7j	cmpfd2oho000pv4chvwse0p63	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:02.022	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqdzce00cm10aec2na60fd	ПЕР-0060	cmpfd207r000kv4chvmc61n7j	cmpfin0dq0017strv4srq0tbd	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:02.03	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	\N	\N	\N
cmpiqf4ro00cq10ae74ecthdk	ПЕР-0061	cmpe10v2c00038m1da5d1yjvt	cmpe190zi000g5iox88qpk98e	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:55.717	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	cmpiqdzbq00cg10aenkxv4kqz	05978ed9-387f-41ec-ac59-eb58a66dceca	Клиент попросил больше
cmpiqf4rv00cs10aeoprviap8	ПЕР-0062	cmpe10v2c00038m1da5d1yjvt	cmpe10v2j00078m1dp1e0w710	ISSUE	1.0000	am@medicine-2000.ru	2026-05-23 19:18:55.723	SAMPLES	тест	wod_samples	2e5c6853-c187-4986-9841-b5d965e57ee9	cmpiqdzb700cc10ae8qayznpp	05978ed9-387f-41ec-ac59-eb58a66dceca	Клиент попросил больше
cmpirih5e00dq10aeibhklkjz	ПЕР-0063	cmpfd207r000kv4chvmc61n7j	cmpirih5500dk10aeojky3a8p	RECEIPT	5.0000	am@medicine-2000.ru	2026-05-23 19:49:31.346	\N	\N	\N	\N	\N	\N	\N
cmpkvs20m00v610aec9zum42w	ПЕР-0064	cmpkvrowi00uv10aevpyo6amj	cmpkvs20g00v010aeoc2r4kvy	RECEIPT	50.0000	sklad@navitek.biz	2026-05-25 07:24:29.111	\N	\N	\N	\N	\N	\N	\N
cmpkvsmn800vg10ae4lrrcfkg	ПЕР-0065	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	RECEIPT	40.0000	sklad@navitek.biz	2026-05-25 07:24:55.844	\N	\N	\N	\N	\N	\N	\N
cmpkvts7c00vk10aeto5kn9xk	ПЕР-0066	cmpkvrowi00uv10aevpyo6amj	cmpkvs20g00v010aeoc2r4kvy	ISSUE	22.0000	sklad@navitek.biz	2026-05-25 07:25:49.704	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	\N	\N	\N
cmpkvts7h00vm10aeg218clfq	ПЕР-0067	cmpgph0yh000wqkcab1dviulk	cmpgpmpp6001zqkcajduswemo	ISSUE	1.0000	sklad@navitek.biz	2026-05-25 07:25:49.709	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	\N	\N	\N
cmpkvts7m00vo10aekpw0mbhl	ПЕР-0068	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	ISSUE	32.0000	sklad@navitek.biz	2026-05-25 07:25:49.715	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	\N	\N	\N
cmpkvv64o00vw10aepfmvrqe1	ПЕР-0069	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	ISSUE	8.0000	sklad@navitek.biz	2026-05-25 07:26:54.408	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	cmpkvts7m00vo10aekpw0mbhl	55a071b3-c065-44a9-8d5c-e9732e91efa7	косяк склад
cmpkvv64s00vy10aesvm28f1d	ПЕР-0070	cmpkvrowi00uv10aevpyo6amj	cmpkvs20g00v010aeoc2r4kvy	ISSUE	3.0000	sklad@navitek.biz	2026-05-25 07:26:54.412	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	cmpkvts7c00vk10aeto5kn9xk	55a071b3-c065-44a9-8d5c-e9732e91efa7	косяк склад
cmpkx5wcq00wk10ae6b9efah9	ПЕР-0071	cmpgph0yh000wqkcab1dviulk	cmpkvsmn300va10ae2o17jm7k	ADJUSTMENT	2.0000	am@medicine-2000.ru	2026-05-25 08:03:14.57	\N	\N	cmpfii3yx000lstrvkacz7ks2	449d6dbd-f3aa-4135-9486-a04f3e5b4703	cmpkvts7m00vo10aekpw0mbhl	4abb851a-45bb-4aa7-a98d-e4a1197732f8	Менеджер ошибся
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, payload, updated_at, updated_by) FROM stdin;
default	{"mail": {"smtp": {"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "passwordEnc": "v1:lgMxLQuyUheR1Bzz:DQHPHboIQxfpH8umoYDXeA==:N60fUHzkxyixPT7PsghqiQ=="}, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}}, "fefoStrict": true, "fefoEnabled": false, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}	2026-05-21 13:34:37.857	am@medicine-2000.ru
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, role, is_active, created_at, updated_at, display_name, last_login_at, deleted_at) FROM stdin;
cmpf7cy2c000e9de7xtf3doa3	sklad@navitek.biz	$2b$10$LrnsaZanb2Jxn.a.3l2z2eMf4kn22766iIFJ2vNS3sGqtQlkRHVOa	ADMIN	t	2026-05-21 08:02:02.484	2026-05-25 07:20:32.822	Naumov	2026-05-25 07:20:32.82	\N
cmpe5ba810000m16kgcrcln4m	am@medicine-2000.ru	$2b$10$gRXDl3atCajFoSfs9KahfuCMUujJcH9tu3Faw2PUWEBhhHZBkRsfS	MANAGER	f	2026-05-20 14:16:59.522	2026-05-20 14:36:25.27	Илья	2026-05-20 14:17:54.591	2026-05-20 14:36:25.267
cmpe6fxb20005zatu3t20boo1	api-e2e-reuse-1779288515@test.local	$2b$10$4tsJ7oga5rljBVqelcCjPuogQYnfJBz529tcok4nMNbHSa9BudCVq	OPERATOR	f	2026-05-20 14:48:35.678	2026-05-20 14:48:35.74	\N	\N	2026-05-20 14:48:35.738
cmpe6fxf60008zatuonkit2z0	api-e2e-reuse-1779288515@test.local	$2b$10$0hE5gbDMxUszJ4x42a/WcO.AAI/Krsbo/RUMuPsF.v/8J1fRPWAPK	OPERATOR	f	2026-05-20 14:48:35.826	2026-05-20 14:48:35.873	\N	\N	2026-05-20 14:48:35.872
cmpe6jdw20003eity5j2hxnmp	prod-verify-reuse@test.local	$2b$10$xDyOFlZuEZ9ED8GpDVpJlOfHLYER6mP7BjzRuXY12vP0qQkAPMQjW	OPERATOR	f	2026-05-20 14:51:17.138	2026-05-20 14:51:17.207	\N	\N	2026-05-20 14:51:17.204
cmpe6je0n0006eity4vane1iz	prod-verify-reuse@test.local	$2b$10$ed9Vn6GTaKsciatJGxuq6u10Wm0IU2QKuH1cPDfSOJX/V61hbvDA2	OPERATOR	f	2026-05-20 14:51:17.303	2026-05-20 14:51:17.357	\N	\N	2026-05-20 14:51:17.355
cmpdz6zqf0002qua7og3fmd74	operator@med.local	$2b$10$xy.uqxRKwWu9BjHr45Da5.fsiVxK2faMP6X7PcLLShXIF0guGmT0a	OPERATOR	f	2026-05-20 11:25:41.607	2026-05-21 18:47:48.883	\N	\N	\N
cmpdz6zqd0001qua7wn0v1ths	manager@med.local	$2b$10$xy.uqxRKwWu9BjHr45Da5.fsiVxK2faMP6X7PcLLShXIF0guGmT0a	OPERATOR	f	2026-05-20 11:25:41.605	2026-05-21 18:47:49.715	\N	\N	\N
cmpdz6zq70000qua72g7ns5dg	admin@med.local	$2b$10$xy.uqxRKwWu9BjHr45Da5.fsiVxK2faMP6X7PcLLShXIF0guGmT0a	ADMIN	f	2026-05-20 11:25:41.599	2026-05-21 18:47:52.596	\N	2026-05-21 09:32:19.835	\N
cmpf7bnav00039de7k0xutha0	pilot-pwd-1779350461@med.local	$2b$10$OmW5nc//S/GxLBhErAcqJ.DW9yWMy58Py66QF5D/4jowKBwchsDIe	VIEWER	f	2026-05-21 08:01:01.879	2026-05-21 08:01:26.605	\N	2026-05-21 08:01:02.198	2026-05-21 08:01:26.604
cmpf7abnv0003oo6wrotcesbq	pilot-pwd-1779350399@med.local	$2b$10$Z48P2CzgttfMMwgUvaaLTeQA6eUAKELUsJ6drGRRDsV65boqnpdFi	VIEWER	f	2026-05-21 08:00:00.14	2026-05-21 08:01:28.884	\N	2026-05-21 08:00:00.452	2026-05-21 08:01:28.883
cmpe8c28f000ft7005ljr56w2	ds@medicine-2000.ru	$2b$10$8SYkBq5kCbqwWXgv/z7tvORReHS/wW9oJbzlkN4.dGw239LmHhlSm	ADMIN	t	2026-05-20 15:41:34.671	2026-05-21 08:51:46.883	ds	2026-05-21 08:51:46.882	\N
cmpe6lgwq0009eityq7uocwm4	am@medicine-2000.ru	$2b$10$IHTL/UOVPy/MczWOX1bGT.1L4YTipxucNkTVc6BU6eF3idg6dG8.2	ADMIN	t	2026-05-20 14:52:54.362	2026-05-22 18:45:01.258	lexmol	2026-05-22 18:45:01.257	\N
cmpfl6gyd000zjzrra4c7q7u0	ekaterina.s@navitek.biz	$2b$10$M1enD/BNarlyddfU04i4OeLcm6E5MtJrtLI3U.pSDY8u8HxUK6ZMu	VIEWER	t	2026-05-21 14:28:54.997	2026-05-25 07:10:25.401	Катя	2026-05-25 07:10:25.4	\N
\.


--
-- Data for Name: write_off_destinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.write_off_destinations (id, name, type, is_active, legacy_code, created_at, updated_at) FROM stdin;
wod_disposal	Утилизация	DISPOSAL	t	DISPOSAL	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_defect	Брак	DAMAGE	t	DEFECT	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_internal	Внутреннее потребление	INTERNAL	t	INTERNAL	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_other	Другое	OTHER	t	OTHER	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_samples	Тест / образцы	SAMPLES	t	SAMPLES	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_damage	Повреждение	DAMAGE	t	DAMAGE	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
wod_expired	Истёк срок годности	OTHER	t	EXPIRED	2026-05-21 12:32:22.937	2026-05-21 12:32:22.937
cmpfii3yx000lstrvkacz7ks2	ДГБ 2	\N	t	\N	2026-05-21 13:13:59.194	2026-05-21 13:13:59.194
cmpfikajy000xstrvk9e0lrz6	ЛОКБ	\N	t	\N	2026-05-21 13:15:41.039	2026-05-21 13:15:41.039
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: barcode_records barcode_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode_records
    ADD CONSTRAINT barcode_records_pkey PRIMARY KEY (id);


--
-- Name: expected_receipt_events expected_receipt_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_receipt_events
    ADD CONSTRAINT expected_receipt_events_pkey PRIMARY KEY (id);


--
-- Name: expected_receipts expected_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_receipts
    ADD CONSTRAINT expected_receipts_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: write_off_destinations write_off_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.write_off_destinations
    ADD CONSTRAINT write_off_destinations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: barcode_records_barcode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX barcode_records_barcode_key ON public.barcode_records USING btree (barcode);


--
-- Name: barcode_records_lot_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX barcode_records_lot_id_idx ON public.barcode_records USING btree (lot_id);


--
-- Name: barcode_records_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX barcode_records_product_id_idx ON public.barcode_records USING btree (product_id);


--
-- Name: expected_receipt_events_expected_receipt_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expected_receipt_events_expected_receipt_id_created_at_idx ON public.expected_receipt_events USING btree (expected_receipt_id, created_at);


--
-- Name: expected_receipts_product_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expected_receipts_product_id_status_idx ON public.expected_receipts USING btree (product_id, status);


--
-- Name: expected_receipts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expected_receipts_status_idx ON public.expected_receipts USING btree (status);


--
-- Name: inventory_items_product_id_lot_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_items_product_id_lot_id_idx ON public.inventory_items USING btree (product_id, lot_id);


--
-- Name: lots_product_id_expiry_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lots_product_id_expiry_date_idx ON public.lots USING btree (product_id, expiry_date);


--
-- Name: lots_product_id_lot_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lots_product_id_lot_number_key ON public.lots USING btree (product_id, lot_number);


--
-- Name: notifications_type_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_type_created_at_idx ON public.notifications USING btree (type, created_at);


--
-- Name: notifications_user_id_read_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_read_at_idx ON public.notifications USING btree (user_id, read_at);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: products_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: stock_movements_corrected_movement_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_corrected_movement_id_idx ON public.stock_movements USING btree (corrected_movement_id);


--
-- Name: stock_movements_correction_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_correction_session_id_idx ON public.stock_movements USING btree (correction_session_id);


--
-- Name: stock_movements_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_created_at_idx ON public.stock_movements USING btree (created_at);


--
-- Name: stock_movements_operation_group_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_operation_group_id_idx ON public.stock_movements USING btree (operation_group_id);


--
-- Name: stock_movements_product_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_product_id_created_at_idx ON public.stock_movements USING btree (product_id, created_at);


--
-- Name: stock_movements_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stock_movements_reference_key ON public.stock_movements USING btree (reference);


--
-- Name: stock_movements_write_off_destination_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_movements_write_off_destination_id_idx ON public.stock_movements USING btree (write_off_destination_id);


--
-- Name: users_email_unique_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_unique_active ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: write_off_destinations_legacy_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX write_off_destinations_legacy_code_key ON public.write_off_destinations USING btree (legacy_code);


--
-- Name: barcode_records barcode_records_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode_records
    ADD CONSTRAINT barcode_records_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: barcode_records barcode_records_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode_records
    ADD CONSTRAINT barcode_records_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expected_receipt_events expected_receipt_events_expected_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_receipt_events
    ADD CONSTRAINT expected_receipt_events_expected_receipt_id_fkey FOREIGN KEY (expected_receipt_id) REFERENCES public.expected_receipts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expected_receipts expected_receipts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_receipts
    ADD CONSTRAINT expected_receipts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lots lots_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_corrected_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_corrected_movement_id_fkey FOREIGN KEY (corrected_movement_id) REFERENCES public.stock_movements(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_write_off_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_write_off_destination_id_fkey FOREIGN KEY (write_off_destination_id) REFERENCES public.write_off_destinations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict pPt6qQjotoNZTc97qC6alVWDHTgVfXnvPcNcPbyiElyKSafy5nDTX3cWTnUajbP

