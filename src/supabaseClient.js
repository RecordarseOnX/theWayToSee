// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ⚠️ 替换成你的 Supabase 项目的真实 URL 和匿名 key
const SUPABASE_URL = 'https://psevhivkuzmnecchnbnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZXZoaXZrdXptbmVjY2huYm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjgyNjEsImV4cCI6MjA2NDU0NDI2MX0.bidNts1qoyLm6X5EP5MPy6TNPc_t5FE4ZmDnyKk5yWc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
