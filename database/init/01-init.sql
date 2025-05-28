-- IntelliFin Database Initialization Script
-- This script sets up the initial database structure and extensions

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to generate tenant schema names
CREATE OR REPLACE FUNCTION generate_tenant_schema_name(tenant_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN 'tenant_' || REPLACE(tenant_id::TEXT, '-', '_');
END;
$$ LANGUAGE plpgsql;

-- Create a function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := generate_tenant_schema_name(tenant_id);
    
    -- Create the schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Grant permissions
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO intellifin', schema_name);
    EXECUTE format('GRANT CREATE ON SCHEMA %I TO intellifin', schema_name);
    
    -- Set default privileges for future tables
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO intellifin', schema_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO intellifin', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Create a function to drop tenant schema
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := generate_tenant_schema_name(tenant_id);
    
    -- Drop the schema and all its contents
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function for tracking changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = COALESCE(NEW.created_at, NOW());
        NEW.updated_at = COALESCE(NEW.updated_at, NOW());
        RETURN NEW;
    END IF;
    
    -- For UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        -- Prevent modification of created_at
        NEW.created_at = OLD.created_at;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to add audit fields to a table
CREATE OR REPLACE FUNCTION add_audit_fields(table_name TEXT, schema_name TEXT DEFAULT 'public')
RETURNS VOID AS $$
BEGIN
    -- Add audit columns if they don't exist
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', schema_name, table_name);
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()', schema_name, table_name);
    
    -- Create trigger for audit fields
    EXECUTE format('DROP TRIGGER IF EXISTS %I_audit_trigger ON %I.%I', table_name, schema_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_audit_trigger BEFORE INSERT OR UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()', table_name, schema_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create a function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of deleting, set deleted_at timestamp
    UPDATE SET deleted_at = NOW() WHERE id = OLD.id;
    RETURN NULL; -- Don't actually delete the row
END;
$$ LANGUAGE plpgsql;

-- Create a function to add soft delete to a table
CREATE OR REPLACE FUNCTION add_soft_delete(table_name TEXT, schema_name TEXT DEFAULT 'public')
RETURNS VOID AS $$
BEGIN
    -- Add deleted_at column if it doesn't exist
    EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE', schema_name, table_name);
    
    -- Create index for soft delete queries
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I_deleted_at_idx ON %I.%I (deleted_at) WHERE deleted_at IS NULL', table_name, schema_name, table_name);
    
    -- Create trigger for soft delete
    EXECUTE format('DROP TRIGGER IF EXISTS %I_soft_delete_trigger ON %I.%I', table_name, schema_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_soft_delete_trigger BEFORE DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION soft_delete_function()', table_name, schema_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate secure random tokens
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create a function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql;

-- Create a function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'IntelliFin database initialization completed successfully';
END $$;
