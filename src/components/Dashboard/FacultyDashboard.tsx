import { useState, useEffect } from 'react';
import { supabase, Profile, Subject } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, Calendar, Check, X, Loader2, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type StudentWithAttendance = Profile & {
  isPresent: boolean;
};

export default function FacultyDashboard() {
  const { profile, signOut } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [subjectsRes, studentsRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
    ]);

    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (studentsRes.data) {
      setStudents(studentsRes.data.map(s => ({ ...s, isPresent: false })));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedSubject && selectedDate) {
      loadAttendance();
    }
  }, [selectedSubject, selectedDate]);

  async function loadAttendance() {
    if (!selectedSubject) return;

    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('subject_id', selectedSubject)
      .eq('date', selectedDate);

    setStudents(prev =>
      prev.map(student => ({
        ...student,
        isPresent: attendance?.find(a => a.student_id === student.id)?.status === 'present',
      }))
    );
  }

  function toggleStudent(studentId: string) {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, isPresent: !s.isPresent } : s))
    );
  }

  function markAllPresent() {
    setStudents(prev => prev.map(s => ({ ...s, isPresent: true })));
  }

  function markAllAbsent() {
    setStudents(prev => prev.map(s => ({ ...s, isPresent: false })));
  }

  async function saveAttendance() {
    if (!selectedSubject || !selectedDate) return;
    setSaving(true);

    try {
      await supabase
        .from('attendance')
        .delete()
        .eq('subject_id', selectedSubject)
        .eq('date', selectedDate);

      const records = students
        .filter(s => s.isPresent)
        .map(s => ({
          student_id: s.id,
          subject_id: selectedSubject,
          date: selectedDate,
          status: 'present' as const,
        }));

      if (records.length > 0) {
        await supabase.from('attendance').insert(records);
      }

      // Insert absent records
      const absentRecords = students
        .filter(s => !s.isPresent)
        .map(s => ({
          student_id: s.id,
          subject_id: selectedSubject,
          date: selectedDate,
          status: 'absent' as const,
        }));

      if (absentRecords.length > 0) {
        await supabase.from('attendance').insert(absentRecords);
      }

      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-600 font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Faculty Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {profile?.full_name}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selection Controls */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mark Attendance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-2" />
                Select Subject
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className={selectedSubject ? 'text-gray-900' : 'text-gray-400'}>
                    {subjects.find(s => s.id === selectedSubject)?.name || 'Choose a subject'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                    >
                      {subjects.map(subject => (
                        <button
                          key={subject.id}
                          onClick={() => {
                            setSelectedSubject(subject.id);
                            setShowDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                            selectedSubject === subject.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {subject.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Student List */}
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Students ({students.filter(s => s.isPresent).length}/{students.length} present)
                  </h2>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={markAllPresent}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                  >
                    Mark All Present
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={markAllAbsent}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
                  >
                    Mark All Absent
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleStudent(student.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                    student.isPresent ? 'bg-emerald-50/50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      student.isPresent
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {student.isPresent ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.full_name}</p>
                      <p className="text-sm text-gray-500">Student ID: {student.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div
                    className={`w-16 h-8 rounded-full p-1 transition-colors ${
                      student.isPresent ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <motion.div
                      animate={{ x: student.isPresent ? 32 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="w-6 h-6 bg-white rounded-full shadow-md"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Save Button */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={saveAttendance}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Attendance
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
