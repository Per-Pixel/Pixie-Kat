-- PostgreSQL Database Setup for PixieKat CMS
-- Run this file to create the database and user

-- Create database
CREATE DATABASE pixiekat;

-- Connect to the database
\c pixiekat

-- Create user (optional - you can use postgres user instead)
-- CREATE USER pixiekat_user WITH PASSWORD 'change_this_password';
-- GRANT ALL PRIVILEGES ON DATABASE pixiekat TO pixiekat_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pixiekat_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pixiekat_user;

-- Enable UUID extension (required for our schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The tables will be created automatically when you start the server
-- This is just to set up the database and user

-- Verify setup
SELECT version();
\l pixiekat
