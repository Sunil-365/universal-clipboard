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
CREATE POLICY "Users can manage their own rooms" ON public.rooms
    FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- Create policy to allow anyone to select rooms (for checking existence when joining)
CREATE POLICY "Anyone can check rooms" ON public.rooms
    FOR SELECT TO anon, authenticated USING (true);


-- 3. REVIEWS TABLE (Stores user feedback submissions)
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT TO anon, authenticated USING (true);

-- Create policy to allow anyone to post reviews (limited to 500 chars)
CREATE POLICY "Anyone can submit reviews" ON public.reviews
    FOR INSERT TO anon, authenticated WITH CHECK (length(content) <= 500);
