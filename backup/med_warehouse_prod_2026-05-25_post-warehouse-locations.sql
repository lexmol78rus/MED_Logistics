--
-- PostgreSQL database dump
--

\restrict eJsXdtWPZZUpRWKCKfvAnx0qLe9Bfqu3Xdagw18OkL17uJ6kcojEYORd7X7x2iG

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
-- Name: product_registration_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_registration_certificates (
    id text NOT NULL,
    product_id text NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    uploaded_by text,
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
8931d39c-669b-4528-857c-9df1394f439f	2d65c6680ef6eb40db1cb49011706a9b0acd7bf59891a51b575e8a9f81b84f82	2026-05-25 13:07:56.110097+00	20250525130000_product_registration_certificates	\N	\N	2026-05-25 13:07:56.085025+00	1
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
cmpl62ayy0004z4226eqwr3sw	\N	product.quick_create	product	cmpl62ayu0002z4228q1xaway	{"sku": "533350", "name": "Стент Advanix билиарный (10Fx5cm)", "barcode": "0108714729786726172711041037870723"}	2026-05-25 12:12:23.434
cmpl63mqo000ez422oru7hheu	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl63mqc0007z4224idgwt61	{"quantity": 10, "lotNumber": "37870723", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 12:13:25.344
cmpl640sc000kz422br7pgphq	\N	product.update	product	cmpl62ayu0002z4228q1xaway	{"sku": "533350", "newSku": "M00533350", "changes": {"sku": "M00533350", "name": "Стент Advanix билиарный (10Fx5cm)", "barcode": "0108714729786726172711041037870723", "manufacturer": "Boston Scientific"}}	2026-05-25 12:13:43.548
cmpl654rg000uz422z4ypkkmi	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl654r7000nz422did1kjda	{"quantity": 10, "lotNumber": "37479225", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 12:14:35.357
cmpl6a5hs000vz422r1kui74d	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 12:18:29.585
cmpl6a5hz000wz422mkjnl14y	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 12:18:29.591
cmpl6a5i4000xz4220q57zcfl	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 12:18:29.597
cmpl6ath30013z422s9k31ghd	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 12:19:00.664
cmpl6athj0019z422vm8p4dim	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff.batch	writeoff_batch	17f2fbd0-2a5e-4deb-9e46-6eac0ea59306	{"items": [{"lines": [{"lotId": "cmpl654r7000nz422did1kjda", "quantity": 10}, {"lotId": "cmpl63mqc0007z4224idgwt61", "quantity": 9}], "productId": "cmpl62ayu0002z4228q1xaway", "references": ["ПЕР-0004", "ПЕР-0005"], "writeOffComment": "eat", "operationGroupId": "17f2fbd0-2a5e-4deb-9e46-6eac0ea59306", "writeOffDestinationId": "wod_internal", "writeOffDestinationLabel": "Внутреннее потребление: eat"}], "itemCount": 1, "lineCount": 2, "references": ["ПЕР-0004", "ПЕР-0005"], "operationGroupId": "17f2fbd0-2a5e-4deb-9e46-6eac0ea59306"}	2026-05-25 12:19:00.68
cmpl6ghhp001cz422ndo526t6	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-25 12:23:25.069
cmpl73xqv0006u8sy6uiqgcq7	\N	product.quick_create	product	cmpl73xqm0004u8syozyyy62l	{"sku": "160849063210", "name": "тест", "barcode": "03355566888"}	2026-05-25 12:41:39.223
cmpl83c860002hl4pfgvg8f6w	cmpf7cy2c000e9de7xtf3doa3	auth.login	auth	cmpf7cy2c000e9de7xtf3doa3	{"email": "sklad@navitek.biz"}	2026-05-25 13:09:10.951
cmpl8cc2l0009upjnoxidwkxi	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl63mqc0007z4224idgwt61	{"quantity": 15, "lotNumber": "37870723", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 13:16:10.653
cmpl8cc3c000jupjnz3s01wku	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl654r7000nz422did1kjda	{"quantity": 20, "lotNumber": "37479225", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 13:16:10.681
cmpl9d2ld0006wr1jsuux3lrd	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 13:44:44.641
cmpla0tif000iwr1jka9afqqt	cmpf7cy2c000e9de7xtf3doa3	inventory.fefo.violation	product	cmpl62ayu0002z4228q1xaway	{"actualLotId": "cmpl63mqc0007z4224idgwt61", "expectedLotId": "cmpl654r7000nz422did1kjda"}	2026-05-25 14:03:12.616
cmpla0tiu000owr1jqt93wf2d	cmpf7cy2c000e9de7xtf3doa3	inventory.writeoff.batch	writeoff_batch	213246fd-8500-4f8d-8484-927d637f3828	{"items": [{"lines": [{"lotId": "cmpl654r7000nz422did1kjda", "quantity": 20}, {"lotId": "cmpl63mqc0007z4224idgwt61", "quantity": 16}], "productId": "cmpl62ayu0002z4228q1xaway", "references": ["ПЕР-0008", "ПЕР-0009"], "writeOffComment": null, "operationGroupId": "213246fd-8500-4f8d-8484-927d637f3828", "writeOffDestinationId": "cmpfii3yx000lstrvkacz7ks2", "writeOffDestinationLabel": "ДГБ 2"}], "itemCount": 1, "lineCount": 2, "references": ["ПЕР-0008", "ПЕР-0009"], "operationGroupId": "213246fd-8500-4f8d-8484-927d637f3828"}	2026-05-25 14:03:12.63
cmpla3qlg000ywr1j839wfj3i	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl654r7000nz422did1kjda	{"quantity": 10, "lotNumber": "37479225", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 14:05:28.805
cmpla3qm30018wr1j0wn2vjw5	cmpf7cy2c000e9de7xtf3doa3	inventory.receive	lot	cmpl63mqc0007z4224idgwt61	{"quantity": 20, "lotNumber": "37870723", "productId": "cmpl62ayu0002z4228q1xaway", "expectedReceiptId": null}	2026-05-25 14:05:28.828
cmplabwa4001dwr1j1ydyg4or	cmpe6lgwq0009eityq7uocwm4	auth.login_failed	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru", "reason": "invalid_password"}	2026-05-25 14:11:49.42
cmplabzkj001gwr1jc3w4x7y6	cmpe6lgwq0009eityq7uocwm4	auth.login	auth	cmpe6lgwq0009eityq7uocwm4	{"email": "am@medicine-2000.ru"}	2026-05-25 14:11:53.683
cmplb91u80001n69fn1pwjmmv	\N	lot.location.update	lot	cmpl654r7000nz422did1kjda	{"location": "Тест-А-23", "lotNumber": "37479225", "productId": "cmpl62ayu0002z4228q1xaway"}	2026-05-25 14:37:36.273
\.


--
-- Data for Name: barcode_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.barcode_records (id, barcode, product_id, lot_id, created_at, updated_at) FROM stdin;
cmpl73xqm0005u8sys2kqq3pk	03355566888	cmpl73xqm0004u8syozyyy62l	\N	2026-05-25 12:41:39.214	2026-05-25 12:41:39.214
cmpl640s8000hz422vfrxouzl	0108714729786726172711041037870723	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	2026-05-25 12:13:43.544	2026-05-25 14:05:28.824
\.


--
-- Data for Name: expected_receipt_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expected_receipt_events (id, expected_receipt_id, type, quantity, message, actor_email, created_at) FROM stdin;
\.


--
-- Data for Name: expected_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expected_receipts (id, product_id, ordered_qty, received_qty, status, comment, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_items (id, product_id, lot_id, quantity, location, created_at, updated_at, reserved_quantity) FROM stdin;
cmpla3qly0013wr1jjtbl8jtn	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	20.0000	\N	2026-05-25 14:05:28.823	2026-05-25 14:05:28.823	0.0000
cmpla3ql8000twr1jk94c9bkw	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	10.0000	Тест-А-23	2026-05-25 14:05:28.797	2026-05-25 14:37:36.271	0.0000
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, product_id, lot_number, expiry_date, created_at, updated_at, mfg_date, status) FROM stdin;
cmpl654r7000nz422did1kjda	cmpl62ayu0002z4228q1xaway	37479225	2027-09-17 00:00:00	2026-05-25 12:14:35.347	2026-05-25 14:05:28.792	\N	OK
cmpl63mqc0007z4224idgwt61	cmpl62ayu0002z4228q1xaway	37870723	2027-11-04 00:00:00	2026-05-25 12:13:25.333	2026-05-25 14:05:28.82	\N	OK
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, channel, payload, read_at, created_at, type, priority, title, message, href) FROM stdin;
login-fail-cmplabwa4001dwr1j1ydyg4or	cmpe6lgwq0009eityq7uocwm4	in_app	{"key": "login-fail-cmplabwa4001dwr1j1ydyg4or"}	\N	2026-05-25 14:11:53.77	failed_login	HIGH	Неудачный вход	am@medicine-2000.ru	/users
fefo-cmpla0tif000iwr1jka9afqqt	\N	in_app	{"key": "fefo-cmpla0tif000iwr1jka9afqqt"}	\N	2026-05-25 14:03:39.707	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
fefo-cmpl9d2ld0006wr1jsuux3lrd	\N	in_app	{"key": "fefo-cmpl9d2ld0006wr1jsuux3lrd"}	\N	2026-05-25 13:44:45.493	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
fefo-cmpl6ath30013z422s9k31ghd	\N	in_app	{"key": "fefo-cmpl6ath30013z422s9k31ghd"}	2026-05-25 13:11:06.513	2026-05-25 12:19:41.723	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
fefo-cmpl6a5i4000xz4220q57zcfl	\N	in_app	{"key": "fefo-cmpl6a5i4000xz4220q57zcfl"}	2026-05-25 13:11:20.671	2026-05-25 12:18:41.722	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
fefo-cmpl6a5hz000wz422mkjnl14y	\N	in_app	{"key": "fefo-cmpl6a5hz000wz422mkjnl14y"}	2026-05-25 13:11:20.671	2026-05-25 12:18:41.725	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
fefo-cmpl6a5hs000vz422r1kui74d	\N	in_app	{"key": "fefo-cmpl6a5hs000vz422r1kui74d"}	2026-05-25 13:11:20.671	2026-05-25 12:18:41.726	fefo_violation	CRITICAL	Нарушение FEFO	Продукт cmpl62ayu0002z4228q1xaway	/write-off
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
cmpe8ajnm000at700myf7ta9j	cmpe6lgwq0009eityq7uocwm4	41159e330c12ea3e392290d9d4bc9cee3da6649cdaecd5434a9dcccfc7d833da	2026-05-20 15:55:23.936	2026-05-20 15:40:50.491	2026-05-20 15:40:23.938
cmpf941q00016oxdtokw07xjf	cmpe8c28f000ft7005ljr56w2	ee0d37b9c04c7e5ab1a226e5d5f8f358a45732f4c1c11817e2b06349f5740322	2026-05-21 09:06:06.55	2026-05-21 08:51:36.317	2026-05-21 08:51:06.552
\.


--
-- Data for Name: product_registration_certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_registration_certificates (id, product_id, file_name, original_name, mime_type, file_size, storage_path, uploaded_by, created_at) FROM stdin;
cmpl896gl0001upjn0xdrf3gi	cmpl62ayu0002z4228q1xaway	cmpl896gl0001upjn0xdrf3gi.pdf	Ð Ð£ 12601.pdf	application/pdf	4740503	/app/uploads/ru/cmpl62ayu0002z4228q1xaway/cmpl896gl0001upjn0xdrf3gi.pdf	sklad@navitek.biz	2026-05-25 13:13:43.413
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, sku, name, created_at, updated_at, manufacturer, min_stock, reorder_point) FROM stdin;
cmpl62ayu0002z4228q1xaway	M00533350	Стент Advanix билиарный (10Fx5cm)	2026-05-25 12:12:23.431	2026-05-25 12:13:43.542	Boston Scientific	\N	\N
cmpl73xqm0004u8syozyyy62l	160849063210	тест	2026-05-25 12:41:39.214	2026-05-25 12:41:39.214	ТЕСТ	\N	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, created_at) FROM stdin;
cmph7zkm7000110ae1wu2lr9k	cmpe6lgwq0009eityq7uocwm4	8d7ca9fe86002a5b9ae5e6a8f31e7a835736696f602146de8b68515a5029e757	2026-05-29 17:55:10.493	2026-05-22 17:55:10.496
cmpl3nv7z00z310aeh85o2bze	cmpe6lgwq0009eityq7uocwm4	463d731ac4db5e9368fb2e0facea6c2c74baaa9fab1b6172ab8f25a300104750	2026-06-01 11:05:10.606	2026-05-25 11:05:10.607
cmpgz49d00003mw1xoxmxvge6	cmpfl6gyd000zjzrra4c7q7u0	f3c868f982b8876c0ab278b4302e886a36c0080614c4a7d2afcd09b8cf664891	2026-05-29 13:46:52.642	2026-05-22 13:46:52.644
cmpl5wm6k000m44y2k82swvqn	cmpe6lgwq0009eityq7uocwm4	b1062110797a97e21262e84a4060690a1cb7b1cde22837ffe4c03ad68c14ae26	2026-06-01 12:07:58.027	2026-05-25 12:07:58.029
cmpl7jsai000au8sycp3shild	cmpf7cy2c000e9de7xtf3doa3	f2f1783a51f577d9895aba6a4b259eed5c98e6bf61d68b4ad89b0c5e6e966059	2026-06-01 12:53:58.648	2026-05-25 12:53:58.651
cmpl9rugz000fwr1jdo2c2mjn	cmpe6lgwq0009eityq7uocwm4	051ea1ca4f4ab7452e147986aeca3b5bd0480cf205bbd16190b6fd0f6f6d8ae2	2026-06-01 13:56:13.953	2026-05-25 13:56:13.956
cmpl16sic00yb10ae886ajca9	cmpfl6gyd000zjzrra4c7q7u0	7c29cadf76e387f5ba2fb124ade3660160037b70e3d691e6918fcaa425a23a48	2026-06-01 09:55:54.707	2026-05-25 09:55:54.709
cmplatih7001iwr1j6ea3qjy6	cmpf7cy2c000e9de7xtf3doa3	7f285a6a6545ea28e3f60727eb4e0ac804818f6705693ee46bdf7ed518c200dc	2026-06-01 14:25:31.337	2026-05-25 14:25:31.34
cmplav3qd001kwr1jn5uqfpkm	cmpe8c28f000ft7005ljr56w2	b6efc06fb710b0cee7d5b3cac48b5f4f152b806d9e5f84e04c991930d85cda18	2026-06-01 14:26:45.539	2026-05-25 14:26:45.542
cmplavsxq001mwr1jz81ztors	cmpe6lgwq0009eityq7uocwm4	0b7280d0dcf524b20544d37a88459ff0dac745947145a133f8e352739a295301	2026-06-01 14:27:18.205	2026-05-25 14:27:18.206
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_movements (id, reference, product_id, lot_id, type, quantity, actor_email, created_at, write_off_destination, write_off_comment, write_off_destination_id, operation_group_id, corrected_movement_id, correction_session_id, edit_reason) FROM stdin;
cmpl63mqm000dz422ez3n2new	ПЕР-0001	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	RECEIPT	10.0000	sklad@navitek.biz	2026-05-25 12:13:25.343	\N	\N	\N	\N	\N	\N	\N
cmpl640sa000jz42215hqscfa	ПЕР-0002	cmpl62ayu0002z4228q1xaway	\N	ADJUSTMENT	0.0000	sklad@navitek.biz	2026-05-25 12:13:43.547	\N	\N	\N	\N	\N	\N	\N
cmpl654re000tz422u87kxpkk	ПЕР-0003	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	RECEIPT	10.0000	sklad@navitek.biz	2026-05-25 12:14:35.354	\N	\N	\N	\N	\N	\N	\N
cmpl6athd0016z4224w1pj7x4	ПЕР-0004	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	ISSUE	10.0000	sklad@navitek.biz	2026-05-25 12:19:00.673	INTERNAL	eat	wod_internal	17f2fbd0-2a5e-4deb-9e46-6eac0ea59306	\N	\N	\N
cmpl6athi0018z422rro4qzra	ПЕР-0005	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	ISSUE	9.0000	sklad@navitek.biz	2026-05-25 12:19:00.678	INTERNAL	eat	wod_internal	17f2fbd0-2a5e-4deb-9e46-6eac0ea59306	\N	\N	\N
cmpl8cc2j0008upjn4lmcy6s9	ПЕР-0006	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	RECEIPT	15.0000	sklad@navitek.biz	2026-05-25 13:16:10.651	\N	\N	\N	\N	\N	\N	\N
cmpl8cc3b000iupjnp1pvevh6	ПЕР-0007	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	RECEIPT	20.0000	sklad@navitek.biz	2026-05-25 13:16:10.68	\N	\N	\N	\N	\N	\N	\N
cmpla0tim000lwr1jcwt7vbev	ПЕР-0008	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	ISSUE	20.0000	sklad@navitek.biz	2026-05-25 14:03:12.623	\N	\N	cmpfii3yx000lstrvkacz7ks2	213246fd-8500-4f8d-8484-927d637f3828	\N	\N	\N
cmpla0tit000nwr1j29dqxie1	ПЕР-0009	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	ISSUE	16.0000	sklad@navitek.biz	2026-05-25 14:03:12.629	\N	\N	cmpfii3yx000lstrvkacz7ks2	213246fd-8500-4f8d-8484-927d637f3828	\N	\N	\N
cmpla3qle000xwr1jscm1rw18	ПЕР-0010	cmpl62ayu0002z4228q1xaway	cmpl654r7000nz422did1kjda	RECEIPT	10.0000	sklad@navitek.biz	2026-05-25 14:05:28.802	\N	\N	\N	\N	\N	\N	\N
cmpla3qm20017wr1j8mrce8o7	ПЕР-0011	cmpl62ayu0002z4228q1xaway	cmpl63mqc0007z4224idgwt61	RECEIPT	20.0000	sklad@navitek.biz	2026-05-25 14:05:28.826	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, payload, updated_at, updated_by) FROM stdin;
default	{"mail": {"smtp": {"from": "noreply@medicine-2000.ru", "host": "smtp.yandex.ru", "port": 465, "user": "noreply@medicine-2000.ru", "secure": true, "passwordEnc": "v1:lgMxLQuyUheR1Bzz:DQHPHboIQxfpH8umoYDXeA==:N60fUHzkxyixPT7PsghqiQ=="}, "notifications": {"system": false, "lowStock": false, "lotRecall": false, "authFailed": false, "lotBlocked": false, "passwordReset": true, "expiryCritical": false}}, "fefoStrict": true, "fefoEnabled": true, "uiAnimations": true, "uiCompactMode": false, "warehouseCode": "WH-01", "warehouseName": "МЕД-ЛОГИСТИКА — Склад №1", "uiShowFefoHints": true, "scannerAutoFocus": true, "expiryWarningDays": 180, "scannerDebounceMs": 300, "expiryCriticalDays": 90, "notificationEnabled": true, "scannerSoundEnabled": true, "uiAutoRefreshDashboard": false}	2026-05-25 11:20:52.279	am@medicine-2000.ru
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, role, is_active, created_at, updated_at, display_name, last_login_at, deleted_at) FROM stdin;
cmpf7cy2c000e9de7xtf3doa3	sklad@navitek.biz	$2b$10$LrnsaZanb2Jxn.a.3l2z2eMf4kn22766iIFJ2vNS3sGqtQlkRHVOa	ADMIN	t	2026-05-21 08:02:02.484	2026-05-25 13:09:10.951	Naumov	2026-05-25 13:09:10.95	\N
cmpe6lgwq0009eityq7uocwm4	am@medicine-2000.ru	$2b$10$IHTL/UOVPy/MczWOX1bGT.1L4YTipxucNkTVc6BU6eF3idg6dG8.2	ADMIN	t	2026-05-20 14:52:54.362	2026-05-25 14:11:53.683	lexmol	2026-05-25 14:11:53.682	\N
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
-- Name: product_registration_certificates product_registration_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_registration_certificates
    ADD CONSTRAINT product_registration_certificates_pkey PRIMARY KEY (id);


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
-- Name: product_registration_certificates_product_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_registration_certificates_product_id_created_at_idx ON public.product_registration_certificates USING btree (product_id, created_at);


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
-- Name: product_registration_certificates product_registration_certificates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_registration_certificates
    ADD CONSTRAINT product_registration_certificates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


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

\unrestrict eJsXdtWPZZUpRWKCKfvAnx0qLe9Bfqu3Xdagw18OkL17uJ6kcojEYORd7X7x2iG

