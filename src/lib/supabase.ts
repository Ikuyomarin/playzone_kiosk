import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cpgrnvgluzvtycxzoxyk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZ3JudmdsdXp2dHljeHpveHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MjY5ODMsImV4cCI6MjA1ODMwMjk4M30.7_yHWAAxB1BnBbjAHhlHIiehBHmwJPuUJFnohMCJ3PU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
