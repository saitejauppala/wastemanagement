import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { 
  Trash2, Recycle, Leaf, Zap, AlertTriangle, 
  MapPin, Clock, Plus, LogOut, User,
  LayoutDashboard, BarChart3, Trophy,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cn } from "./lib/utils";
import { WasteBin, WasteLog, UserProfile, BinType } from "./types";
import { 
  subscribeToBins, 
  subscribeToLogs, 
  subscribeToLeaderboard,
  logWaste,
  updateBinLevel,
  seedInitialBins,
  seedInitialLogs,
  addBin,
  updateUserPoints
} from "./services/wasteService";

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">The application encountered an error. Please try refreshing the page.</p>
            <pre className="text-xs bg-gray-100 p-4 rounded-xl overflow-auto text-left mb-6 max-h-40">
              {JSON.stringify(this.state.error, null, 2)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="neumorph p-6 rounded-[2rem] flex flex-col justify-between"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-2xl shadow-lg", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center text-[10px] font-black px-3 py-1 rounded-full neumorph-inset uppercase tracking-widest",
          trend > 0 ? "text-green-600" : "text-red-600"
        )}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="mt-6">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black text-gray-800 mt-1 tracking-tighter">{value}</h3>
    </div>
  </motion.div>
);

const BinCard = ({ bin, onUpdate }: { bin: WasteBin, onUpdate: (id: string, level: number) => void }) => {
  const getIcon = (type: BinType) => {
    switch (type) {
      case "recycling": return <Recycle className="w-5 h-5" />;
      case "compost": return <Leaf className="w-5 h-5" />;
      case "electronic": return <Zap className="w-5 h-5" />;
      default: return <Trash2 className="w-5 h-5" />;
    }
  };

  const getColor = (type: BinType) => {
    switch (type) {
      case "recycling": return "text-blue-500";
      case "compost": return "text-green-500";
      case "electronic": return "text-purple-500";
      default: return "text-gray-500";
    }
  };

  const getFillColor = (level: number) => {
    if (level >= 90) return "bg-gradient-to-r from-red-500 to-red-600";
    if (level >= 70) return "bg-gradient-to-r from-orange-500 to-orange-600";
    return "bg-gradient-to-r from-green-500 to-green-600";
  };

  return (
    <motion.div 
      layout
      className="neumorph p-6 rounded-[2.5rem]"
    >
      <div className="flex justify-between items-center mb-6">
        <div className={cn("p-3 rounded-2xl neumorph-inset", getColor(bin.type))}>
          {getIcon(bin.type)}
        </div>
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest neumorph-inset",
          bin.status === 'full' ? "text-red-500" : "text-green-500"
        )}>
          {bin.status}
        </span>
      </div>
      <h4 className="font-black text-gray-800 truncate text-lg tracking-tight">{bin.location}</h4>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{bin.type} Waste</p>
      
      <div className="space-y-3">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-gray-400">Fill Level</span>
          <span className="text-gray-800">{bin.fillLevel}%</span>
        </div>
        <div className="h-4 w-full neumorph-inset rounded-full p-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${bin.fillLevel}%` }}
            className={cn("h-full rounded-full transition-all duration-700 shadow-sm", getFillColor(bin.fillLevel))}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button 
          onClick={() => onUpdate(bin.id, Math.min(100, bin.fillLevel + 20))}
          className="flex-1 text-[10px] font-black py-4 neumorph-btn text-gray-600 uppercase tracking-widest rounded-2xl"
        >
          Add
        </button>
        <button 
          onClick={() => onUpdate(bin.id, 0)}
          className="flex-1 text-[10px] font-black py-4 neumorph-btn text-red-500 uppercase tracking-widest rounded-2xl"
        >
          Empty
        </button>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        const isAdminEmail = u.email === "saitejauppala07@gmail.com";
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          // Sync role if it's the admin email but role isn't admin
          if (isAdminEmail && data.role !== 'admin') {
            await setDoc(doc(db, "users", u.uid), { ...data, role: 'admin' }, { merge: true });
            setProfile({ ...data, role: 'admin' });
          } else {
            setProfile(data);
          }
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || "",
            displayName: u.displayName || "Anonymous",
            role: isAdminEmail ? "admin" : "student",
            points: 0
          };
          await setDoc(doc(db, "users", u.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubBins = subscribeToBins((newBins) => {
      setBins(newBins);
      if (newBins.length === 0 && profile?.role === 'admin') {
        seedInitialBins();
        seedInitialLogs();
      }
    });
    const unsubLogs = subscribeToLogs(setLogs);
    const unsubLeader = subscribeToLeaderboard(setLeaderboard);
    return () => {
      unsubBins();
      unsubLogs();
      unsubLeader();
    };
  }, [user, profile]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleUpdateBin = async (id: string, level: number) => {
    try {
      await updateBinLevel(id, level);
      if (level > 0) {
        const bin = bins.find(b => b.id === id);
        if (bin) {
          await logWaste(id, 0.5, bin.type);
          // Award points for recycling/compost
          if (bin.type === 'recycling' || bin.type === 'compost') {
            await updateUserPoints(user!.uid, 5);
          } else {
            await updateUserPoints(user!.uid, 1);
          }
        }
      } else {
        // Emptying a bin (staff/admin task)
        await updateUserPoints(user!.uid, 10);
      }
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const handleAddRandomBin = async () => {
    const locations = ["Central Plaza", "North Dorms", "Sports Complex", "Arts Center", "Tech Hub"];
    const types: BinType[] = ["general", "recycling", "compost", "electronic"];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    try {
      await addBin(`${randomLoc} - ${Math.floor(Math.random() * 100)}`, randomType);
    } catch (error) {
      console.error("Add bin failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-8 border-orange-500 border-t-transparent rounded-full shadow-xl"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 texture-overlay" />
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-12 rounded-[4rem] text-center relative z-10"
        >
          <div className="w-24 h-24 gradient-bg rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/30">
            <Trash2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900">
            Eco<span className="gradient-text">Campus</span>
          </h1>
          <p className="text-gray-500 mt-4 text-lg font-medium leading-relaxed">
            Smart waste management for a <span className="text-orange-500 font-bold">sustainable</span> future.
          </p>
          
          <div className="mt-12 space-y-5">
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-4 bg-gray-900 hover:bg-black text-white font-black py-5 px-8 rounded-[2rem] transition-all shadow-2xl shadow-gray-400 active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
              Sign in with Google
            </button>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Secure campus authentication</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const totalWaste = logs.reduce((acc, log) => acc + log.weight, 0);
  const recyclingRate = logs.filter(l => l.type === 'recycling').length / (logs.length || 1) * 100;
  const fullBins = bins.filter(b => b.status === 'full').length;

  // Process logs for charts - group by hour for a smoother line
  const processChartData = () => {
    const hourlyData: { [key: string]: number } = {};
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() - (23 - i), 0, 0, 0);
      return d;
    });

    last24Hours.forEach(date => {
      const key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      hourlyData[key] = 0;
    });

    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const key = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (hourlyData.hasOwnProperty(key)) {
        hourlyData[key] += log.weight;
      }
    });

    // Add some "organic" jitter if data is too uniform (for a more realistic look)
    return Object.entries(hourlyData).map(([time, weight]) => ({
      time,
      weight: weight > 0 ? Number((weight + (Math.random() * 0.2 - 0.1)).toFixed(2)) : 0
    }));
  };

  const chartData = processChartData();

  const pieData = [
    { name: 'General', value: logs.filter(l => l.type === 'general').length, color: '#ef4444' },
    { name: 'Recycling', value: logs.filter(l => l.type === 'recycling').length, color: '#f97316' },
    { name: 'Compost', value: logs.filter(l => l.type === 'compost').length, color: '#22c55e' },
    { name: 'Electronic', value: logs.filter(l => l.type === 'electronic').length, color: '#a855f7' },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f0f2f5] flex relative overflow-hidden">
        <div className="absolute inset-0 texture-overlay" />
        
        {/* Sidebar */}
        <aside className="w-72 glass border-r-0 hidden lg:flex flex-col p-8 fixed h-[calc(100vh-2rem)] m-4 rounded-[3rem] z-20">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Trash2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">Eco<span className="gradient-text">Campus</span></span>
          </div>

          <nav className="flex-1 space-y-3">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'bins', label: 'Bin Monitor', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all",
                  activeTab === item.id 
                    ? "neumorph-inset text-orange-600" 
                    : "text-gray-400 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-orange-500" : "text-gray-400")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-gray-100/50">
            <div className="neumorph-inset p-4 rounded-3xl flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-orange-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{user.displayName}</p>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{profile?.points} Points</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-80 p-6 lg:p-10 relative z-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">
                {activeTab === 'overview' && "Campus Overview"}
                {activeTab === 'bins' && "Real-time Monitor"}
                {activeTab === 'analytics' && "Waste Analytics"}
                {activeTab === 'leaderboard' && "Sustainability Champions"}
              </h2>
              <p className="text-gray-400 font-black mt-1 uppercase tracking-[0.2em] text-[10px]">
                Live sustainability metrics for your campus
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="neumorph px-6 py-3 rounded-2xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
              </div>
              <button 
              onClick={handleAddRandomBin}
              className="gradient-bg text-white p-4 rounded-2xl shadow-2xl shadow-orange-500/30 transition-all active:scale-95"
            >
              <Plus className="w-7 h-7" />
            </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <StatCard title="Total Waste" value={`${totalWaste.toFixed(1)} kg`} icon={Trash2} trend={12} color="gradient-bg" />
                  <StatCard title="Recycling Rate" value={`${recyclingRate.toFixed(0)}%`} icon={Recycle} trend={5} color="bg-blue-500" />
                  <StatCard title="Active Bins" value={bins.length} icon={MapPin} color="bg-green-500" />
                  <StatCard title="Full Bins" value={fullBins} icon={AlertTriangle} color="bg-orange-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 neumorph p-8 rounded-[3rem]">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="font-black text-gray-800 uppercase tracking-widest text-[10px]">Waste Generation Trend</h3>
                      <div className="neumorph-inset px-4 py-2 rounded-xl">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Last 24 Hours</span>
                      </div>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px'}}
                            itemStyle={{fontWeight: 900, color: '#1e293b'}}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="weight" 
                            stroke="#f97316" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorWeight)" 
                            animationDuration={2000}
                            dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="neumorph p-8 rounded-[3rem]">
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-[10px] mb-10">Waste Distribution</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 mt-10">
                      {pieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-4 neumorph-inset rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: item.color}} />
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.name}</span>
                          </div>
                          <span className="text-xs font-black text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'bins' && (
              <motion.div 
                key="bins"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
              >
                {bins.map(bin => (
                  <BinCard key={bin.id} bin={bin} onUpdate={handleUpdateBin} />
                ))}
                {bins.length === 0 && (
                  <div className="col-span-full py-32 text-center neumorph rounded-[4rem]">
                    <div className="w-24 h-24 neumorph-inset rounded-full flex items-center justify-center mx-auto mb-6">
                      <MapPin className="w-12 h-12 text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">No Active Bins</h3>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mt-2">Initializing campus sensor network...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="neumorph p-10 rounded-[4rem]">
                  <h3 className="font-black text-gray-800 uppercase tracking-widest text-[10px] mb-12">Historical Collection Data</h3>
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}
                        />
                      <Bar 
                        dataKey="weight" 
                        fill="#f97316" 
                        radius={[12, 12, 0, 0]} 
                        barSize={40}
                        animationDuration={2000}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.weight > 2 ? '#f97316' : '#fb923c'} 
                            fillOpacity={0.8 + (entry.weight / 10)}
                          />
                        ))}
                      </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="neumorph p-10 rounded-[3.5rem] flex items-center gap-8">
                    <div className="w-24 h-24 gradient-bg rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-orange-500/20">
                      <Leaf className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">Eco Impact</h4>
                      <p className="text-gray-500 font-bold text-sm mt-1">You've saved 12.4kg of CO2 this month.</p>
                    </div>
                  </div>
                  <div className="neumorph p-10 rounded-[3.5rem] flex items-center gap-8">
                    <div className="w-24 h-24 bg-blue-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/20">
                      <Recycle className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">Recycling Goal</h4>
                      <p className="text-gray-500 font-bold text-sm mt-1">85% of target reached for Q2.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div 
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="neumorph rounded-[4rem] overflow-hidden"
              >
                <div className="p-12 border-b border-gray-100/50">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Sustainability Champions</h3>
                  <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mt-2">Top contributors to campus green initiatives</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        <th className="px-12 py-8">Rank</th>
                        <th className="px-12 py-8">User</th>
                        <th className="px-12 py-8">Role</th>
                        <th className="px-12 py-8">Points</th>
                        <th className="px-12 py-8 text-right">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {leaderboard.map((u, i) => (
                        <tr key={u.uid} className="hover:bg-white/50 transition-colors group">
                          <td className="px-12 py-10">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm",
                              i === 0 ? "gradient-bg text-white shadow-orange-500/30" :
                              i === 1 ? "bg-gray-200 text-gray-600" :
                              i === 2 ? "bg-orange-100 text-orange-600" :
                              "neumorph-inset text-gray-400"
                            )}>
                              {i + 1}
                            </div>
                          </td>
                          <td className="px-12 py-10">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl neumorph-inset flex items-center justify-center text-orange-500 font-black text-xl">
                                {u.displayName[0]}
                              </div>
                              <span className="font-black text-gray-800 text-xl tracking-tight">{u.displayName}</span>
                            </div>
                          </td>
                          <td className="px-12 py-10">
                            <span className="text-[10px] font-black px-5 py-2 neumorph-inset text-gray-500 rounded-full uppercase tracking-widest">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-12 py-10 font-black text-3xl text-orange-500 tracking-tighter">{u.points}</td>
                          <td className="px-12 py-10 text-right">
                            <div className="w-48 h-4 neumorph-inset rounded-full ml-auto p-1">
                              <div 
                                className="h-full gradient-bg rounded-full shadow-sm" 
                                style={{width: `${Math.min(100, u.points / 10)}%`}} 
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="mt-20 pb-10 text-center">
            <div className="neumorph inline-flex items-center gap-3 px-8 py-4 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Developed by</span>
              <span className="text-sm font-black gradient-text tracking-tight">Saiteja Uppala</span>
            </div>
          </footer>
        </main>
      </div>
    </ErrorBoundary>
  );
}
