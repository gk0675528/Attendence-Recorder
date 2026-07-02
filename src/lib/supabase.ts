import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  role: 'student' | 'faculty';
  full_name: string;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'present' | 'absent';
  created_at: string;
};

export type AttendanceWithDetails = Attendance & {
  subject: Subject;
  student: Profile;
};
