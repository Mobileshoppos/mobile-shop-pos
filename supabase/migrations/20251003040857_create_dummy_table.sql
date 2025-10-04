CREATE TABLE dummy_test_table (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);