import { useState, useEffect } from 'react';
import { supabase, Subject } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Calendar, TrendingUp, TrendingDown, Loader2, LogOut, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

type AttendanceStats = {
  subject: Subject;
  present: number;
  absent: number;
  total: number;
  percentage: number;
};

function PeriodButton({ label, value, selected, onSelect }: {
  label: string;
  value: 'week' | 'month' | 'all';
  selected: 'week' | 'month' | 'all';
  onSelect: (v: 'week' | 'month' | 'all') => void;
}) {
  const isSelected = selected === value;
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(value)}
      className={`px-4 py-2 rounded-xl font-medium transition-all ${
        isSelected
          ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/20'
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {label}
    </motion.button>
  );
}

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadAttendance();
  }, [selectedPeriod]);

  async function loadAttendance() {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    let query = supabase
      .from('attendance')
      .select('subject_id, status, date, subjects(id, name)')
      .eq('student_id', user.id);

    const today = new Date();
    if (selectedPeriod === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('date', weekAgo.toISOString().split('T')[0]);
    } else if (selectedPeriod === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte('date', monthAgo.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Group by subject
    const subjectMap = new Map<string, { subject: Subject; present: number; absent: number }>();

    data.forEach((record: { subject_id: string; status: string; subjects: Subject }) => {
      const subjectId = record.subject_id;
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: record.subjects,
          present: 0,
          absent: 0,
        });
      }
      const entry = subjectMap.get(subjectId)!;
      if (record.status === 'present') {
        entry.present++;
      } else {
        entry.absent++;
      }
    });

    const formattedStats: AttendanceStats[] = Array.from(subjectMap.values()).map(entry => {
      const total = entry.present + entry.absent;
      return {
        subject: entry.subject,
        present: entry.present,
        absent: entry.absent,
        total,
        percentage: total > 0 ? (entry.present / total) * 100 : 0,
      };
    });

    setStats(formattedStats);
    setLoading(false);
  }

  const overallPercentage = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length
    : 0;

  const totalClasses = stats.reduce((sum, s) => sum + s.total, 0);
  const totalPresent = stats.reduce((sum, s) => sum + s.present, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-gray-600 font-medium">Loading your stats...</span>
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
                <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
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
        {/* Period Filter */}
        <div className="flex gap-2 mb-8">
          <PeriodButton label="All Time" value="all" selected={selectedPeriod} onSelect={setSelectedPeriod} />
          <PeriodButton label="This Month" value="month" selected={selectedPeriod} onSelect={setSelectedPeriod} />
          <PeriodButton label="This Week" value="week" selected={selectedPeriod} onSelect={setSelectedPeriod} />
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Overall</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{overallPercentage.toFixed(1)}%</p>
            <p className="text-gray-500">Attendance Rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Present</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{totalPresent}</p>
            <p className="text-gray-500">Classes Attended</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{totalClasses}</p>
            <p className="text-gray-500">Total Classes</p>
          </motion.div>
        </div>

        {/* Subject-wise Stats */}
        {stats.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Subject-wise Attendance</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.subject.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{stat.subject.name}</h3>
                      <p className="text-sm text-gray-500">
                        {stat.present} present, {stat.absent} absent
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        stat.percentage >= 75 ? 'text-emerald-600' :
                        stat.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stat.percentage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">of {stat.total} classes</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                      className={`h-full rounded-full ${
                        stat.percentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        stat.percentage >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                        'bg-gradient-to-r from-red-400 to-rose-500'
                      }`}
                    />
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 flex items-center gap-2">
                    {stat.percentage >= 75 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-emerald-600 font-medium">Good standing</span>
                      </>
                    ) : stat.percentage >= 50 ? (
                      <>
                        <TrendingDown className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600 font-medium">Needs improvement</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-red-600 font-medium">Critical - Below threshold</span>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-200 p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No attendance records</h3>
            <p className="text-gray-500">Your faculty hasn't marked your attendance yet.</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
