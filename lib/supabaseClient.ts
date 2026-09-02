import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://lkehwdhiftoizxjbolvu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZWh3ZGhpZnRvaXp4amJvbHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzODA0MTgsImV4cCI6MjEwMzk1NjQxOH0.y1D3jMPEniuI5cOwlGuqyTz2zd-k4el9ThKVlDNS6Uc"
);
