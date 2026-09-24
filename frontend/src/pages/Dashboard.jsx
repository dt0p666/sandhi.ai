import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  PlusCircle, 
  User, 
  LogOut, 
  ChevronDown, 
  MapPin, 
  Building2, 
  Phone, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  Eye, 
  X, 
  ShieldCheck, 
  ArrowLeft, 
  Stethoscope, 
  HeartPulse, 
  Sparkles, 
  Printer,
  Calendar,
  ClipboardList
} from "lucide-react"
import { getScreenings, addScreening, updateScreeningStatus, updateCarePlan } from "../utils/screeningsStore"

export default function Dashboard() {
  const navigate = useNavigate()
  
  // Doctor/Admin Session User
  const [user, setUser] = useState({
    username: "invictus",
    full_name: "Dr. Invictus Barman",
    role: "Nodal Orthopedic Officer",
    state: "Assam",
    phone: "+91 98640 11000",
    center: "GMCH Guwahati"
  })

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)

  // Real-time Screenings Data
  const [screenings, setScreenings] = useState([])
  const [selectedScreening, setSelectedScreening] = useState(null)
  const [doctorNotes, setDoctorNotes] = useState("")
  const [saveStatusMsg, setSaveStatusMsg] = useState("")
  const [simulating, setSimulating] = useState(false)
  const [recentSyncId, setRecentSyncId] = useState(null)

  // Doctor Review & Care Plan Workflow (Part A)
  const [modalTab, setModalTab] = useState("REVIEW") // "REVIEW" | "CARE_PLAN"
  const [carePlanExercises, setCarePlanExercises] = useState([])
  const [carePlanCustomExercise, setCarePlanCustomExercise] = useState("")
  const [carePlanLifestyle, setCarePlanLifestyle] = useState("")
  const [carePlanFollowUpDate, setCarePlanFollowUpDate] = useState("")
  const [carePlanTargetPain, setCarePlanTargetPain] = useState("Mild (VAS 1-3)")
  const [carePlanTargetMobility, setCarePlanTargetMobility] = useState("Target 10+ STS Reps")
  const [carePlanPhysioReferral, setCarePlanPhysioReferral] = useState(false)
  const [carePlanReassessment, setCarePlanReassessment] = useState("90_DAYS")

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRisk, setFilterRisk] = useState("ALL")
  const [filterState, setFilterState] = useState("ALL")
  const [filterStatus, setFilterStatus] = useState("ALL")

  // Load User & Screenings
  const refreshData = () => {
    const list = getScreenings()
    setScreenings(list)
  }

  useEffect(() => {
    // ── ROLE GUARD: Doctor Hub is strictly doctor-only ──
    // If no sandhi_user with role="doctor" is found, reject access immediately.
    try {
      const stored = localStorage.getItem("sandhi_user")
      if (!stored) {
        // No doctor session — could be a patient or not logged in
        navigate("/", { replace: true })
        return
      }
      const parsed = JSON.parse(stored)
      if (parsed.role !== "doctor") {
        // sandhi_user exists but is not a doctor (e.g., wrong role)
        navigate("/", { replace: true })
        return
      }
      setUser(parsed)
    } catch {
      navigate("/", { replace: true })
      return
    }

    refreshData()

    // Listen for live updates from test submissions
    const handleUpdate = (e) => {
      refreshData()
      if (e?.detail?.id) {
        setRecentSyncId(e.detail.id)
        setTimeout(() => setRecentSyncId(null), 5000)
      }
    }

    window.addEventListener("sandhi_screenings_updated", handleUpdate)
    window.addEventListener("storage", refreshData)

    return () => {
      window.removeEventListener("sandhi_screenings_updated", handleUpdate)
      window.removeEventListener("storage", refreshData)
    }
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("sandhi_token")
    localStorage.removeItem("sandhi_user")
    navigate("/")
  }

  // Summary KPI Calculations
  const metrics = useMemo(() => {
    const total = screenings.length
    const high = screenings.filter(s => s.scores?.riskCategory === "HIGH").length
    const moderate = screenings.filter(s => s.scores?.riskCategory === "MODERATE").length
    const low = screenings.filter(s => s.scores?.riskCategory === "LOW").length
    const avgWomac = total > 0 
      ? Math.round(screenings.reduce((acc, s) => acc + (s.scores?.womacScore || 0), 0) / total) 
      : 0

    return { total, high, moderate, low, avgWomac }
  }, [screenings])

  // NER Regional Surveillance Aggregates
  const nerSurveillance = useMemo(() => {
    const states = [
      { name: "Assam", hospital: "GMCH Guwahati" },
      { name: "Manipur", hospital: "RIMS Imphal" },
      { name: "Meghalaya", hospital: "NEIGRIHMS Shillong" },
      { name: "Mizoram", hospital: "Civil Hospital Aizawl" },
      { name: "Arunachal Pradesh", hospital: "TRIHMS Naharlagun" },
      { name: "Nagaland", hospital: "Naga Hospital Kohima" },
      { name: "Tripura", hospital: "AGMC Agartala" },
      { name: "Sikkim", hospital: "STNM Gangtok" }
    ]

    return states.map(st => {
      const stateScreenings = screenings.filter(s => s.patient?.state === st.name)
      const highCount = stateScreenings.filter(s => s.scores?.riskCategory === "HIGH").length
      return {
        ...st,
        count: stateScreenings.length,
        highCount: highCount,
        rate: stateScreenings.length > 0 ? Math.round((highCount / stateScreenings.length) * 100) : 0
      }
    })
  }, [screenings])

  // Filtered Patient Screenings Feed
  const filteredScreenings = useMemo(() => {
    return screenings.filter(item => {
      // Search query (Name, ABHA, Phone, District, ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const name = (item.patient?.name || "").toLowerCase()
        const abha = (item.patient?.abhaId || "").toLowerCase()
        const phone = (item.patient?.phone || "").toLowerCase()
        const district = (item.patient?.district || "").toLowerCase()
        const id = (item.id || "").toLowerCase()
        if (!name.includes(q) && !abha.includes(q) && !phone.includes(q) && !district.includes(q) && !id.includes(q)) {
          return false
        }
      }

      // Risk filter
      if (filterRisk !== "ALL" && item.scores?.riskCategory !== filterRisk) {
        return false
      }

      // State filter
      if (filterState !== "ALL" && item.patient?.state !== filterState) {
        return false
      }

      // Status filter
      if (filterStatus !== "ALL") {
        if (filterStatus === "PENDING" && !item.status?.toLowerCase().includes("pending") && !item.status?.toLowerCase().includes("new")) {
          return false
        }
        if (filterStatus === "REFERRED" && !item.status?.toLowerCase().includes("referred")) {
          return false
        }
        if (filterStatus === "SCHEDULED" && !item.status?.toLowerCase().includes("scheduled") && !item.status?.toLowerCase().includes("follow-up")) {
          return false
        }
      }

      return true
    })
  }, [screenings, searchQuery, filterRisk, filterState, filterStatus])

  // Open modal and prepopulate notes & care plan
  const handleOpenInspection = (screening) => {
    setSelectedScreening(screening)
    setDoctorNotes(screening.notes || "")
    setSaveStatusMsg("")
    setModalTab("REVIEW")
    const existing = screening.carePlan || {}
    setCarePlanExercises(existing.exercises || [
      "Isometric Quadriceps Sets (10s hold, 3x daily)",
      "Seated Knee Extension (Non-weight bearing)"
    ])
    setCarePlanCustomExercise(existing.customExercise || "")
    setCarePlanLifestyle(existing.lifestyle || "Avoid deep squatting and sustained kneeling; prefer firm, chair-height seating.")
    setCarePlanFollowUpDate(existing.followUpDate || "")
    setCarePlanTargetPain(existing.targetPain || "Mild (VAS 1-3)")
    setCarePlanTargetMobility(existing.targetMobility || "Target 10+ STS Reps")
    setCarePlanPhysioReferral(existing.physioReferral !== undefined ? !!existing.physioReferral : screening.scores?.riskCategory === "HIGH")
    setCarePlanReassessment(existing.reassessmentSchedule || (screening.scores?.riskCategory === "HIGH" ? "30_DAYS" : "90_DAYS"))
  }

  // Update Status in Store
  const handleUpdateStatus = (newStatus) => {
    if (!selectedScreening) return
    updateScreeningStatus(selectedScreening.id, newStatus, doctorNotes)
    setSelectedScreening(prev => ({ ...prev, status: newStatus, notes: doctorNotes }))
    setSaveStatusMsg(`Status updated to: ${newStatus}`)
    refreshData()
    setTimeout(() => setSaveStatusMsg(""), 3000)
  }

  // Save Doctor Notes
  const handleSaveNotes = () => {
    if (!selectedScreening) return
    updateScreeningStatus(selectedScreening.id, selectedScreening.status, doctorNotes)
    setSelectedScreening(prev => ({ ...prev, notes: doctorNotes }))
    setSaveStatusMsg("Clinical notes saved successfully!")
    refreshData()
    setTimeout(() => setSaveStatusMsg(""), 3000)
  }

  // Toggle Exercise Checkbox in Care Plan
  const handleToggleExercise = (exerciseName) => {
    setCarePlanExercises(prev => 
      prev.includes(exerciseName) ? prev.filter(e => e !== exerciseName) : [...prev, exerciseName]
    )
  }

  // Save Doctor-Authored Care Plan (Part A)
  const handleSaveCarePlan = () => {
    if (!selectedScreening) return
    const plan = {
      exercises: carePlanExercises,
      customExercise: carePlanCustomExercise,
      lifestyle: carePlanLifestyle,
      followUpDate: carePlanFollowUpDate,
      targetPain: carePlanTargetPain,
      targetMobility: carePlanTargetMobility,
      physioReferral: carePlanPhysioReferral,
      reassessmentSchedule: carePlanReassessment,
      authoredBy: user.full_name || "Dr. Invictus Barman",
      authoredAt: new Date().toISOString()
    }
    updateCarePlan(selectedScreening.id, plan)
    const newStatus = carePlanFollowUpDate 
      ? `Care Plan Active (Follow-up: ${carePlanFollowUpDate})`
      : "Care Plan Active"
    updateScreeningStatus(selectedScreening.id, newStatus, doctorNotes)
    setSelectedScreening(prev => ({ ...prev, carePlan: plan, status: newStatus }))
    setSaveStatusMsg("Care Plan saved & activated! Status updated.")
    refreshData()
    setTimeout(() => setSaveStatusMsg(""), 3500)
  }

  // Simulate Live Citizen Test (Bonus Feature)
  const handleSimulateLiveTest = () => {
    setSimulating(true)
    const randomPatients = [
      { name: "Purnima Deka", age: 62, gender: "Female", state: "Assam", district: "Nalbari", joint: "Right Knee", occupation: "Silk Weaver", abha: "14-7721-3942-8812", phone: "+91 94350 44102", score: 68, risk: "HIGH", kl: 3, womac: 64, reps: 5, rom: 76, bursts: 6, freq: 215 },
      { name: "Lianthangpuia", age: 54, gender: "Male", state: "Mizoram", district: "Aizawl", joint: "Left Knee", occupation: "Terrace Farmer", abha: "14-2201-9481-5509", phone: "+91 98623 88124", score: 46, risk: "MODERATE", kl: 2, womac: 38, reps: 9, rom: 92, bursts: 3, freq: 140 },
      { name: "Irom Shanti Devi", age: 67, gender: "Female", state: "Manipur", district: "Bishnupur", joint: "Bilateral Knee", occupation: "Fisherfolk / Market Vendor", abha: "14-8841-3312-9904", phone: "+91 97740 66291", score: 82, risk: "HIGH", kl: 4, womac: 78, reps: 3, rom: 64, bursts: 9, freq: 310 },
      { name: "Wanphrang Lyngdoh", age: 49, gender: "Male", state: "Meghalaya", district: "East Khasi Hills", joint: "Right Knee", occupation: "Quarry Laborer", abha: "14-5519-7703-2281", phone: "+91 98630 11994", score: 32, risk: "LOW", kl: 1, womac: 24, reps: 13, rom: 110, bursts: 1, freq: 95 }
    ]

    const randomChoice = randomPatients[Math.floor(Math.random() * randomPatients.length)]
    const newId = "SCR-" + Math.floor(100000 + Math.random() * 900000)

    const simulatedScreening = {
      id: newId,
      timestamp: new Date().toISOString(),
      patient: {
        name: randomChoice.name,
        age: randomChoice.age,
        gender: randomChoice.gender,
        phone: randomChoice.phone,
        state: randomChoice.state,
        district: randomChoice.district,
        joint: randomChoice.joint,
        occupation: randomChoice.occupation,
        abhaId: randomChoice.abha
      },
      scores: {
        compositeScore: randomChoice.score,
        riskCategory: randomChoice.risk,
        klProxy: randomChoice.kl,
        womacScore: randomChoice.womac,
        sitToStandReps: randomChoice.reps,
        rom: randomChoice.rom,
        flexionAngle: 180 - randomChoice.rom,
        extensionAngle: 160,
        alignmentRatio: randomChoice.risk === "HIGH" ? 1.42 : 1.18,
        varusValgus: randomChoice.risk === "HIGH" ? "Varus" : "Normal",
        burstCount: randomChoice.bursts,
        peakFrequency: randomChoice.freq
      },
      clinicalAction: randomChoice.risk === "HIGH" 
        ? "Urgent Tertiary Orthopedic Referral (GMCH / RIMS)"
        : randomChoice.risk === "MODERATE" 
        ? "PHC Supervised Quadriceps Physical Therapy"
        : "Preventive Joint Health & Annual Review",
      status: "New (Auto-Synced)",
      notes: `Live simulation from ${randomChoice.state} center. 30s Chair Stand: ${randomChoice.reps} reps, Knee ROM: ${randomChoice.rom}°. Acoustic crepitus bursts: ${randomChoice.bursts}.`
    }

    setTimeout(() => {
      addScreening(simulatedScreening)
      setRecentSyncId(newId)
      setSimulating(false)
      refreshData()
      setTimeout(() => setRecentSyncId(null), 5000)
    }, 400)
  }

  // Export Registry as JSON/CSV
  const handleExportRegistry = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(screenings, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `sandhi_oa_registry_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-teal-500 selection:text-white pb-16">
      
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate("/")}
            title="Return to Portal Selection"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-black text-xl shadow-md ring-1 ring-teal-400/30">
              OA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight leading-none">
                  Doctor & MDoNER Admin Command Hub
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-[11px] text-teal-400 font-medium mt-1">
                Real-Time Knee OA Tele-Screening Surveillance &bull; 8 North Eastern States
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Controls */}
        <div className="flex items-center gap-2.5">
          
          {/* Simulate Live Citizen Test */}
          <button
            onClick={handleSimulateLiveTest}
            disabled={simulating}
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
            title="Simulate an incoming patient test from a remote PHC"
          >
            <Sparkles size={14} className={simulating ? "animate-spin" : ""} />
            <span>{simulating ? "Receiving Test..." : "+ Simulate Live Citizen Test"}</span>
          </button>

          {/* Export Registry */}
          <button
            onClick={handleExportRegistry}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition cursor-pointer"
            title="Download MDoNER clinical registry data"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          {/* Go to Patient Portal */}
          <button
            onClick={() => navigate("/registration")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 border border-teal-800/60 text-xs font-semibold transition cursor-pointer"
          >
            <Activity size={14} />
            <span>Take Patient Test</span>
          </button>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "D"}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-100 leading-none">
                  {user.full_name || "Dr. Invictus"}
                </p>
                <p className="text-[10px] text-teal-400 mt-0.5">
                  {user.center || user.state || "GMCH"}
                </p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 border-b border-slate-700/60">
                  <p className="font-bold text-sm text-slate-100">{user.full_name}</p>
                  <p className="text-xs text-teal-400 font-medium">{user.role}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Building2 size={13} className="text-teal-400" />
                    <span>{user.center || "GMCH Guwahati"}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <MapPin size={13} className="text-teal-400" />
                    <span>{user.state} &bull; MDoNER Jurisdiction</span>
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  <button 
                    onClick={() => { navigate("/"); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 hover:text-white rounded-xl transition cursor-pointer text-left"
                  >
                    <ArrowLeft size={14} className="text-slate-400" />
                    <span>Switch to Portal Gateway</span>
                  </button>
                  <button 
                    onClick={() => { navigate("/registration"); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 hover:text-white rounded-xl transition cursor-pointer text-left"
                  >
                    <PlusCircle size={14} className="text-teal-400" />
                    <span>New Screening Session</span>
                  </button>
                </div>

                <div className="p-1 border-t border-slate-700/60 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl transition cursor-pointer font-semibold"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        
        {/* Live Synchronization Notification Banner if new test arrived */}
        {recentSyncId && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-500/50 p-4 shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡ New Patient Screening Synchronized in Real-Time!</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 border border-emerald-700 text-emerald-300">
                    ID: {recentSyncId}
                  </span>
                </p>
                <p className="text-xs text-emerald-300 mt-0.5">
                  The incoming test biomarkers have been parsed and loaded into the clinical condition feed below.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const item = screenings.find(s => s.id === recentSyncId)
                if (item) handleOpenInspection(item)
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Inspect Now →
            </button>
          </div>
        )}

        {/* Key Metrics / KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition">
              <Users size={48} className="text-teal-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
              <Users size={14} className="text-teal-400" />
              Total Screened
            </p>
            <p className="text-3xl font-black text-white mt-2">
              {metrics.total}
            </p>
            <p className="text-[11px] text-teal-400 mt-1">
              Active Regional Registry
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-red-900/40 p-5 shadow-lg relative overflow-hidden group hover:border-red-600/50 transition">
            <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition">
              <AlertTriangle size={48} className="text-red-500" />
            </div>
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-1">
              <AlertTriangle size={14} className="text-red-500" />
              High Risk / GMCH
            </p>
            <p className="text-3xl font-black text-red-400 mt-2">
              {metrics.high}
            </p>
            <p className="text-[11px] text-red-400/80 mt-1">
              {metrics.total > 0 ? Math.round((metrics.high / metrics.total) * 100) : 0}% Requires Tertiary Staging
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-amber-900/40 p-5 shadow-lg relative overflow-hidden group hover:border-amber-600/50 transition">
            <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition">
              <Activity size={48} className="text-amber-500" />
            </div>
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
              <Activity size={14} className="text-amber-500" />
              Moderate OA
            </p>
            <p className="text-3xl font-black text-amber-400 mt-2">
              {metrics.moderate}
            </p>
            <p className="text-[11px] text-amber-400/80 mt-1">
              PHC Physiotherapy Cohort
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-emerald-900/40 p-5 shadow-lg relative overflow-hidden group hover:border-emerald-600/50 transition">
            <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Low Risk / Normal
            </p>
            <p className="text-3xl font-black text-emerald-400 mt-2">
              {metrics.low}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-1">
              Preventive & Routine
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition">
            <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition">
              <HeartPulse size={48} className="text-cyan-400" />
            </div>
            <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mb-1">
              <HeartPulse size={14} className="text-cyan-400" />
              Avg WOMAC Index
            </p>
            <p className="text-3xl font-black text-white mt-2">
              {metrics.avgWomac} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </p>
            <p className="text-[11px] text-cyan-400 mt-1">
              Joint Disability Score
            </p>
          </div>

        </div>

        {/* NORTH EAST REGIONAL SURVEILLANCE HEATMAP (PROACTIVE FEATURE) */}
        <div className="mb-8 rounded-3xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-teal-400" />
                <span>North Eastern Region (NER) 8-State Epidemiological Surveillance</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live screening distribution, high-risk OA prevalence, and linked referral centers under MDoNER
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              8 States Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {nerSurveillance.map(st => (
              <div 
                key={st.name} 
                onClick={() => setFilterState(filterState === st.name ? "ALL" : st.name)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                  filterState === st.name 
                    ? "bg-teal-950/80 border-teal-500 shadow-md ring-1 ring-teal-400"
                    : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <p className="text-xs font-bold text-slate-200 truncate">{st.name}</p>
                <p className="text-lg font-black text-white mt-1">{st.count}</p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className="text-[10px] font-semibold text-red-400">{st.highCount} High</span>
                  <span className="text-[9px] text-slate-500">({st.rate}%)</span>
                </div>
                <p className="text-[9px] text-teal-400/80 mt-1 truncate" title={st.hospital}>
                  {st.hospital.split(" ")[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* EVERY USER'S CONDITION: SEARCH, FILTER, AND LIVE ROSTER */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          
          {/* Header & Controls Bar */}
          <div className="p-6 border-b border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Every User&apos;s Screening & Clinical Condition
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-400 text-xs font-bold border border-teal-800">
                  {filteredScreenings.length} Patients
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time synchronized data stream. Click any patient to inspect full kinematic biomarkers and dispatch triage actions.
              </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ABHA, phone..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Risk Level Filter */}
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk (KL 3-4)</option>
                <option value="MODERATE">Moderate (KL 2)</option>
                <option value="LOW">Low Risk (KL 0-1)</option>
              </select>

              {/* State Filter */}
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All 8 NER States</option>
                <option value="Assam">Assam</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Tripura">Tripura</option>
                <option value="Sikkim">Sikkim</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={refreshData}
                title="Refresh Live Data"
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* TABLE OF EVERY USER'S CONDITION */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Patient Profile & ABHA</th>
                  <th className="py-3.5 px-4">Location & Joint</th>
                  <th className="py-3.5 px-4">Kinematics (ROM / STS)</th>
                  <th className="py-3.5 px-4">Acoustic Crepitus</th>
                  <th className="py-3.5 px-4">WOMAC Index</th>
                  <th className="py-3.5 px-4">Risk & KL Stage</th>
                  <th className="py-3.5 px-4">Triage Status</th>
                  <th className="py-3.5 px-4 text-right">Condition Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredScreenings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No patient screening records found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredScreenings.map((item) => {
                    const isRecent = item.id === recentSyncId
                    const risk = item.scores?.riskCategory || "MODERATE"
                    return (
                      <tr 
                        key={item.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isRecent ? "bg-teal-950/40 border-l-4 border-teal-400" : ""
                        }`}
                      >
                        {/* Patient Profile */}
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              risk === "HIGH" ? "bg-red-950 text-red-400 border border-red-800" :
                              risk === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                              "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            }`}>
                              {item.patient?.name ? item.patient.name.charAt(0) : "P"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-100 text-sm leading-tight flex items-center gap-1.5">
                                <span>{item.patient?.name || "Anonymous Patient"}</span>
                                {isRecent && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {item.patient?.age}y &bull; {item.patient?.gender} &bull; {item.patient?.occupation || "Citizen"}
                              </p>
                              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                ABHA: {item.patient?.abhaId || "14-xxxx-xxxx"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Location & Joint */}
                        <td className="py-4 px-4 text-slate-300">
                          <p className="font-semibold text-slate-200">{item.patient?.state || "Assam"}</p>
                          <p className="text-[11px] text-slate-400">{item.patient?.district || "Kamrup"}</p>
                          <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-teal-300 border border-slate-700">
                            {item.patient?.joint || "Right Knee"}
                          </span>
                        </td>

                        {/* Kinematics */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-slate-400 text-[10px]">Chair Stand:</span>
                              <span className="font-bold text-white">{item.scores?.sitToStandReps ?? 8} reps</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-slate-400 text-[10px]">Knee ROM:</span>
                              <span className="font-bold text-white">{item.scores?.rom ?? 86}&deg;</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Align: <span className="text-teal-300 font-semibold">{item.scores?.varusValgus || "Normal"}</span> ({item.scores?.alignmentRatio ?? 1.15})
                            </div>
                          </div>
                        </td>

                        {/* Acoustic Crepitus (VAG) */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-200">
                            {item.scores?.burstCount ?? 4} Bursts
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Peak: <span className="font-semibold text-teal-400">{item.scores?.peakFrequency ?? 142} Hz</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.scores?.burstCount >= 6 ? "High Acoustic Energy" : "Moderate Friction"}
                          </p>
                        </td>

                        {/* WOMAC Index */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">{item.scores?.womacScore ?? 45}</span>
                            <span className="text-[10px] text-slate-400">/ 100</span>
                          </div>
                          <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={`h-full rounded-full ${
                                item.scores?.womacScore >= 60 ? "bg-red-500" :
                                item.scores?.womacScore >= 35 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, item.scores?.womacScore || 45)}%` }}
                            ></div>
                          </div>
                        </td>

                        {/* Risk & KL Stage */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                              risk === "HIGH" ? "bg-red-950 text-red-400 border border-red-800" :
                              risk === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                              "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            }`}>
                              {risk} RISK
                            </span>
                            <p className="text-[10px] font-semibold text-slate-300">
                              KL Stage: Grade {item.scores?.klProxy ?? 2}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Score: {item.scores?.compositeScore ?? 50}/100
                            </p>
                          </div>
                        </td>

                        {/* Triage Status */}
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                            item.status?.toLowerCase().includes("referred") ? "bg-red-950/70 border-red-700 text-red-300" :
                            item.status?.toLowerCase().includes("scheduled") ? "bg-amber-950/70 border-amber-700 text-amber-300" :
                            item.status?.toLowerCase().includes("reviewed") ? "bg-emerald-950/70 border-emerald-700 text-emerald-300" :
                            "bg-slate-800 border-slate-700 text-teal-300"
                          }`}>
                            {item.status || "Pending Review"}
                          </span>
                        </td>

                        {/* Condition Action */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleOpenInspection(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white border border-slate-700 hover:border-teal-500 font-bold transition shadow-sm cursor-pointer text-[11px]"
                          >
                            <Eye size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </main>

      {/* DETAILED CLINICAL CONDITION INSPECTOR MODAL */}
      {selectedScreening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 text-slate-100 relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                  selectedScreening.scores?.riskCategory === "HIGH" ? "bg-red-950 text-red-400 border border-red-800" :
                  selectedScreening.scores?.riskCategory === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                  "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}>
                  <Stethoscope size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedScreening.patient?.name}
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
                      {selectedScreening.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedScreening.patient?.age} yrs &bull; {selectedScreening.patient?.gender} &bull; {selectedScreening.patient?.occupation} &bull; {selectedScreening.patient?.state} ({selectedScreening.patient?.district})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedScreening(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs (Part A) */}
            <div className="flex border-b border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setModalTab("REVIEW")}
                className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                  modalTab === "REVIEW"
                    ? "border-teal-400 text-teal-300 bg-slate-800/40"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity size={14} />
                <span>1. Patient Data & Diagnostic Review</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("CARE_PLAN")}
                className={`px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                  modalTab === "CARE_PLAN"
                    ? "border-teal-400 text-teal-300 bg-slate-800/40"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ClipboardList size={14} />
                <span>2. Doctor-Authored Care Plan</span>
                {selectedScreening.carePlan && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-900 border border-emerald-600 text-emerald-300 text-[9px] font-bold">
                    ACTIVE
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: DIAGNOSTIC DATA & TRIAGE REVIEW */}
            {modalTab === "REVIEW" && (
              <>
                {/* Diagnostic Alert Box */}
                <div className={`mt-6 p-4 rounded-2xl border flex items-start gap-3 ${
                  selectedScreening.scores?.riskCategory === "HIGH" ? "bg-red-950/50 border-red-800/80 text-red-200" :
                  selectedScreening.scores?.riskCategory === "MODERATE" ? "bg-amber-950/50 border-amber-800/80 text-amber-200" :
                  "bg-emerald-950/50 border-emerald-800/80 text-emerald-200"
                }`}>
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      Clinical Diagnosis: {selectedScreening.scores?.riskCategory} OA Risk &bull; Kellgren-Lawrence Stage {selectedScreening.scores?.klProxy}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {selectedScreening.clinicalAction || "Supervised physical therapy and orthopedic monitoring."}
                    </p>
                  </div>
                </div>

                {/* Biomarker Breakdown Grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Kinematics Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Kinematic Mobility</span>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chair Stand Reps:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.sitToStandReps ?? 8} reps / 30s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Knee ROM:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.rom ?? 86}&deg;</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Flexion Angle:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.flexionAngle ?? 94}&deg;</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Alignment:</span>
                        <span className="font-bold text-teal-300">{selectedScreening.scores?.varusValgus || "Normal"} ({selectedScreening.scores?.alignmentRatio ?? 1.15})</span>
                      </div>
                    </div>
                  </div>

                  {/* Acoustic Crepitus Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Acoustic Crepitus (VAG)</span>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Burst Count:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.burstCount ?? 4} bursts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peak Frequency:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.peakFrequency ?? 142} Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cartilage Friction:</span>
                        <span className="font-bold text-cyan-300">
                          {selectedScreening.scores?.burstCount >= 6 ? "Severe Wear" : "Mild to Moderate"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subjective WOMAC Card */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Symptom Severity</span>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">WOMAC Score:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.womacScore ?? 45} / 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Composite Score:</span>
                        <span className="font-bold text-white">{selectedScreening.scores?.compositeScore ?? 54} / 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Examined Joint:</span>
                        <span className="font-bold text-white">{selectedScreening.patient?.joint || "Right Knee"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Doctor Triage Controls */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Update Clinical Triage Status
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Urgent GMCH / RIMS Referral")}
                      className="px-3 py-2 rounded-xl bg-red-950 text-red-300 hover:bg-red-900 border border-red-700 text-xs font-bold transition cursor-pointer"
                    >
                      🏥 Tertiary GMCH/RIMS Referral
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("PHC Physiotherapy Scheduled")}
                      className="px-3 py-2 rounded-xl bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-700 text-xs font-bold transition cursor-pointer"
                    >
                      📅 Schedule PHC Follow-Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus("Reviewed & Cleared")}
                      className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold transition cursor-pointer"
                    >
                      ✅ Mark as Reviewed
                    </button>
                  </div>
                </div>

                {/* Doctor's Notes */}
                <div className="mt-6">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Attending Clinician &bull; Evaluation Notes
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Enter clinical observations, prescription advice, or referral notes..."
                    className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold">{saveStatusMsg}</span>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
                    >
                      Save Assessment Notes
                    </button>
                  </div>
                </div>

                {/* CTA to Care Plan Tab */}
                <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-teal-950/60 to-slate-950 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <ClipboardList size={14} />
                      <span>Ready to author clinician-approved care plan?</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Structure prescribed physiotherapy, lifestyle modifications, and set scheduled re-assessment date.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalTab("CARE_PLAN")}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-md"
                  >
                    Open Care Plan Form →
                  </button>
                </div>
              </>
            )}

            {/* TAB 2: DOCTOR-AUTHORED CARE PLAN & FOLLOW-UP (Part A) */}
            {modalTab === "CARE_PLAN" && (
              <div className="mt-6 space-y-6">
                {/* Clinical Autonomy Notice */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/40 text-xs">
                  <div className="flex items-center gap-2 text-teal-300 font-bold mb-1">
                    <ShieldCheck size={16} />
                    <span>Clinician-Authored Care Plan (MDoNER Health Protocol)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Treatment recommendations and follow-up schedules must be determined and approved by the attending healthcare professional. The AI does not auto-generate or prescribe medical interventions.
                  </p>
                </div>

                {/* Clinician-Approved Exercises / Physiotherapy */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5">
                  <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
                    1. Clinician-Approved Exercises &amp; Physiotherapy
                  </label>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Select approved joint-preserving exercises suited to patient's functional ROM and quadriceps capacity:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      "Isometric Quadriceps Sets (10s hold, 3x daily)",
                      "Seated Knee Extension (Non-weight bearing)",
                      "Straight Leg Raises (Supine, 3x10 reps)",
                      "Hamstring Stretch (Chair/wall assisted, 30s holds)",
                      "Heel Slides (Gentle active-assisted supine)",
                      "Low-Impact Aerobic Walking / Stationary Cycling"
                    ].map((ex) => {
                      const isChecked = carePlanExercises.includes(ex)
                      return (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => handleToggleExercise(ex)}
                          className={`text-left p-3 rounded-xl border text-xs transition flex items-start gap-2.5 cursor-pointer ${
                            isChecked
                              ? "bg-teal-950/60 border-teal-500 text-teal-200"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isChecked ? "bg-teal-500 text-slate-950" : "border border-slate-600"
                          }`}>
                            {isChecked ? "✓" : ""}
                          </span>
                          <span className="leading-tight">{ex}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom exercise input */}
                  <div className="mt-3">
                    <input
                      type="text"
                      value={carePlanCustomExercise}
                      onChange={(e) => setCarePlanCustomExercise(e.target.value)}
                      placeholder="Add custom clinician instructions or additional exercise..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Activity & Lifestyle Guidance */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5">
                  <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider mb-2">
                    2. Activity &amp; Lifestyle Guidance
                  </label>
                  <textarea
                    rows={2}
                    value={carePlanLifestyle}
                    onChange={(e) => setCarePlanLifestyle(e.target.value)}
                    placeholder="Enter activity modifications (e.g. avoid deep squatting, use chair seating, terrain unloading)..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500 transition"
                  />
                </div>

                {/* Follow-up Date & Reassessment Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar size={13} />
                      <span>3. Scheduled Follow-Up Date</span>
                    </label>
                    <input
                      type="date"
                      value={carePlanFollowUpDate}
                      onChange={(e) => setCarePlanFollowUpDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 transition cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Reaching this date directs patient to complete a new re-assessment session.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <label className="block text-xs font-bold text-teal-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>4. Reassessment Interval</span>
                    </label>
                    <select
                      value={carePlanReassessment}
                      onChange={(e) => setCarePlanReassessment(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 outline-none focus:border-teal-500 transition cursor-pointer"
                    >
                      <option value="30_DAYS">30 Days (High Risk / Post-Injection Review)</option>
                      <option value="60_DAYS">60 Days (Mid-Term Physiotherapy Check)</option>
                      <option value="90_DAYS">90 Days (Standard Quarterly Surveillance)</option>
                      <option value="6_MONTHS">6 Months (Moderate Joint Stability)</option>
                      <option value="1_YEAR">1 Year (Annual Routine Prevention)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Standard protocol recommended by State Nodal Orthopedic Directorate.
                    </p>
                  </div>
                </div>

                {/* Pain / Mobility Tracking Fields & Physiotherapy Referral Flag */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        5. Target Pain Level
                      </label>
                      <input
                        type="text"
                        value={carePlanTargetPain}
                        onChange={(e) => setCarePlanTargetPain(e.target.value)}
                        placeholder="e.g. Mild (VAS 1-3) or 30% reduction"
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        6. Target Mobility Metric
                      </label>
                      <input
                        type="text"
                        value={carePlanTargetMobility}
                        onChange={(e) => setCarePlanTargetMobility(e.target.value)}
                        placeholder="e.g. Target 10+ STS reps / ROM ≥95°"
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>

                  {/* Physiotherapy Referral Flag */}
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={carePlanPhysioReferral}
                      onChange={(e) => setCarePlanPhysioReferral(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-700 bg-slate-950 cursor-pointer"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        Physiotherapy Referral Flag
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Dispatch formal clinical order to nearest PHC / CHC Physical Therapy Unit.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Save and Activate Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Stethoscope size={14} className="text-teal-400" />
                    <span>Authoring Clinician: <b className="text-slate-200">{user.full_name || "Dr. Invictus Barman"}</b></span>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {saveStatusMsg && (
                      <span className="text-xs text-emerald-400 font-semibold">{saveStatusMsg}</span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveCarePlan}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={15} />
                      <span>Save &amp; Activate Care Plan</span>
                    </button>
                  </div>
                </div>

                {/* Active Care Plan Summary Card if already authored */}
                {selectedScreening.carePlan && (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 text-xs text-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>Active Care Plan on Record</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Authored: {new Date(selectedScreening.carePlan.authoredAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-300/90">
                      <b>Exercises:</b> {selectedScreening.carePlan.exercises?.join(", ") || "Standard regimen"}
                      {selectedScreening.carePlan.customExercise ? ` (${selectedScreening.carePlan.customExercise})` : ""}
                    </p>
                    <p className="text-[11px] text-emerald-300/90">
                      <b>Guidance:</b> {selectedScreening.carePlan.lifestyle || "None specified"}
                    </p>
                    <p className="text-[11px] text-emerald-300/90">
                      <b>Next Follow-Up:</b> {selectedScreening.carePlan.followUpDate || "Scheduled per protocol"} &bull; <b>Reassessment:</b> {selectedScreening.carePlan.reassessmentSchedule}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedScreening.patient?.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                >
                  <Phone size={14} className="text-teal-400" />
                  <span>Call Patient ({selectedScreening.patient?.phone || "N/A"})</span>
                </a>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Slip</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedScreening(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
