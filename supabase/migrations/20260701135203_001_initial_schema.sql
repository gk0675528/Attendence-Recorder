/*
# Smart Attendance System - Initial Schema

1. New Tables
- `profiles`: Extends auth.users with role (student/faculty) and full_name
- `subjects`: Academic subjects (Math, Physics, etc.)
- `attendance`: Attendance records linking students to subjects with dates and status

2. Security
- Enable RLS on all tables
- Owner-scoped policies for profiles (users can only access their own profile)
- Faculty can manage subjects and attendance
- Students can view their own attendance

3. Relationships
- profiles.id → auth.users.id (1:1)
- attendance.student_id → profiles.id
- attendance.subject_id → subjects.id
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'faculty')),
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, subject_id, date)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Profiles policies (users can manage their own profile)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Subjects policies (all authenticated users can read, faculty can manage)
DROP POLICY IF EXISTS "read_subjects" ON subjects;
CREATE POLICY "read_subjects" ON subjects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "manage_subjects" ON subjects;
CREATE POLICY "manage_subjects" ON subjects FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty')
  );

-- Attendance policies
-- Students can view their own attendance
DROP POLICY IF EXISTS "select_own_attendance" ON attendance;
CREATE POLICY "select_own_attendance" ON attendance FOR SELECT
  TO authenticated USING (
    auth.uid() = student_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty')
  );

-- Faculty can insert/update attendance
DROP POLICY IF EXISTS "faculty_insert_attendance" ON attendance;
CREATE POLICY "faculty_insert_attendance" ON attendance FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty')
  );

DROP POLICY IF EXISTS "faculty_update_attendance" ON attendance;
CREATE POLICY "faculty_update_attendance" ON attendance FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty')
  );

DROP POLICY IF EXISTS "faculty_delete_attendance" ON attendance;
CREATE POLICY "faculty_delete_attendance" ON attendance FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'faculty')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
