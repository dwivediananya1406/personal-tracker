-- Run this entire SQL script in your Supabase SQL Editor

-- 1. Create the user_data table to store the state for each authenticated user
CREATE TABLE IF NOT EXISTS user_data (
  id uuid REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS) on the table
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows a user to select their own data
CREATE POLICY "Users can view their own data."
  ON user_data FOR SELECT
  USING ( auth.uid() = id );

-- 4. Create a policy that allows a user to insert/update their own data
CREATE POLICY "Users can insert/update their own data."
  ON user_data FOR ALL
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );
