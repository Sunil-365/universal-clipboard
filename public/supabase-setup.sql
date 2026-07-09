-- Supabase Setup Script for DropConnect
-- Run this in your Supabase SQL Editor to initialize the database tables and security policies.

-- 1. CLIPS TABLE (Stores user clipboard history)
CREATE TABLE IF NOT EXISTS public.clips (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own clips
DROP POLICY IF EXISTS "Users can manage their own clips" ON public.clips;
CREATE POLICY "Users can manage their own clips" ON public.clips
    FOR ALL TO authenticated USING (auth.uid() = user_id);


-- 2. ROOMS TABLE (Stores custom persistent rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
    id text PRIMARY KEY,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own custom rooms
DROP POLICY IF EXISTS "Users can manage their own rooms" ON public.rooms;
CREATE POLICY "Users can manage their own rooms" ON public.rooms
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- Delete public selection policy to ensure rooms metadata is private to owners
DROP POLICY IF EXISTS "Anyone can check rooms" ON public.rooms;


-- 3. REVIEWS TABLE (Stores user feedback submissions)
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT TO anon, authenticated USING (true);

-- Create policy to allow anyone to post reviews (limited to 500 chars)
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.reviews;
CREATE POLICY "Anyone can submit reviews" ON public.reviews
    FOR INSERT TO anon, authenticated WITH CHECK (length(content) <= 500);


-- 4. PROFILES TABLE (Links public profile details to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own profile
DROP POLICY IF EXISTS "Users can manage own profiles" ON public.profiles;
CREATE POLICY "Users can manage own profiles" ON public.profiles
    FOR ALL TO authenticated USING (auth.uid() = id);

-- TRIGGER to automatically create a public profile on new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public to fix security warnings
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
-- Grant execute back to the roles that need it (Supabase Auth uses supabase_auth_admin)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
