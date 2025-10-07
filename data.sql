SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict vJQJrymIQgbKX4xNV2l3HN2EhC0TsGZZ57vnEKJvBtaZLbdaiCsuVx6lvtb3Si3

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
00000000-0000-0000-0000-000000000000	d08a6455-3583-4644-a95e-c9a8eb57bf8c	{"action":"user_signedup","actor_id":"f4ee15fa-8545-4375-b46c-1d65964de085","actor_username":"khoshi19@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-08-31 10:43:10.464395+00	
00000000-0000-0000-0000-000000000000	342c701a-7dde-466a-895a-424065f74b61	{"action":"login","actor_id":"f4ee15fa-8545-4375-b46c-1d65964de085","actor_username":"khoshi19@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-31 10:43:10.49661+00	
00000000-0000-0000-0000-000000000000	b0684f2b-b46b-4378-97ef-f4f8c77f94fc	{"action":"logout","actor_id":"f4ee15fa-8545-4375-b46c-1d65964de085","actor_username":"khoshi19@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-08-31 10:46:15.285172+00	
00000000-0000-0000-0000-000000000000	f3e8f707-da4a-42fe-b1bc-49187382d118	{"action":"user_signedup","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-08-31 10:46:36.552911+00	
00000000-0000-0000-0000-000000000000	ca2a4cec-48e3-40a5-8534-c9cbf5a2bc32	{"action":"login","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-08-31 10:46:36.55802+00	
00000000-0000-0000-0000-000000000000	f222a342-fcfe-4780-a480-1913488073e4	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 04:25:40.068788+00	
00000000-0000-0000-0000-000000000000	a8059203-3c20-433c-b9b4-dab8a49b4cf7	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 04:25:40.089745+00	
00000000-0000-0000-0000-000000000000	077bb46b-8bbb-474e-88cd-fbfd51b879d5	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 05:36:43.441727+00	
00000000-0000-0000-0000-000000000000	1290be94-2442-4743-8275-a29dd0d729db	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 05:36:43.450789+00	
00000000-0000-0000-0000-000000000000	851aa140-b71c-4fb0-b07a-8e3c3a29ce37	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 06:40:03.964136+00	
00000000-0000-0000-0000-000000000000	1ef49de3-6e59-4076-b87e-980c3792312d	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 06:40:03.969509+00	
00000000-0000-0000-0000-000000000000	e019f341-de5a-4d60-864f-db2438455f8c	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 08:29:49.729282+00	
00000000-0000-0000-0000-000000000000	3e4bd79b-68a4-482a-a3d4-162838ea11ee	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 08:29:49.736046+00	
00000000-0000-0000-0000-000000000000	727e1965-a921-4109-b2ff-6c5fb83476f1	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 10:15:17.901846+00	
00000000-0000-0000-0000-000000000000	57cbdbdc-d2d5-4039-88c8-5191c83921a0	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-01 10:15:17.911787+00	
00000000-0000-0000-0000-000000000000	e4dc93e6-068c-4c0a-bd9a-878593de7c9e	{"action":"login","actor_id":"f4ee15fa-8545-4375-b46c-1d65964de085","actor_username":"khoshi19@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-02 12:27:36.89192+00	
00000000-0000-0000-0000-000000000000	bbdc2a94-5097-4c5b-8a76-281737675a28	{"action":"logout","actor_id":"f4ee15fa-8545-4375-b46c-1d65964de085","actor_username":"khoshi19@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-02 12:28:09.664788+00	
00000000-0000-0000-0000-000000000000	c50ee82d-8ad5-49b3-ab82-f6b344c01b5b	{"action":"login","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-02 12:28:27.874684+00	
00000000-0000-0000-0000-000000000000	a0504411-f3bf-4bdb-bb71-733562f7849d	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 13:41:20.689555+00	
00000000-0000-0000-0000-000000000000	001740e4-7e52-4106-9841-3cd58537b4fc	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-02 13:41:20.709565+00	
00000000-0000-0000-0000-000000000000	23e5de53-9706-44a8-ac6a-e836de387d4b	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 07:59:40.353827+00	
00000000-0000-0000-0000-000000000000	109a13de-acfd-4bf7-8ab0-fdd1161561e8	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 07:59:40.366084+00	
00000000-0000-0000-0000-000000000000	d4d9ad55-4f41-4bed-96b8-4076e476a220	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 09:01:11.801475+00	
00000000-0000-0000-0000-000000000000	260266ab-9068-4828-8442-f26453129cb5	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 09:01:11.81351+00	
00000000-0000-0000-0000-000000000000	2e3b3e59-d7e6-4eb1-8533-7b660be402b8	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 10:00:03.467201+00	
00000000-0000-0000-0000-000000000000	0ef47a8b-4f9b-4040-a524-419626bd455f	{"action":"token_revoked","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 10:00:03.493599+00	
00000000-0000-0000-0000-000000000000	1622f905-67f7-4a21-8ad3-3d21d27e98c7	{"action":"token_refreshed","actor_id":"774c8000-4f34-4de1-b0a8-493fc37d2f9d","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-03 10:00:04.351658+00	
00000000-0000-0000-0000-000000000000	ee7e202d-5ddd-4d08-8db8-cf8500de24ae	{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"muhammadiqbal@gmail.com","user_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","user_phone":""}}	2025-09-03 15:02:40.807714+00	
00000000-0000-0000-0000-000000000000	3f070193-5ed3-4f49-8c38-ba33e8c927c3	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-03 15:13:10.960319+00	
00000000-0000-0000-0000-000000000000	18300fc5-8381-4d4e-8a1d-dd1fe3b56a64	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 07:01:35.594931+00	
00000000-0000-0000-0000-000000000000	2ae978d1-fb4b-413f-a417-9af74a043331	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 07:01:35.603717+00	
00000000-0000-0000-0000-000000000000	bbbe701b-63dc-4072-9b42-3ec0154d1a82	{"action":"logout","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-04 07:01:51.355206+00	
00000000-0000-0000-0000-000000000000	788450f5-0010-46eb-b209-bd7fa715d8c7	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-04 07:02:04.179186+00	
00000000-0000-0000-0000-000000000000	fb1ac9a2-cf4a-48f5-8936-fbdc5aebe80f	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 12:54:56.703349+00	
00000000-0000-0000-0000-000000000000	9490e1d8-e8d1-47af-b384-924df1c3d5d0	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-04 12:54:56.738337+00	
00000000-0000-0000-0000-000000000000	09c88b40-051e-4fd6-b0fc-8699590b11e4	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 11:38:54.473012+00	
00000000-0000-0000-0000-000000000000	234d9489-e222-4471-bcc7-cf39051b6dfc	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 11:38:54.486418+00	
00000000-0000-0000-0000-000000000000	5d392693-85eb-41ed-bedf-00f581a34f24	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-05 15:41:32.313785+00	
00000000-0000-0000-0000-000000000000	0760369d-69da-4202-9884-f06f8ee32958	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 15:42:07.894509+00	
00000000-0000-0000-0000-000000000000	d6ad11e7-2a7e-4b83-938d-2ae6c7bdb9ca	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-05 15:42:07.896173+00	
00000000-0000-0000-0000-000000000000	88746e07-7018-4b93-b022-3d3e1e8b5c36	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-05 15:51:20.139908+00	
00000000-0000-0000-0000-000000000000	816acf10-31e2-4867-91c4-4b1ff615ffbe	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-06 01:37:17.704737+00	
00000000-0000-0000-0000-000000000000	09e7acb3-876f-4a2a-a5c9-07330496adb1	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-06 01:37:17.719236+00	
00000000-0000-0000-0000-000000000000	f7a63344-3920-4117-be89-8ff5b05f9851	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-06 09:01:39.207494+00	
00000000-0000-0000-0000-000000000000	3f40f559-be53-45b9-a203-c8e34a987be3	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-06 14:10:16.525855+00	
00000000-0000-0000-0000-000000000000	c6558b33-0f3b-460b-a4e7-b22edd5ef699	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-06 14:10:16.549646+00	
00000000-0000-0000-0000-000000000000	2cecf4b6-968b-4fdf-bd09-3e358c3a068b	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 03:57:47.45107+00	
00000000-0000-0000-0000-000000000000	839ad5f9-767f-4170-a5b0-7c8ac0ad110d	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 03:57:47.467264+00	
00000000-0000-0000-0000-000000000000	d026516f-eb17-494e-b380-a74339370c25	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 05:09:44.176445+00	
00000000-0000-0000-0000-000000000000	4a922974-ba48-42e4-8b8a-bd218ff96fbd	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 05:09:44.202135+00	
00000000-0000-0000-0000-000000000000	93e22264-75d9-4ab4-b63c-02c3775d6da4	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 05:28:42.051357+00	
00000000-0000-0000-0000-000000000000	d7c3c22e-f3fb-4a42-8a38-939db9875139	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 05:28:42.059532+00	
00000000-0000-0000-0000-000000000000	19b47f21-ef64-48d5-bba3-df85460625c4	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 08:22:26.678325+00	
00000000-0000-0000-0000-000000000000	8b71ed4f-74fc-49f8-9858-3bc1a2b1384b	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 08:22:26.699177+00	
00000000-0000-0000-0000-000000000000	86b85859-1ab9-48bd-9707-0463ea3a12b6	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 08:38:01.79045+00	
00000000-0000-0000-0000-000000000000	b78f1820-ae3e-4855-a287-66699ea8d465	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 08:38:01.804345+00	
00000000-0000-0000-0000-000000000000	25d7c096-7c7a-49cd-938b-646e421b5506	{"action":"user_signedup","actor_id":"c5639035-0617-4c34-aff1-a7bb1d6809a9","actor_username":"connecthassanraza@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-07 08:53:19.060092+00	
00000000-0000-0000-0000-000000000000	5db62a7f-6e10-43dd-906c-e71fb514db7c	{"action":"login","actor_id":"c5639035-0617-4c34-aff1-a7bb1d6809a9","actor_username":"connecthassanraza@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-07 08:53:19.083783+00	
00000000-0000-0000-0000-000000000000	d61f39a9-eebc-40aa-8d50-ac22b358b87c	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 09:20:55.202984+00	
00000000-0000-0000-0000-000000000000	48b45ecb-b8ab-4a51-9073-81861b340c1d	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 09:20:55.216464+00	
00000000-0000-0000-0000-000000000000	e447cb7f-2b4d-453c-815d-e85671eff8a5	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 11:27:52.49901+00	
00000000-0000-0000-0000-000000000000	5966cb29-f37e-4d03-9e9c-cb34b5b28ed1	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 11:27:52.522695+00	
00000000-0000-0000-0000-000000000000	ec7f1e33-74d3-48aa-bfea-6d9d206cd6d2	{"action":"user_signedup","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-07 11:59:42.205053+00	
00000000-0000-0000-0000-000000000000	9fdf9584-a13f-4b32-b489-16676e585a2d	{"action":"login","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-07 11:59:42.218603+00	
00000000-0000-0000-0000-000000000000	c5c18dc5-6d6f-4541-9bbc-7c0e78a09f68	{"action":"user_signedup","actor_id":"5fc9f533-ecd5-4382-a149-fd9633bb7d7b","actor_username":"test1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-07 12:20:44.660033+00	
00000000-0000-0000-0000-000000000000	3e33c0f6-60c6-4a45-bbe3-e516710c9aaa	{"action":"login","actor_id":"5fc9f533-ecd5-4382-a149-fd9633bb7d7b","actor_username":"test1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-07 12:20:44.672489+00	
00000000-0000-0000-0000-000000000000	778d14d0-6233-4351-9c11-8bb345085894	{"action":"token_refreshed","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 12:58:34.800523+00	
00000000-0000-0000-0000-000000000000	db1e2baa-4e2d-455b-8356-4f4ea426cfcd	{"action":"token_revoked","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-07 12:58:34.810469+00	
00000000-0000-0000-0000-000000000000	920989cb-a6cd-440c-a3f7-92033323024e	{"action":"token_refreshed","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 01:41:59.122834+00	
00000000-0000-0000-0000-000000000000	245c9bf9-c315-42b2-82f2-1bf4824601d6	{"action":"token_revoked","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 01:41:59.139972+00	
00000000-0000-0000-0000-000000000000	8d0d576d-8a9b-4593-a3d9-9584a2238782	{"action":"token_refreshed","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 02:42:49.072124+00	
00000000-0000-0000-0000-000000000000	d75e171f-40c7-4a19-b4e9-1c8382dff1ac	{"action":"token_revoked","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 02:42:49.08494+00	
00000000-0000-0000-0000-000000000000	217a0289-da7f-4d23-b211-b45c3f4f3fdc	{"action":"token_refreshed","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 03:42:46.625528+00	
00000000-0000-0000-0000-000000000000	c0937375-b6a8-4c4c-b1b1-5f493bb2aa6c	{"action":"token_revoked","actor_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 03:42:46.647407+00	
00000000-0000-0000-0000-000000000000	a81208d1-544f-49fd-bfba-b91d0847a7a8	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test@gmail.com","user_id":"8bb0ad4d-73ec-4549-80bd-78dbcc7e6e43","user_phone":""}}	2025-09-08 04:14:50.265656+00	
00000000-0000-0000-0000-000000000000	b91cb753-2357-4800-8268-3f46968aba25	{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"test1@gmail.com","user_id":"5fc9f533-ecd5-4382-a149-fd9633bb7d7b","user_phone":""}}	2025-09-08 04:14:50.265109+00	
00000000-0000-0000-0000-000000000000	07de998a-90b2-4077-8f8d-d6770050b391	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-08 04:15:09.137718+00	
00000000-0000-0000-0000-000000000000	cab920e6-107e-4dc6-8a1c-932f9159e8d0	{"action":"logout","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-08 04:15:22.539636+00	
00000000-0000-0000-0000-000000000000	2596faf7-9d30-454e-80f3-7b3cb6d1cc44	{"action":"user_signedup","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-08 04:15:42.084968+00	
00000000-0000-0000-0000-000000000000	fb88785c-e010-4f21-b3bd-0a6cce24e763	{"action":"login","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-08 04:15:42.088686+00	
00000000-0000-0000-0000-000000000000	f04f4256-d4e3-4182-bedf-d80be38ffa7d	{"action":"token_refreshed","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 05:20:50.607574+00	
00000000-0000-0000-0000-000000000000	12c3c91f-d574-428b-9b0f-780ae160ab99	{"action":"token_revoked","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 05:20:50.615324+00	
00000000-0000-0000-0000-000000000000	c5066890-fe05-467c-8ab4-27597173bb93	{"action":"token_refreshed","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 06:55:55.618736+00	
00000000-0000-0000-0000-000000000000	1b539c6c-d690-4fb4-ae36-e40153826186	{"action":"token_revoked","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 06:55:55.64345+00	
00000000-0000-0000-0000-000000000000	9c204bd8-f478-49c3-ac3d-2b2a2715fd51	{"action":"token_refreshed","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 09:21:00.23247+00	
00000000-0000-0000-0000-000000000000	fe1ea838-d828-448d-ad83-84554ac2d654	{"action":"token_revoked","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 09:21:00.245388+00	
00000000-0000-0000-0000-000000000000	e3d85813-7f1a-40fe-b2c7-cd379681522f	{"action":"logout","actor_id":"339c2626-f428-4824-91c7-d5f9c1679542","actor_username":"khushimuhammad@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-08 09:24:02.752048+00	
00000000-0000-0000-0000-000000000000	825f9074-82e1-4b58-90ea-75d40c27718f	{"action":"user_signedup","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-08 09:24:27.34504+00	
00000000-0000-0000-0000-000000000000	118befa8-c4e0-42a9-99a8-9693194272b5	{"action":"login","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-08 09:24:27.357273+00	
00000000-0000-0000-0000-000000000000	ecf4b6fb-e81f-4bbe-b412-570e97541780	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-08 09:26:02.926579+00	
00000000-0000-0000-0000-000000000000	89533f82-0acf-4a48-94e9-bb25ecd21abe	{"action":"token_refreshed","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 13:08:26.920443+00	
00000000-0000-0000-0000-000000000000	ebca9710-e590-47e1-b20e-7bb7775964e9	{"action":"token_revoked","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 13:08:26.936827+00	
00000000-0000-0000-0000-000000000000	2f0447fd-1065-4678-a1f0-a82e72770f30	{"action":"token_refreshed","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 14:49:49.35839+00	
00000000-0000-0000-0000-000000000000	cf1e4208-3fd2-43eb-97d5-3632a49278f7	{"action":"token_revoked","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-08 14:49:49.373221+00	
00000000-0000-0000-0000-000000000000	730d7316-e60d-4a0e-955c-64371dc7d48c	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 00:05:34.627115+00	
00000000-0000-0000-0000-000000000000	d1c1c51e-e286-4ff0-8bf9-2d2ffa51b6c7	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 00:05:34.65622+00	
00000000-0000-0000-0000-000000000000	c51e3f0f-8eba-46f3-83be-8633daa2f813	{"action":"token_refreshed","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 03:07:18.054589+00	
00000000-0000-0000-0000-000000000000	91578ee5-ab73-444c-a9cb-8c7829a6bbbb	{"action":"token_revoked","actor_id":"4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd","actor_username":"sabir@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 03:07:18.079857+00	
00000000-0000-0000-0000-000000000000	3791913e-7d17-4c9b-89c7-56568245213a	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 08:06:51.081564+00	
00000000-0000-0000-0000-000000000000	392d3d76-5089-499c-a4c4-a4b495bf6f18	{"action":"logout","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-09 08:37:23.304256+00	
00000000-0000-0000-0000-000000000000	6959cb4d-3c88-4ed6-b123-3f5520b2c51e	{"action":"user_signedup","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-09 08:37:44.527319+00	
00000000-0000-0000-0000-000000000000	a8524dba-887f-4abf-add4-bcd2fc964b71	{"action":"login","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 08:37:44.542078+00	
00000000-0000-0000-0000-000000000000	677b3f03-37ec-4b71-8aa2-1b0e7b99effa	{"action":"user_updated_password","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-09 09:13:35.34518+00	
00000000-0000-0000-0000-000000000000	7e9e4de5-84ea-4bee-b14d-5a5352113703	{"action":"user_modified","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"user"}	2025-09-09 09:13:35.3587+00	
00000000-0000-0000-0000-000000000000	14edd126-e85a-4e40-9a7e-b9fe7fe24073	{"action":"logout","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-09 09:13:57.390299+00	
00000000-0000-0000-0000-000000000000	12966782-7a2e-4272-ad22-cb267b5d1169	{"action":"login","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 09:14:33.589423+00	
00000000-0000-0000-0000-000000000000	b0a3184a-3da9-487a-9a36-3c480d021929	{"action":"logout","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-09 09:15:57.376804+00	
00000000-0000-0000-0000-000000000000	87cb365b-a114-4122-9511-3ff2915a4dbf	{"action":"login","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 09:17:03.286974+00	
00000000-0000-0000-0000-000000000000	3b7b1139-3125-469e-a158-2490c7639fc7	{"action":"logout","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-09 09:59:20.608787+00	
00000000-0000-0000-0000-000000000000	1aaf7afe-7575-4a47-ae69-73e62b458bf8	{"action":"login","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 09:59:33.884662+00	
00000000-0000-0000-0000-000000000000	7cc88539-0d4c-489e-9b35-6021f8b60825	{"action":"login","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 10:01:37.515344+00	
00000000-0000-0000-0000-000000000000	dc4ba5b5-1559-483f-b13f-cde658585785	{"action":"token_refreshed","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 11:10:23.148209+00	
00000000-0000-0000-0000-000000000000	48d91a11-8556-48b3-ba7e-688ecb4ea395	{"action":"token_revoked","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 11:10:23.16243+00	
00000000-0000-0000-0000-000000000000	96d8625b-2db7-4a29-87a9-d9bcece973de	{"action":"token_refreshed","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 12:26:22.273884+00	
00000000-0000-0000-0000-000000000000	6f29c3fa-ac4e-45eb-9f9b-d79aba943638	{"action":"token_revoked","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 12:26:22.290288+00	
00000000-0000-0000-0000-000000000000	2b190245-2841-434e-8b2c-8dfb86cfa06b	{"action":"token_refreshed","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 14:57:42.059955+00	
00000000-0000-0000-0000-000000000000	93f066dc-5886-48c6-9bee-605465c324f8	{"action":"token_revoked","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 14:57:42.07597+00	
00000000-0000-0000-0000-000000000000	62c13f1a-a159-4602-8c39-ae4ae6bb5869	{"action":"token_refreshed","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 23:12:29.610564+00	
00000000-0000-0000-0000-000000000000	48baf6d3-5032-4705-9dfd-7879309bf72d	{"action":"token_revoked","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-09 23:12:29.634654+00	
00000000-0000-0000-0000-000000000000	917f735e-16bc-4220-9476-740ba1cac975	{"action":"logout","actor_id":"728cf0b0-304a-42b7-95a4-3caf1132aca8","actor_username":"sabra@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-09 23:18:04.759167+00	
00000000-0000-0000-0000-000000000000	597ceb18-6336-4e4c-b887-f20f36ee77ef	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-09 23:18:10.094996+00	
00000000-0000-0000-0000-000000000000	f0e7a94d-b087-4f5f-baee-bc5c2a05ebc5	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 00:21:12.00436+00	
00000000-0000-0000-0000-000000000000	5567b6a5-7fec-4217-8533-782394dc1da0	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 00:21:12.024207+00	
00000000-0000-0000-0000-000000000000	6fd28ee2-7831-4710-ae63-f2513783d17b	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-10 03:51:16.302604+00	
00000000-0000-0000-0000-000000000000	e9d0fed6-3515-45b6-8936-6d56347572fb	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 05:03:47.743375+00	
00000000-0000-0000-0000-000000000000	c1c040d6-6f16-403a-b6a7-ac148267a12f	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 05:03:47.763688+00	
00000000-0000-0000-0000-000000000000	b8f03db0-0136-48ed-b359-a32463d8e5c6	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 06:57:49.69609+00	
00000000-0000-0000-0000-000000000000	cb5b126e-10a8-4e15-a995-28018332e2b7	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 06:57:49.716316+00	
00000000-0000-0000-0000-000000000000	f8197170-11c6-493d-89ad-d421ea52d7e2	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 11:36:41.66766+00	
00000000-0000-0000-0000-000000000000	1093bbf8-72de-4b73-9c47-67109cb55b54	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 11:36:41.691553+00	
00000000-0000-0000-0000-000000000000	867650b4-a098-4d9a-85aa-d9b243b4a79a	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 12:36:44.489813+00	
00000000-0000-0000-0000-000000000000	2f016385-e22a-4806-b821-55cc17a990cf	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 12:36:44.510996+00	
00000000-0000-0000-0000-000000000000	e4b50dfd-0d11-4b74-987f-63bd95c041d6	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 12:48:10.924993+00	
00000000-0000-0000-0000-000000000000	fa773ec3-cd97-4f11-a2db-30ae26a21f2e	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 12:50:02.340182+00	
00000000-0000-0000-0000-000000000000	60869b0a-1810-414b-b5d1-0bd4ab851632	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 12:50:02.343757+00	
00000000-0000-0000-0000-000000000000	9d13a32b-41f6-46ff-95aa-590c0cccfa19	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 15:22:49.000692+00	
00000000-0000-0000-0000-000000000000	8627668d-9ec5-4ce8-bbee-158016fdaa98	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-10 15:22:49.021122+00	
00000000-0000-0000-0000-000000000000	ad53e8c6-2c2a-453c-ab08-44e193d29287	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 00:52:04.596646+00	
00000000-0000-0000-0000-000000000000	bb46f44a-272c-4a0d-aa2b-d201f8f78842	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 00:52:04.616198+00	
00000000-0000-0000-0000-000000000000	e9e5c38d-4f0c-4a9d-b3fa-62fad9038ac7	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 02:04:18.079844+00	
00000000-0000-0000-0000-000000000000	c856dc69-70dd-4359-9919-17ee85db10c4	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 02:04:18.107888+00	
00000000-0000-0000-0000-000000000000	45421484-0cdb-4de7-befe-1b22fcfeed01	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 07:06:52.201027+00	
00000000-0000-0000-0000-000000000000	1bdbfdae-5b10-420e-a7e5-d76d8cf2d354	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 07:06:52.217833+00	
00000000-0000-0000-0000-000000000000	dd544f66-adf7-413a-8403-5dff3f68febf	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 15:15:26.292679+00	
00000000-0000-0000-0000-000000000000	62a729c1-1ed6-4f17-a640-9dea48409665	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-11 15:15:26.317745+00	
00000000-0000-0000-0000-000000000000	48818ca6-0d3e-4e34-9102-cff48f162db4	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 16:22:28.224194+00	
00000000-0000-0000-0000-000000000000	31a3e568-ca4e-4769-b5a6-28c64e92408f	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 16:22:28.244058+00	
00000000-0000-0000-0000-000000000000	f8b94ee8-e7e6-42de-bcf3-eebf61bf8cdb	{"action":"logout","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-12 16:26:28.142904+00	
00000000-0000-0000-0000-000000000000	66a6f725-cbc6-442b-8e86-61cd2ab2c58a	{"action":"user_signedup","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-12 16:26:47.816968+00	
00000000-0000-0000-0000-000000000000	eeb346fd-63b1-44b4-95eb-3fd9580af057	{"action":"login","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 16:26:47.823339+00	
00000000-0000-0000-0000-000000000000	dcffb99f-0abe-416e-8e9d-f323f132c7d2	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-12 17:04:48.202855+00	
00000000-0000-0000-0000-000000000000	6ae34919-96b1-4939-8d94-f620e0cc06bb	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 22:30:07.599477+00	
00000000-0000-0000-0000-000000000000	d96692a1-8fef-4f4b-86c0-ccedce85db4b	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 22:30:07.628113+00	
00000000-0000-0000-0000-000000000000	6bacf3f3-cde7-4f41-80fc-b14a5bce9baf	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 23:50:12.729589+00	
00000000-0000-0000-0000-000000000000	732cdf67-0e0d-43c1-9292-48aa398ff3a5	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-12 23:50:12.749919+00	
00000000-0000-0000-0000-000000000000	542c8102-6428-4d72-af59-17107c278f08	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-13 01:43:58.734097+00	
00000000-0000-0000-0000-000000000000	8db8fa51-a071-4f1b-87c3-46206d3c99c7	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-13 01:43:58.747679+00	
00000000-0000-0000-0000-000000000000	18c9a413-e3a4-4d20-b974-9a8f0f8fe352	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-16 03:49:34.088606+00	
00000000-0000-0000-0000-000000000000	71a60cfc-e584-42ec-904b-2fc7359811d5	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-16 03:49:34.116409+00	
00000000-0000-0000-0000-000000000000	1f3efff0-0bb9-416a-b0d8-690da5683a52	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-26 14:22:50.879395+00	
00000000-0000-0000-0000-000000000000	f8002eb2-f318-46ff-be5b-71f6035f0248	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-26 14:22:50.904753+00	
00000000-0000-0000-0000-000000000000	3a789e5e-ea8d-439b-b0c0-a763d052c505	{"action":"user_signedup","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-26 17:30:23.949598+00	
00000000-0000-0000-0000-000000000000	77a59756-7af6-493b-b21a-ffaa25c8fa66	{"action":"login","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-26 17:30:23.977701+00	
00000000-0000-0000-0000-000000000000	663c8949-7773-4a40-8753-4d8127a75d4c	{"action":"logout","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-26 17:31:36.194791+00	
00000000-0000-0000-0000-000000000000	585cfa2b-9beb-4895-8e11-8b0c92708556	{"action":"login","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-26 17:31:53.0541+00	
00000000-0000-0000-0000-000000000000	335b60dc-1107-43c0-8a9b-cde225a12d67	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-27 02:06:32.171307+00	
00000000-0000-0000-0000-000000000000	27b6dff9-2baa-4dca-aa48-be767bf6c4db	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-27 02:06:32.191177+00	
00000000-0000-0000-0000-000000000000	f8e6e376-b79f-4009-93a0-90fa9ffaf5ad	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-28 07:12:28.276267+00	
00000000-0000-0000-0000-000000000000	75540a3f-34d6-40aa-a966-29755a73fa66	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-28 08:42:56.564064+00	
00000000-0000-0000-0000-000000000000	1b0583ef-10a8-42c1-b6e4-866b06238db1	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-28 08:42:56.588075+00	
00000000-0000-0000-0000-000000000000	fff71aec-7296-4dd1-856f-b7e1b79c0ad1	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 01:48:43.46173+00	
00000000-0000-0000-0000-000000000000	af715968-2e81-48a8-b1be-8b7e7372f032	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 01:48:43.475679+00	
00000000-0000-0000-0000-000000000000	584768cd-6c30-44aa-a19c-0e4ca93c0317	{"action":"token_refreshed","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 04:36:48.041691+00	
00000000-0000-0000-0000-000000000000	2a468417-b981-4206-aae6-56724614f7b2	{"action":"token_revoked","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 04:36:48.060895+00	
00000000-0000-0000-0000-000000000000	ca2670a3-4b68-40fc-a166-dbb9be61fa6b	{"action":"logout","actor_id":"90955b24-b201-49d8-92d4-5c7236a592aa","actor_username":"ahmad@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-29 04:38:46.49643+00	
00000000-0000-0000-0000-000000000000	58fd914b-dfa2-49b0-8b86-eca255562df0	{"action":"login","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-29 04:38:57.5201+00	
00000000-0000-0000-0000-000000000000	5fdee5e3-17eb-4f13-9d24-f78e92277f08	{"action":"logout","actor_id":"82eebab2-2763-4e44-9a74-54570f64628c","actor_username":"test@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-09-29 05:09:22.824456+00	
00000000-0000-0000-0000-000000000000	fcaaeb09-6fdc-4004-9d25-bff7b17d958b	{"action":"user_signedup","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-09-29 05:11:58.31031+00	
00000000-0000-0000-0000-000000000000	b03724cd-519c-474b-bd0f-e3ff9dc66796	{"action":"login","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-09-29 05:11:58.320193+00	
00000000-0000-0000-0000-000000000000	5ce56691-5763-47e1-bf70-cd4006e75c2c	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 07:05:03.903192+00	
00000000-0000-0000-0000-000000000000	749c3d24-f0ed-445f-ab86-d3e24b4b0b0c	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 07:05:03.918746+00	
00000000-0000-0000-0000-000000000000	6d04a331-175d-4240-8f4a-8624efbbfab6	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 08:03:26.542757+00	
00000000-0000-0000-0000-000000000000	be544b70-6756-4f76-b222-692090a196a8	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 08:03:26.550745+00	
00000000-0000-0000-0000-000000000000	214532e8-a34d-4eb6-9508-6805e6f22eb0	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 09:47:17.100952+00	
00000000-0000-0000-0000-000000000000	17f4751f-53a4-461d-a361-1cabfd16b82d	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 09:47:17.124018+00	
00000000-0000-0000-0000-000000000000	4fe1d10b-8c7a-4870-8f36-e8ab6a2303d3	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 12:15:57.43344+00	
00000000-0000-0000-0000-000000000000	abab55f2-3537-4110-bfb6-be01c3a52667	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-29 12:15:57.444972+00	
00000000-0000-0000-0000-000000000000	06723fc1-441a-44ef-bb87-5481157b193d	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 03:46:09.516648+00	
00000000-0000-0000-0000-000000000000	15159eda-7fe4-4c96-91cc-5eb4cd71851b	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 03:46:09.53959+00	
00000000-0000-0000-0000-000000000000	78aed918-11cc-4dd6-a2f0-9215fa400974	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 06:14:45.044603+00	
00000000-0000-0000-0000-000000000000	af8ba51f-a8c9-4db7-b8cf-96d150f1bee8	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 06:14:45.064756+00	
00000000-0000-0000-0000-000000000000	7f0269be-2e6c-426c-8f51-83fe63fc0eb1	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 07:19:25.881946+00	
00000000-0000-0000-0000-000000000000	98ffbb8d-a6c6-442b-b30b-3ff3501d2306	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 07:19:25.904656+00	
00000000-0000-0000-0000-000000000000	cff9288f-c2dc-4512-9bce-eaa6a998860a	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 11:27:33.407806+00	
00000000-0000-0000-0000-000000000000	be4ea030-1e57-443a-b265-af16ea1af577	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-09-30 11:27:33.421542+00	
00000000-0000-0000-0000-000000000000	ae9130e9-e199-4833-a237-38ae45a9af03	{"action":"token_refreshed","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 00:45:59.21827+00	
00000000-0000-0000-0000-000000000000	100d8c6c-39a5-4c15-acfd-e1932817fdb0	{"action":"token_revoked","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 00:45:59.235771+00	
00000000-0000-0000-0000-000000000000	5e1e724e-18bf-4f8d-9d03-07fbc1e35b23	{"action":"logout","actor_id":"b2f42503-8316-4bba-9fa9-c2a216dd9e38","actor_username":"test22@gmail.com","actor_via_sso":false,"log_type":"account"}	2025-10-02 01:06:18.621523+00	
00000000-0000-0000-0000-000000000000	846be77d-a539-4045-a197-a35296562af8	{"action":"user_signedup","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-10-02 01:06:43.622277+00	
00000000-0000-0000-0000-000000000000	ed2bc678-20f6-47bb-87f1-2dcb82ad0bd3	{"action":"login","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-02 01:06:43.636487+00	
00000000-0000-0000-0000-000000000000	feeceb8b-0b47-45c3-960f-9b0c4e604bba	{"action":"token_refreshed","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 04:09:55.027888+00	
00000000-0000-0000-0000-000000000000	10d05817-de0e-4f01-b601-49409f435b70	{"action":"token_revoked","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 04:09:55.049019+00	
00000000-0000-0000-0000-000000000000	45522467-bcfd-4ccc-a982-7a4220ca0c7c	{"action":"token_refreshed","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 09:44:47.456995+00	
00000000-0000-0000-0000-000000000000	6d5e0587-63ec-4be0-840c-92042f112611	{"action":"token_revoked","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-02 09:44:47.489091+00	
00000000-0000-0000-0000-000000000000	04b8adf6-bf19-41bb-8237-c1f29d923a87	{"action":"token_refreshed","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-03 04:58:38.202749+00	
00000000-0000-0000-0000-000000000000	5a5a3aa1-ad7e-45d2-86ad-e7ab5ab4e206	{"action":"token_revoked","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-03 04:58:38.213424+00	
00000000-0000-0000-0000-000000000000	df6c28ee-cb53-41c5-952a-ed97e6e99763	{"action":"token_refreshed","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-03 12:39:21.579508+00	
00000000-0000-0000-0000-000000000000	eaa491f4-cfd2-4c8f-b048-d603109bd2fe	{"action":"token_revoked","actor_id":"491a3d8a-eb7d-40e5-9018-9ef8b76fd294","actor_username":"test212@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-03 12:39:21.607177+00	
00000000-0000-0000-0000-000000000000	679fa774-de69-4832-8d7c-358a0531fc16	{"action":"login","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-10-05 13:52:15.807369+00	
00000000-0000-0000-0000-000000000000	7761672f-4c52-4416-9e54-80e9726da63b	{"action":"token_refreshed","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-06 00:50:39.239588+00	
00000000-0000-0000-0000-000000000000	38326b0f-95f1-4c2f-a889-ef2a8ba79cfa	{"action":"token_revoked","actor_id":"ae5426bb-8493-4d6a-ab64-cc86bcc86b4b","actor_username":"muhammadiqbal@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-10-06 00:50:39.269571+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	728cf0b0-304a-42b7-95a4-3caf1132aca8	authenticated	authenticated	sabra@gmail.com	$2a$10$TY8A5K0xeepyfS6ox7/9quJuMAmG/cFhN0uj9BZC14km5lKc/Py3i	2025-09-09 08:37:44.528209+00	\N		\N		\N			\N	2025-09-09 10:01:37.516422+00	{"provider": "email", "providers": ["email"]}	{"sub": "728cf0b0-304a-42b7-95a4-3caf1132aca8", "email": "sabra@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-09 08:37:44.473885+00	2025-09-09 23:12:29.678187+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	b2f42503-8316-4bba-9fa9-c2a216dd9e38	authenticated	authenticated	test22@gmail.com	$2a$10$WdTG4mlSPYaKJm3bIQdzv.vT.5JFiq8EEDKMDcTAyYEjBrBTfLAJS	2025-09-29 05:11:58.312359+00	\N		\N		\N			\N	2025-09-29 05:11:58.320813+00	{"provider": "email", "providers": ["email"]}	{"sub": "b2f42503-8316-4bba-9fa9-c2a216dd9e38", "email": "test22@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-29 05:11:58.279333+00	2025-10-02 00:45:59.264282+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	authenticated	authenticated	test212@gmail.com	$2a$10$AZOb5bbVe7EHEOUEZmqU.O7omMS7OLCkc6MD3pOHD6E/6zJ/c5Ciq	2025-10-02 01:06:43.624005+00	\N		\N		\N			\N	2025-10-02 01:06:43.637076+00	{"provider": "email", "providers": ["email"]}	{"sub": "491a3d8a-eb7d-40e5-9018-9ef8b76fd294", "email": "test212@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-10-02 01:06:43.581837+00	2025-10-03 12:39:21.653268+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	authenticated	authenticated	muhammadiqbal@gmail.com	$2a$10$OUCyju65vNNAlBaxjD3FouOG.p8aJRYkulp.9zfj19AfVjQ5mYiAW	2025-09-03 15:02:40.824921+00	\N		\N		\N			\N	2025-10-05 13:52:15.840298+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-09-03 15:02:40.777138+00	2025-10-06 00:50:39.36699+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	authenticated	authenticated	sabir@gmail.com	$2a$10$jE8oRMIGryhPIGzQm1gUf.T256rmICIhvzp7lGnapnyMqpRVmmYmu	2025-09-08 09:24:27.345629+00	\N		\N		\N			\N	2025-09-08 09:24:27.359106+00	{"provider": "email", "providers": ["email"]}	{"sub": "4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd", "email": "sabir@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-08 09:24:27.312142+00	2025-09-09 03:07:18.123468+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	90955b24-b201-49d8-92d4-5c7236a592aa	authenticated	authenticated	ahmad@gmail.com	$2a$10$f2jW1lznEh7OL5nmcfdNIOMzkjd5gQGzcHTUkr4slkxsBW3UKUKC2	2025-09-12 16:26:47.817523+00	\N		\N		\N			\N	2025-09-12 16:26:47.824597+00	{"provider": "email", "providers": ["email"]}	{"sub": "90955b24-b201-49d8-92d4-5c7236a592aa", "email": "ahmad@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-12 16:26:47.792364+00	2025-09-29 04:36:48.083764+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	339c2626-f428-4824-91c7-d5f9c1679542	authenticated	authenticated	khushimuhammad@gmail.com	$2a$10$fzt/fgo0InbzctPJZ0laM.ab6fo4BiDCnH7O1.hsyRmsZz8Hk4yke	2025-09-08 04:15:42.085473+00	\N		\N		\N			\N	2025-09-08 04:15:42.089233+00	{"provider": "email", "providers": ["email"]}	{"sub": "339c2626-f428-4824-91c7-d5f9c1679542", "email": "khushimuhammad@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-08 04:15:42.068823+00	2025-09-08 09:21:00.262519+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	c5639035-0617-4c34-aff1-a7bb1d6809a9	authenticated	authenticated	connecthassanraza@gmail.com	$2a$10$I8sBNWRVM5VjlzmUCQlFZuDQwhykoqPnQsUX5Gbbjp.9nZBZSTjsa	2025-09-07 08:53:19.068994+00	\N		\N		\N			\N	2025-09-07 08:53:19.084379+00	{"provider": "email", "providers": ["email"]}	{"sub": "c5639035-0617-4c34-aff1-a7bb1d6809a9", "email": "connecthassanraza@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-07 08:53:19.008285+00	2025-09-07 08:53:19.110056+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	82eebab2-2763-4e44-9a74-54570f64628c	authenticated	authenticated	test@gmail.com	$2a$10$0wL8G7lkGP7nsHREqBCJv.nPxltC0vfOoWTS2RgfxSLp1/mng2Coy	2025-09-26 17:30:23.962387+00	\N		\N		\N			\N	2025-09-29 04:38:57.522576+00	{"provider": "email", "providers": ["email"]}	{"sub": "82eebab2-2763-4e44-9a74-54570f64628c", "email": "test@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-09-26 17:30:23.833789+00	2025-09-29 04:38:57.535054+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	{"sub": "ae5426bb-8493-4d6a-ab64-cc86bcc86b4b", "email": "muhammadiqbal@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-03 15:02:40.798102+00	2025-09-03 15:02:40.798165+00	2025-09-03 15:02:40.798165+00	259a26be-6063-4beb-bc5e-84951751724f
f4ee15fa-8545-4375-b46c-1d65964de085	f4ee15fa-8545-4375-b46c-1d65964de085	{"sub": "f4ee15fa-8545-4375-b46c-1d65964de085", "email": "khoshi19@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-08-31 10:43:10.4402+00	2025-08-31 10:43:10.440253+00	2025-08-31 10:43:10.440253+00	006066e4-28fe-4d35-8e99-e37d4a369c4c
774c8000-4f34-4de1-b0a8-493fc37d2f9d	774c8000-4f34-4de1-b0a8-493fc37d2f9d	{"sub": "774c8000-4f34-4de1-b0a8-493fc37d2f9d", "email": "muhammadiqbal@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-08-31 10:46:36.548862+00	2025-08-31 10:46:36.548922+00	2025-08-31 10:46:36.548922+00	d83801ed-634d-4b5c-89cb-950f86fcfdbc
c5639035-0617-4c34-aff1-a7bb1d6809a9	c5639035-0617-4c34-aff1-a7bb1d6809a9	{"sub": "c5639035-0617-4c34-aff1-a7bb1d6809a9", "email": "connecthassanraza@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-07 08:53:19.042441+00	2025-09-07 08:53:19.042493+00	2025-09-07 08:53:19.042493+00	c73918a7-e526-4478-8976-992b9aa0c091
339c2626-f428-4824-91c7-d5f9c1679542	339c2626-f428-4824-91c7-d5f9c1679542	{"sub": "339c2626-f428-4824-91c7-d5f9c1679542", "email": "khushimuhammad@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-08 04:15:42.081222+00	2025-09-08 04:15:42.081274+00	2025-09-08 04:15:42.081274+00	2f707046-2a74-4d2f-9d96-d50f47301494
4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	{"sub": "4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd", "email": "sabir@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-08 09:24:27.331079+00	2025-09-08 09:24:27.331135+00	2025-09-08 09:24:27.331135+00	0aa6fe45-5160-4eb3-8042-b3a410eda1fb
728cf0b0-304a-42b7-95a4-3caf1132aca8	728cf0b0-304a-42b7-95a4-3caf1132aca8	{"sub": "728cf0b0-304a-42b7-95a4-3caf1132aca8", "email": "sabra@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-09 08:37:44.517449+00	2025-09-09 08:37:44.517498+00	2025-09-09 08:37:44.517498+00	5b6e9c74-a6a4-4e56-a135-ce90bcdff30e
90955b24-b201-49d8-92d4-5c7236a592aa	90955b24-b201-49d8-92d4-5c7236a592aa	{"sub": "90955b24-b201-49d8-92d4-5c7236a592aa", "email": "ahmad@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-12 16:26:47.811854+00	2025-09-12 16:26:47.811902+00	2025-09-12 16:26:47.811902+00	55974b7a-60a4-4f28-8381-eb1d6665b74b
82eebab2-2763-4e44-9a74-54570f64628c	82eebab2-2763-4e44-9a74-54570f64628c	{"sub": "82eebab2-2763-4e44-9a74-54570f64628c", "email": "test@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-26 17:30:23.932839+00	2025-09-26 17:30:23.932907+00	2025-09-26 17:30:23.932907+00	fc63461b-b011-4836-8a12-f4f8df2ddb64
b2f42503-8316-4bba-9fa9-c2a216dd9e38	b2f42503-8316-4bba-9fa9-c2a216dd9e38	{"sub": "b2f42503-8316-4bba-9fa9-c2a216dd9e38", "email": "test22@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-09-29 05:11:58.306081+00	2025-09-29 05:11:58.306134+00	2025-09-29 05:11:58.306134+00	488a4b9b-bbc4-4357-844d-e3c300bad070
491a3d8a-eb7d-40e5-9018-9ef8b76fd294	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	{"sub": "491a3d8a-eb7d-40e5-9018-9ef8b76fd294", "email": "test212@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-10-02 01:06:43.611361+00	2025-10-02 01:06:43.611421+00	2025-10-02 01:06:43.611421+00	c827de23-4dd6-448d-97b9-aa86ab5f8aed
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") FROM stdin;
ec9113e1-97ba-4484-8a39-55bdb31b1bd5	774c8000-4f34-4de1-b0a8-493fc37d2f9d	2025-08-31 10:46:36.55861+00	2025-09-01 10:15:17.936225+00	\N	aal1	\N	2025-09-01 10:15:17.93614	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	119.73.103.159	\N
a45d06c8-2331-4677-8a4e-1241963557e1	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	2025-09-08 09:24:27.359184+00	2025-09-09 03:07:18.135619+00	\N	aal1	\N	2025-09-09 03:07:18.133769	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	119.73.102.97	\N
c4bafd0b-3a8d-4768-8486-d34a841ae5c0	c5639035-0617-4c34-aff1-a7bb1d6809a9	2025-09-07 08:53:19.084455+00	2025-09-07 08:53:19.084455+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0	119.73.98.238	\N
2d144132-4d14-41f1-b145-70dcd63957c6	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	2025-10-02 01:06:43.637155+00	2025-10-03 12:39:21.664258+00	\N	aal1	\N	2025-10-03 12:39:21.663135	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	119.73.98.230	\N
24f01cf6-8e6b-4830-8175-c473cbf9add9	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	2025-10-05 13:52:15.84041+00	2025-10-06 00:50:39.378171+00	\N	aal1	\N	2025-10-06 00:50:39.377496	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	119.73.102.25	\N
f380136f-9d02-44c1-8969-924818c25a54	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	2025-09-12 17:04:48.22832+00	2025-09-16 03:49:34.159997+00	\N	aal1	\N	2025-09-16 03:49:34.159917	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36	119.73.103.201	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
ec9113e1-97ba-4484-8a39-55bdb31b1bd5	2025-08-31 10:46:36.560914+00	2025-08-31 10:46:36.560914+00	password	ca604330-4943-4069-b9e5-9e23f04ffb0f
c4bafd0b-3a8d-4768-8486-d34a841ae5c0	2025-09-07 08:53:19.110627+00	2025-09-07 08:53:19.110627+00	password	04007907-aef7-48f0-bac1-d8a936e95a98
a45d06c8-2331-4677-8a4e-1241963557e1	2025-09-08 09:24:27.372958+00	2025-09-08 09:24:27.372958+00	password	c1392326-e79e-482b-879c-7454989a1a45
f380136f-9d02-44c1-8969-924818c25a54	2025-09-12 17:04:48.271172+00	2025-09-12 17:04:48.271172+00	password	398d0813-a3aa-4f15-9d30-34011258f085
2d144132-4d14-41f1-b145-70dcd63957c6	2025-10-02 01:06:43.659864+00	2025-10-02 01:06:43.659864+00	password	8dfcc73c-1f6c-4837-990a-780fed1fc524
24f01cf6-8e6b-4830-8175-c473cbf9add9	2025-10-05 13:52:15.923773+00	2025-10-05 13:52:15.923773+00	password	6476a369-d44f-4e19-8b36-42817ad2f3cf
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	69	fsij4oojfeys	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	t	2025-09-12 22:30:07.658486+00	2025-09-12 23:50:12.752436+00	jrphsvly4tqz	f380136f-9d02-44c1-8969-924818c25a54
00000000-0000-0000-0000-000000000000	70	4zez67bolcgc	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	t	2025-09-12 23:50:12.766046+00	2025-09-16 03:49:34.118081+00	fsij4oojfeys	f380136f-9d02-44c1-8969-924818c25a54
00000000-0000-0000-0000-000000000000	72	s7sxgqzk2egl	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	f	2025-09-16 03:49:34.137965+00	2025-09-16 03:49:34.137965+00	4zez67bolcgc	f380136f-9d02-44c1-8969-924818c25a54
00000000-0000-0000-0000-000000000000	37	3kfrncjo7wae	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	t	2025-09-08 09:24:27.367551+00	2025-09-08 13:08:26.938076+00	\N	a45d06c8-2331-4677-8a4e-1241963557e1
00000000-0000-0000-0000-000000000000	39	xcgcxbkwlmh6	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	t	2025-09-08 13:08:26.958686+00	2025-09-08 14:49:49.375915+00	3kfrncjo7wae	a45d06c8-2331-4677-8a4e-1241963557e1
00000000-0000-0000-0000-000000000000	40	xvhztx34t32z	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	t	2025-09-08 14:49:49.387184+00	2025-09-09 03:07:18.087859+00	xcgcxbkwlmh6	a45d06c8-2331-4677-8a4e-1241963557e1
00000000-0000-0000-0000-000000000000	42	ug3iwvxm5nqx	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	f	2025-09-09 03:07:18.108812+00	2025-09-09 03:07:18.108812+00	xvhztx34t32z	a45d06c8-2331-4677-8a4e-1241963557e1
00000000-0000-0000-0000-000000000000	2	qjo7azddhu4b	774c8000-4f34-4de1-b0a8-493fc37d2f9d	t	2025-08-31 10:46:36.559399+00	2025-09-01 04:25:40.090931+00	\N	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	3	yurpo54mwgjf	774c8000-4f34-4de1-b0a8-493fc37d2f9d	t	2025-09-01 04:25:40.10894+00	2025-09-01 05:36:43.45307+00	qjo7azddhu4b	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	4	q6coyap5ovku	774c8000-4f34-4de1-b0a8-493fc37d2f9d	t	2025-09-01 05:36:43.45995+00	2025-09-01 06:40:03.970227+00	yurpo54mwgjf	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	5	o3juqqcbnj3y	774c8000-4f34-4de1-b0a8-493fc37d2f9d	t	2025-09-01 06:40:03.976309+00	2025-09-01 08:29:49.737162+00	q6coyap5ovku	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	6	rirtdkmkolpu	774c8000-4f34-4de1-b0a8-493fc37d2f9d	t	2025-09-01 08:29:49.744008+00	2025-09-01 10:15:17.913001+00	o3juqqcbnj3y	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	7	pfr755c7boeb	774c8000-4f34-4de1-b0a8-493fc37d2f9d	f	2025-09-01 10:15:17.924611+00	2025-09-01 10:15:17.924611+00	rirtdkmkolpu	ec9113e1-97ba-4484-8a39-55bdb31b1bd5
00000000-0000-0000-0000-000000000000	91	kdzebg72hpvl	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	t	2025-10-02 01:06:43.646788+00	2025-10-02 04:09:55.053919+00	\N	2d144132-4d14-41f1-b145-70dcd63957c6
00000000-0000-0000-0000-000000000000	92	3tarsk4ibhsg	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	t	2025-10-02 04:09:55.079901+00	2025-10-02 09:44:47.495537+00	kdzebg72hpvl	2d144132-4d14-41f1-b145-70dcd63957c6
00000000-0000-0000-0000-000000000000	93	ch6ehxwr357h	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	t	2025-10-02 09:44:47.521443+00	2025-10-03 04:58:38.215636+00	3tarsk4ibhsg	2d144132-4d14-41f1-b145-70dcd63957c6
00000000-0000-0000-0000-000000000000	23	l6bvbec75nfm	c5639035-0617-4c34-aff1-a7bb1d6809a9	f	2025-09-07 08:53:19.094235+00	2025-09-07 08:53:19.094235+00	\N	c4bafd0b-3a8d-4768-8486-d34a841ae5c0
00000000-0000-0000-0000-000000000000	94	ytviy4bf3crh	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	t	2025-10-03 04:58:38.225801+00	2025-10-03 12:39:21.607893+00	ch6ehxwr357h	2d144132-4d14-41f1-b145-70dcd63957c6
00000000-0000-0000-0000-000000000000	95	cr6ybii6rvz6	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	f	2025-10-03 12:39:21.63734+00	2025-10-03 12:39:21.63734+00	ytviy4bf3crh	2d144132-4d14-41f1-b145-70dcd63957c6
00000000-0000-0000-0000-000000000000	96	nry736z2n2ue	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	t	2025-10-05 13:52:15.867374+00	2025-10-06 00:50:39.272623+00	\N	24f01cf6-8e6b-4830-8175-c473cbf9add9
00000000-0000-0000-0000-000000000000	97	xieki4vgflsy	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	f	2025-10-06 00:50:39.297984+00	2025-10-06 00:50:39.297984+00	nry736z2n2ue	24f01cf6-8e6b-4830-8175-c473cbf9add9
00000000-0000-0000-0000-000000000000	68	jrphsvly4tqz	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	t	2025-09-12 17:04:48.243258+00	2025-09-12 22:30:07.630391+00	\N	f380136f-9d02-44c1-8969-924818c25a54
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."categories" ("id", "created_at", "name", "user_id") FROM stdin;
1	2025-09-01 06:11:13.024275+00	Smart Phones / Devices	\N
2	2025-09-01 06:11:39.444773+00	Protective Accessories	\N
3	2025-09-01 06:12:21.723436+00	Charging & Power	\N
4	2025-09-01 06:12:42.457952+00	Audio Accessories	\N
5	2025-09-01 06:13:04.094902+00	Wearable Tech	\N
6	2025-09-01 06:13:25.508062+00	Storage & Other Accessories	\N
7	2025-09-01 06:13:45.857364+00	Services & Repairs	\N
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."customers" ("id", "created_at", "name", "phone_number", "address", "balance", "user_id") FROM stdin;
2	2025-08-26 13:18:45.831356+00	Ahmad	03001234567898	This is test address and fake street no	290000	\N
1	2025-08-26 13:17:36.847705+00	Abdullah	03001234567890	This is example street no 123 	260000	\N
3	2025-08-28 04:25:28.111244+00	Bilal Ahmad	03001234567876	lkjj lkj lkj lkj	35000	\N
4	2025-08-28 04:35:58.848519+00	Usman	03001234567567	vvvvv bbbb nnnn hhhh	30000	\N
5	2025-08-28 05:02:18.747245+00	Khalid Ali	02002323456789	sdfasdf adfasdf  f a f sadf  df 	30000	\N
6	2025-08-28 06:26:16.385249+00	Huzaifa	09876546543	sdfds f df ad f sdf  df  dsf	50000	\N
7	2025-08-28 09:00:32.700069+00	Khushi Muhammad	03073797697	dfasdf ds f dsf  df  df a	0	\N
8	2025-08-31 03:07:20.535683+00	Amjad	55555543434534534	wer wer w er e wr we r	0	\N
9	2025-08-31 03:44:27.377728+00	Muhammad Iqbal	976557874	 fa f asd f d f sdf  	0	\N
10	2025-08-31 11:06:38.240697+00	Muhammad Iqbal	87678767887	 d f sd f d f d f s	0	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
11	2025-09-07 09:25:53.961655+00	Raza	342342344	fdsfsf  f df s f  f s	0	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
12	2025-09-29 07:09:13.365918+00	Test	98989898989	dfad f  dfad f ad	0	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: customer_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."customer_payments" ("id", "created_at", "customer_id", "amount_paid", "payment_method", "user_id") FROM stdin;
1	2025-08-26 14:31:27.04073+00	1	30000	\N	\N
2	2025-08-26 14:53:53.819354+00	2	20000	\N	\N
3	2025-08-28 04:21:32.481593+00	1	30000	\N	\N
4	2025-08-28 04:26:00.999798+00	3	35000	\N	\N
5	2025-08-28 04:37:12.265033+00	4	35000	\N	\N
6	2025-08-28 05:31:41.337383+00	5	20000	\N	\N
7	2025-08-28 06:53:41.971464+00	6	10000	\N	\N
8	2025-08-28 07:13:31.296776+00	6	10000	\N	\N
9	2025-08-28 07:17:21.884029+00	6	10000	\N	\N
10	2025-08-31 11:29:41.096469+00	10	100000	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
11	2025-09-07 09:27:01.711319+00	11	100	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
12	2025-09-11 02:44:58.021183+00	10	10000	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
13	2025-09-29 08:07:33.049904+00	12	500	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: dummy_test_table; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."dummy_test_table" ("id", "description", "created_at") FROM stdin;
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."expense_categories" ("id", "created_at", "name", "user_id") FROM stdin;
1	2025-09-01 10:02:04.412184+00	Rent	\N
2	2025-09-01 10:02:04.412184+00	Utilities	\N
3	2025-09-01 10:02:04.412184+00	Salaries	\N
4	2025-09-01 10:02:04.412184+00	Marketing	\N
5	2025-09-01 10:02:04.412184+00	Other	\N
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."expenses" ("id", "created_at", "title", "amount", "expense_date", "user_id", "category_id") FROM stdin;
2	2025-09-01 10:26:47.356871+00	Kiraya diya	20000	2025-09-01	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1
3	2025-09-07 09:45:47.809975+00	kiraya jdia flanan 	20000	2025-09-07	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1
4	2025-09-07 09:46:33.698148+00	salary	10000	2025-09-07	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	5
5	2025-09-08 04:19:53.032107+00	chaye pani	100	2025-09-08	339c2626-f428-4824-91c7-d5f9c1679542	5
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."products" ("id", "created_at", "name", "brand", "purchase_price", "sale_price", "user_id", "category_id", "is_featured", "barcode") FROM stdin;
1	2025-08-26 07:50:39.615772+00	techno111	techno	50000	60000	\N	\N	f	\N
2	2025-08-26 08:57:00.5645+00	A54	Oppo	50000	70000	\N	\N	f	\N
4	2025-08-28 08:59:56.709056+00	Redme S200	Redme	90000	100000	\N	\N	f	\N
3	2025-08-28 07:19:00.078618+00	iPhone 16 Pro	Apple	500000	550000	\N	\N	f	\N
5	2025-08-31 03:42:16.799906+00	Infinix200	Infinix	50000	60000	\N	\N	f	\N
6	2025-08-31 11:05:58.763342+00	iPhone 16 Pro	Apple	100000	200000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	f	\N
7	2025-09-01 06:26:42.618111+00	A54	Oppo	50000	60000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1	f	\N
8	2025-09-07 03:59:05.497643+00	iPhone 17 Pro	Apple	400000	500000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1	f	\N
9	2025-09-07 08:23:29.386997+00	zinnntt	asdf	10000	11000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	3	f	\N
10	2025-09-07 08:25:21.189431+00	cover	non	1000	1100	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	2	f	\N
11	2025-09-07 08:56:52.46659+00	vivo Y100	vivo	40500	\N	c5639035-0617-4c34-aff1-a7bb1d6809a9	1	f	\N
12	2025-09-07 09:29:41.177322+00	c51	realme	20500	22000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1	f	\N
13	2025-09-08 04:16:22.125621+00	Oppo A20	Oppo	50000	60000	339c2626-f428-4824-91c7-d5f9c1679542	1	f	\N
14	2025-09-08 04:17:49.784382+00	Jelly Cover	non	500	1000	339c2626-f428-4824-91c7-d5f9c1679542	2	f	\N
15	2025-09-08 13:09:06.149651+00	iPhone 16 Pro	apple	100000	150000	4d7ab0c5-e47f-4e2b-ad80-7be7c5d9e3bd	1	f	\N
16	2025-09-12 16:28:24.349483+00	testproduct	testproduct	10000	15000	90955b24-b201-49d8-92d4-5c7236a592aa	1	f	\N
17	2025-09-12 16:30:27.591724+00	test product	test product	500	1000	90955b24-b201-49d8-92d4-5c7236a592aa	2	f	\N
18	2025-09-28 08:43:41.103639+00	Jelly Covers	Non	1000	2000	90955b24-b201-49d8-92d4-5c7236a592aa	2	f	\N
19	2025-09-29 07:07:06.556808+00	Jelly Covers	Non	1000	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38	2	f	\N
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."suppliers" ("id", "name", "contact_person", "phone", "address", "created_at", "credit_balance", "user_id") FROM stdin;
1	Market	\N	\N	\N	2025-09-28 08:45:18.349066+00	0	728cf0b0-304a-42b7-95a4-3caf1132aca8
2	New Supplier	\N	\N	\N	2025-09-29 01:49:52.265403+00	800.00	728cf0b0-304a-42b7-95a4-3caf1132aca8
3	bold shop	non	87687446	non of them	2025-09-29 04:42:09.778659+00	0	82eebab2-2763-4e44-9a74-54570f64628c
6	new supplier2	shahi bazar	8909 87 878 87	dahar city disst ghotki	2025-09-29 07:12:22.569421+00	0	b2f42503-8316-4bba-9fa9-c2a216dd9e38
7	New Supplier 3	asdfadf	45867	fdfa df df dsfd f	2025-09-29 07:59:31.137978+00	0	b2f42503-8316-4bba-9fa9-c2a216dd9e38
4	skydealer	\N	\N	\N	2025-09-29 07:07:31.95321+00	0.00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."purchases" ("id", "supplier_id", "purchase_date", "total_amount", "notes", "created_at", "status", "amount_paid", "balance_due", "user_id") FROM stdin;
1	1	2025-09-28	10000.00	\N	2025-09-28 08:45:23.626895+00	unpaid	0.00	10000.00	728cf0b0-304a-42b7-95a4-3caf1132aca8
2	2	2025-09-29	7200.00	\N	2025-09-29 01:50:17.248938+00	paid	9000.00	0.00	728cf0b0-304a-42b7-95a4-3caf1132aca8
3	4	2025-09-29	8000.00	#100	2025-09-29 07:08:05.628278+00	paid	10000.00	0.00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
4	4	2025-09-29	10000.00	# 299	2025-09-29 12:17:35.875942+00	partially_paid	5000.00	5000.00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inventory" ("id", "product_id", "imei", "color", "condition", "purchase_price", "sale_price", "status", "created_at", "ram_rom", "guaranty", "pta_status", "user_id", "supplier_id", "purchase_id") FROM stdin;
222	16	1212121212	White	New	10000	15000	Sold	2025-09-12 16:29:21.85422+00	8/128	1 Year	Approved	90955b24-b201-49d8-92d4-5c7236a592aa	\N	\N
236	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
237	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
238	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
239	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
240	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
241	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
242	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
243	18	\N	white	New	900	2000	Available	2025-09-29 01:50:17.248938+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	2	2
2	10	\N	\N	\N	\N	\N	Sold	2025-09-07 08:25:35.090716+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
5	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
223	17	\N	Pink	New	500	1000	Sold	2025-09-12 16:30:43.750452+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	\N	\N
250	19	\N	White	New	1000	2000	Available	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
251	19	\N	White	New	1000	2000	Available	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
252	19	\N	White	New	1000	2000	Available	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
253	19	\N	White	New	1000	2000	Available	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
246	19	\N	White	New	1000	2000	Sold	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
247	19	\N	White	New	1000	2000	Sold	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
248	19	\N	White	New	1000	2000	Sold	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
249	19	\N	White	New	1000	2000	Sold	2025-09-29 07:08:05.628278+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	3
97	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
98	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
104	7	233566	\N	New	50000	60000	Sold	2025-09-07 09:39:52.128097+00	\N	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
254	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
255	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
256	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
257	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
258	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
259	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
260	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
261	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
262	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
263	19	\N	\N	New	1000	2000	Available	2025-09-29 12:17:35.875942+00	\N	\N	\N	b2f42503-8316-4bba-9fa9-c2a216dd9e38	4	4
6	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
7	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
8	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
9	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
10	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
11	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
12	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
13	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
14	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
15	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
16	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
17	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
18	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
19	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
20	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
21	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
22	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
23	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
24	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
25	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
26	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
27	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
28	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
29	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
30	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
31	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
32	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
33	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
34	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
35	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
36	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
37	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
38	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
39	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
40	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
41	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
42	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
43	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
44	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
45	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
46	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
47	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
48	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
49	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
50	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
51	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
52	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
53	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
54	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
55	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
56	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
57	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
58	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
59	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
60	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
61	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
62	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
63	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
64	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
65	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
66	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
67	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
68	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
69	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
70	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
71	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
72	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
73	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
74	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
75	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
76	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
77	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
78	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
79	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
80	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
81	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
82	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
83	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
84	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
85	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
86	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
87	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
88	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
89	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
90	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
91	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
92	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
93	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
94	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
95	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
96	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
3	10	\N	\N	New	1000	1100	Sold	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
4	10	\N	\N	New	1000	1100	Sold	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
99	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
100	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
101	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
102	10	\N	\N	New	1000	1100	Available	2025-09-07 09:30:47.905859+00	\N	\N	\N	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
105	7	4556788	\N	New	50000	60000	Available	2025-09-07 09:39:52.128097+00	\N	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
106	13	11111	\N	New	50000	60000	Available	2025-09-08 04:17:12.275079+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
107	13	111111	\N	New	50000	60000	Available	2025-09-08 04:17:12.275079+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
108	13	1111111	\N	New	50000	60000	Available	2025-09-08 04:17:12.275079+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
110	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
111	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
112	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
113	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
114	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
115	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
116	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
117	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
118	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
119	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
120	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
121	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
122	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
123	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
124	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
125	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
126	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
127	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
128	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
129	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
130	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
131	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
132	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
133	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
134	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
135	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
136	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
137	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
138	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
139	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
140	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
141	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
142	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
143	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
144	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
145	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
146	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
147	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
148	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
149	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
150	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
151	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
152	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
153	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
154	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
155	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
156	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
157	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
158	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
159	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
160	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
161	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
162	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
163	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
164	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
165	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
166	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
167	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
168	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
169	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
170	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
171	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
172	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
173	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
174	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
175	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
176	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
177	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
178	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
179	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
180	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
181	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
182	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
183	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
184	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
185	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
186	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
187	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
188	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
189	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
190	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
191	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
192	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
193	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
194	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
195	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
196	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
197	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
198	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
199	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
200	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
201	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
202	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
203	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
204	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
205	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
206	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
207	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
208	14	\N	white	New	500	1000	Available	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
109	14	\N	white	New	500	1000	Sold	2025-09-08 04:18:09.063465+00	\N	\N	\N	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
209	13	666666	\N	New	50000	60000	Available	2025-09-08 06:56:17.720553+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
210	13	777777	\N	New	50000	60000	Available	2025-09-08 06:56:17.720553+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
211	13	888888	\N	New	50000	60000	Available	2025-09-08 06:56:17.720553+00	\N	\N	Approved	339c2626-f428-4824-91c7-d5f9c1679542	\N	\N
1	8	3434343434	Black	New	400000	500000	Sold	2025-09-07 04:00:22.187373+00	16/128	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
103	7	76767655433	wew	New	50000	60000	Sold	2025-09-07 09:38:04.391219+00	4/128	1	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
212	7	122111222	\N	Used	50000	60000	Available	2025-09-09 23:21:17.118213+00	4/64	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
213	7	665654345	\N	New	60000	70000	Available	2025-09-09 23:23:26.169733+00	4/32	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
214	7	1111111111	white	New	50000	100000	Available	2025-09-11 02:50:29.59263+00	4/64	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
215	7	2222222222	white	New	50000	100000	Available	2025-09-11 02:50:29.59263+00	4/64	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
216	7	3333333333	white	New	50000	100000	Available	2025-09-11 02:50:29.59263+00	4/64	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
217	7	4444444444	white	New	50000	100000	Available	2025-09-11 02:50:29.59263+00	4/64	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
218	7	5555555555	black	New	100000	150000	Available	2025-09-11 02:50:29.59263+00	8/128	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
219	7	6666666666	black	New	100000	150000	Available	2025-09-11 02:50:29.59263+00	8/128	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
220	7	7777777777	black	New	100000	150000	Available	2025-09-11 02:50:29.59263+00	8/128	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
221	7	8888888888	black	New	100000	150000	Available	2025-09-11 02:50:29.59263+00	8/128	\N	Approved	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	\N	\N
224	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
225	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
226	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
227	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
228	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
229	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
230	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
231	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
232	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
233	18	\N	\N	New	1000	2000	Available	2025-09-28 08:45:23.626895+00	\N	\N	\N	90955b24-b201-49d8-92d4-5c7236a592aa	1	1
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "user_id", "shop_name", "phone_number", "address", "updated_at", "created_at", "full_name") FROM stdin;
38701bef-a135-44f8-b162-aa2212c39fd2	728cf0b0-304a-42b7-95a4-3caf1132aca8	Raza Mobile Shop	8787878787	nahiiii maloommmm	2025-09-09 09:56:10.946805+00	2025-09-09 08:37:44.472188+00	sabra
fa106678-39fe-4a24-ba3d-085e0be6b483	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	Iqbal	03009876543	Suleman mobile shop	\N	2025-09-09 23:19:07.024389+00	Muhammad
b7e9fee2-c14f-4b82-a07f-be31c59c6a29	90955b24-b201-49d8-92d4-5c7236a592aa	Ahmad mobile shop	8787788778	asdf adf	2025-09-12 16:27:28.711738+00	2025-09-12 16:26:47.791163+00	Ahmad
b12018b9-2b14-4c3b-bd67-f7a628257e78	82eebab2-2763-4e44-9a74-54570f64628c	\N	\N	\N	\N	2025-09-26 17:30:23.831712+00	\N
6beb13a0-a108-4538-81b9-7c7695fe62fd	b2f42503-8316-4bba-9fa9-c2a216dd9e38	\N	\N	\N	\N	2025-09-29 05:11:58.278976+00	\N
9c8ab998-420f-4e2e-b244-dd15eb488404	491a3d8a-eb7d-40e5-9018-9ef8b76fd294	\N	\N	\N	\N	2025-10-02 01:06:43.580964+00	\N
\.


--
-- Data for Name: purchase_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."purchase_items" ("id", "purchase_id", "product_id", "quantity", "purchase_price", "created_at") FROM stdin;
\.


--
-- Data for Name: purchase_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."purchase_returns" ("id", "purchase_id", "supplier_id", "return_date", "total_return_amount", "notes", "created_at", "user_id") FROM stdin;
1	2	2	2025-09-29	900	\N	2025-09-29 02:02:03.462582+00	728cf0b0-304a-42b7-95a4-3caf1132aca8
2	2	2	2025-09-29	900	\N	2025-09-29 02:02:25.41034+00	728cf0b0-304a-42b7-95a4-3caf1132aca8
3	3	4	2025-09-29	2000	faullty	2025-09-29 08:01:05.539581+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: purchase_return_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."purchase_return_items" ("id", "return_id", "product_id", "inventory_id_original", "imei", "purchase_price", "created_at", "user_id") FROM stdin;
1	1	18	234	\N	900	2025-09-29 02:02:03.462582+00	728cf0b0-304a-42b7-95a4-3caf1132aca8
2	2	18	235	\N	900	2025-09-29 02:02:25.41034+00	728cf0b0-304a-42b7-95a4-3caf1132aca8
3	3	19	244	\N	1000	2025-09-29 08:01:05.539581+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
4	3	19	245	\N	1000	2025-09-29 08:01:05.539581+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."sales" ("id", "created_at", "total_amount", "customer_id", "payment_status", "subtotal", "discount", "amount_paid_at_sale", "user_id") FROM stdin;
1	2025-08-26 09:07:24.625021+00	70000	\N	Paid	0	0	0	\N
2	2025-08-26 13:40:25.649689+00	70000	1	Paid	0	0	0	\N
3	2025-08-26 13:45:03.632722+00	60000	2	Paid	0	0	0	\N
4	2025-08-26 13:52:07.920131+00	130000	2	Paid	0	0	0	\N
5	2025-08-26 14:23:14.257347+00	60000	1	Unpaid	0	0	0	\N
6	2025-08-26 14:53:02.434242+00	60000	2	Unpaid	0	0	0	\N
7	2025-08-27 07:24:38.167481+00	70000	1	Unpaid	0	0	0	\N
8	2025-08-28 04:17:16.825639+00	60000	1	Paid	0	0	0	\N
9	2025-08-28 04:17:28.3097+00	60000	2	Paid	0	0	0	\N
10	2025-08-28 04:21:31.714811+00	60000	1	Unpaid	0	0	0	\N
11	2025-08-28 04:26:00.336329+00	70000	3	Unpaid	0	0	0	\N
12	2025-08-28 04:37:11.597895+00	65000	4	Unpaid	0	0	0	\N
13	2025-08-28 05:03:16.461207+00	65000	5	Unpaid	70000	5000	15000	\N
14	2025-08-28 05:05:28.893103+00	70000	5	Unpaid	70000	0	70000	\N
15	2025-08-28 06:24:52.228476+00	60000	5	Unpaid	60000	0	60000	\N
16	2025-08-28 06:26:50.212427+00	65000	6	Unpaid	70000	5000	15000	\N
17	2025-08-28 09:01:19.493641+00	650000	7	Unpaid	650000	0	100000	\N
18	2025-08-31 03:07:43.623027+00	550000	8	Unpaid	550000	0	0	\N
19	2025-08-31 03:45:40.503262+00	55000	9	Unpaid	60000	5000	20000	\N
20	2025-08-31 11:06:58.440084+00	150000	10	Unpaid	200000	50000	150000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
21	2025-08-31 11:11:40.89783+00	200000	10	Unpaid	200000	0	0	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
22	2025-08-31 11:27:31.386806+00	200000	10	Unpaid	200000	0	100000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
23	2025-09-07 09:26:32.176442+00	1100	11	Unpaid	1100	0	600	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
24	2025-09-08 04:18:29.68132+00	1000	\N	Unpaid	1000	0	1000	339c2626-f428-4824-91c7-d5f9c1679542
25	2025-09-08 09:31:37.656453+00	500000	11	Unpaid	500000	0	500000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
26	2025-09-09 00:07:21.538098+00	60000	11	Unpaid	60000	0	50000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
27	2025-09-09 00:27:06.222912+00	1100	11	Unpaid	1100	0	600	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
28	2025-09-10 12:51:10.092878+00	1100	\N	Unpaid	1100	0	1100	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
29	2025-09-12 16:31:25.927784+00	16000	\N	Unpaid	16000	0	16000	90955b24-b201-49d8-92d4-5c7236a592aa
30	2025-09-13 00:03:42.819471+00	60000	11	Unpaid	60000	0	0	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
31	2025-09-29 08:05:03.347146+00	2000	\N	Unpaid	2000	0	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
32	2025-09-29 08:05:33.627884+00	2000	12	Unpaid	2000	0	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
33	2025-09-29 08:06:08.593227+00	2000	12	Unpaid	2000	0	1000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
34	2025-10-02 00:50:09.437267+00	2000	\N	Unpaid	2000	0	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."sale_items" ("id", "created_at", "sale_id", "product_id", "quantity", "price_at_sale", "user_id") FROM stdin;
1	2025-08-26 09:07:25.207518+00	1	2	1	70000	\N
2	2025-08-26 13:40:26.125981+00	2	2	1	70000	\N
3	2025-08-26 13:45:03.840174+00	3	1	1	60000	\N
4	2025-08-26 13:52:08.071237+00	4	2	1	70000	\N
5	2025-08-26 13:52:08.071237+00	4	1	1	60000	\N
6	2025-08-26 14:23:14.507267+00	5	1	1	60000	\N
7	2025-08-26 14:53:02.88789+00	6	1	1	60000	\N
8	2025-08-27 07:24:38.721684+00	7	2	1	70000	\N
9	2025-08-28 04:17:17.171587+00	8	1	1	60000	\N
10	2025-08-28 04:17:28.541683+00	9	1	1	60000	\N
11	2025-08-28 04:21:32.019355+00	10	1	1	60000	\N
12	2025-08-28 04:26:00.588341+00	11	2	1	70000	\N
13	2025-08-28 04:37:11.827475+00	12	2	1	70000	\N
14	2025-08-28 05:03:16.812465+00	13	2	1	70000	\N
15	2025-08-28 05:05:29.149683+00	14	2	1	70000	\N
16	2025-08-28 06:24:52.534309+00	15	1	1	60000	\N
17	2025-08-28 06:26:51.020751+00	16	2	1	70000	\N
18	2025-08-28 09:01:19.786319+00	17	4	1	100000	\N
19	2025-08-28 09:01:19.786319+00	17	3	1	550000	\N
20	2025-08-31 03:07:43.915723+00	18	3	1	550000	\N
21	2025-08-31 03:45:40.786192+00	19	5	1	60000	\N
22	2025-08-31 11:06:58.741497+00	20	6	1	200000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
23	2025-08-31 11:11:41.156726+00	21	6	1	200000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
24	2025-08-31 11:27:31.716007+00	22	6	1	200000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
25	2025-09-07 09:26:32.456617+00	23	10	1	1100	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
26	2025-09-08 04:18:29.971315+00	24	14	1	1000	339c2626-f428-4824-91c7-d5f9c1679542
27	2025-09-08 09:31:37.974183+00	25	8	1	500000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
28	2025-09-09 00:07:21.871704+00	26	7	1	60000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
29	2025-09-09 00:27:06.663058+00	27	10	1	1100	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
30	2025-09-10 12:51:11.005179+00	28	10	1	1100	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
31	2025-09-12 16:31:26.632812+00	29	17	1	1000	90955b24-b201-49d8-92d4-5c7236a592aa
32	2025-09-12 16:31:26.632812+00	29	16	1	15000	90955b24-b201-49d8-92d4-5c7236a592aa
33	2025-09-13 00:03:43.279617+00	30	7	1	60000	ae5426bb-8493-4d6a-ab64-cc86bcc86b4b
34	2025-09-29 08:05:03.747276+00	31	19	1	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
35	2025-09-29 08:05:33.975134+00	32	19	1	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
36	2025-09-29 08:06:08.964614+00	33	19	1	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
37	2025-10-02 00:50:09.800155+00	34	19	1	2000	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."supplier_payments" ("id", "supplier_id", "purchase_id", "amount", "payment_date", "payment_method", "notes", "created_at", "user_id") FROM stdin;
1	2	\N	9000.00	2025-09-29	Cash	\N	2025-09-29 01:59:25.07734+00	90955b24-b201-49d8-92d4-5c7236a592aa
2	2	\N	-1000.00	2025-09-29	Cash	Credit settlement	2025-09-29 02:04:13.811355+00	90955b24-b201-49d8-92d4-5c7236a592aa
3	4	\N	2500.00	2025-09-29	Cash	\N	2025-09-29 08:00:22.563391+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
4	4	3	7500.00	2025-09-29	Cash	\N	2025-09-29 08:00:44.104567+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
5	4	\N	-2000.00	2025-09-29	Cash	Credit settlement	2025-09-29 08:01:47.049868+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
6	4	4	5000.00	2025-09-29	Cash	\N	2025-09-29 12:19:03.640354+00	b2f42503-8316-4bba-9fa9-c2a216dd9e38
\.


--
-- Data for Name: user_category_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."user_category_settings" ("user_id", "category_id", "is_visible") FROM stdin;
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	1	t
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	5	t
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	6	t
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	2	t
ae5426bb-8493-4d6a-ab64-cc86bcc86b4b	7	f
728cf0b0-304a-42b7-95a4-3caf1132aca8	1	t
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 97, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."categories_id_seq"', 17, true);


--
-- Name: customer_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."customer_payments_id_seq"', 13, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."customers_id_seq"', 12, true);


--
-- Name: dummy_test_table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."dummy_test_table_id_seq"', 1, false);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."expense_categories_id_seq"', 12, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."expenses_id_seq"', 5, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."inventory_id_seq"', 263, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."products_id_seq"', 19, true);


--
-- Name: purchase_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."purchase_items_id_seq"', 1, false);


--
-- Name: purchase_return_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."purchase_return_items_id_seq"', 4, true);


--
-- Name: purchase_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."purchase_returns_id_seq"', 3, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."purchases_id_seq"', 4, true);


--
-- Name: sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sale_items_id_seq"', 37, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sales_id_seq"', 34, true);


--
-- Name: supplier_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."supplier_payments_id_seq"', 6, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."suppliers_id_seq"', 7, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict vJQJrymIQgbKX4xNV2l3HN2EhC0TsGZZ57vnEKJvBtaZLbdaiCsuVx6lvtb3Si3

RESET ALL;
