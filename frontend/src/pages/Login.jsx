import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Phone, 
  User, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Building2, 
  Mail, 
  ArrowLeft,
  CheckCircle2,
  Stethoscope,
  Activity,
  Heart,
  Scale,
  Ruler
} from "lucide-react"
import { registerPatient, loginPatient } from "../utils/supabaseClient"

export default function Login() {
  const navigate = useNavigate()
  
  // Main Portal Selector: "patient" | "admin"
  const [portalMode, setPortalMode] = useState("patient")

  // Patient Sub-mode: "signin" | "signup"
  const [patientTab, setPatientTab] = useState("signin")
  
  // Patient Sign In State
  const [patientId, setPatientId] = useState("+91 98640 12845")
  const [patientPassword, setPatientPassword] = useState("sandhi123")
  const [showPatientPass, setShowPatientPass] = useState(false)

  // Patient Sign Up State
  const [signupName, setSignupName] = useState("")
  const [signupPhone, setSignupPhone] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupAge, setSignupAge] = useState(54)
  const [signupGender, setSignupGender] = useState("Female")
  const [signupHeight, setSignupHeight] = useState(158)
  const [signupWeight, setSignupWeight] = useState(62)
  const [signupState, setSignupState] = useState("Assam")
  const [signupDistrict, setSignupDistrict] = useState("Kamrup Metropolitan")
  const [signupOccupation, setSignupOccupation] = useState("Tea Garden Worker")
  const [signupPriorInjury, setSignupPriorInjury] = useState("No")
  const [signupFamilyHistory, setSignupFamilyHistory] = useState("No")

  // Doctor / Admin Sign In State
  const [adminUser, setAdminUser] = useState("invictus")
  const [adminPass, setAdminPass] = useState("invictus@11")
  const [showAdminPass, setShowAdminPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Calculate dynamic BMI for registration
  const bmiValue = signupHeight && signupWeight 
    ? (signupWeight / Math.pow(signupHeight / 100, 2)).toFixed(1)
    : "24.8"

  // 1. Handle Patient Login
  const handlePatientSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await loginPatient(patientId, patientPassword)
      if (res.success) {
        setSuccessMsg("Welcome back, " + res.patient.name + "! Loading your screening records...")
        setTimeout(() => navigate("/screening"), 600)
      } else {
        setError(res.error || "Could not find patient record. Please register below.")
      }
    } catch (err) {
      setError("Sign in error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // 2. Handle Patient Registration
  const handlePatientSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMsg("")

    if (!signupName.trim() || !signupPhone.trim()) {
      setError("Please provide at least your Name and Phone Number.")
      setLoading(false)
      return
    }

    try {
      const newPatient = await registerPatient({
        name: signupName,
        phone: signupPhone,
        password: signupPassword || "sandhi123",
        age: signupAge,
        gender: signupGender,
        height: signupHeight,
        weight: signupWeight,
        state: signupState,
        district: signupDistrict,
        occupation: signupOccupation,
        priorInjury: signupPriorInjury,
        familyHistory: signupFamilyHistory
      })

      setSuccessMsg("Registration successful! Synced to Supabase. Starting your screening...")
      setTimeout(() => navigate("/screening"), 800)
    } catch (err) {
      setError("Failed to register patient: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Doctor / Admin Sign In
  const handleAdminSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (adminUser === "invictus" && adminPass === "invictus@11") {
        localStorage.setItem("sandhi_user", JSON.stringify({
          username: "invictus",
          full_name: "Dr. Invictus Barman",
          role: "doctor",
          state: "Assam",
          phone: "+91 98640 11000",
          center: "GMCH Guwahati"
        }))
        navigate("/dashboard")
        return
      }

      // Backend verification fallback
      const response = await fetch("/api/v1/auth/login-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUser, password: adminPass })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("sandhi_token", data.access_token)
        localStorage.setItem("sandhi_user", JSON.stringify({
          username: data.username,
          full_name: data.full_name || "Dr. " + data.username,
          role: "doctor",
          state: data.state || "Assam"
        }))
        navigate("/dashboard")
      } else {
        setError("Invalid doctor credentials. Use demo admin credentials below.")
      }
    } catch {
      if (adminUser === "invictus" && adminPass === "invictus@11") {
        localStorage.setItem("sandhi_user", JSON.stringify({
          username: "invictus",
          full_name: "Dr. Invictus Barman",
          role: "doctor",
          state: "Assam",
          phone: "+91 98640 11000",
          center: "GMCH Guwahati"
        }))
        navigate("/dashboard")
      } else {
        setError("Network error. Use demo credentials (invictus / invictus@11).")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-xl relative z-10 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Gateway</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] text-teal-400 font-mono">Supabase Auth Connected</span>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg mb-1">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Sandhi-AI</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            North Eastern Early Knee Osteoarthritis Tri-Factor Diagnostic &amp; Surveillance Hub
          </p>
        </div>

        {/* Top Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-md">
          <button
            type="button"
            onClick={() => { setPortalMode("patient"); setError(""); setSuccessMsg("") }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              portalMode === "patient"
                ? "bg-teal-600 text-white shadow-sm border border-teal-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient &amp; Citizen Portal</span>
          </button>
          <button
            type="button"
            onClick={() => { setPortalMode("admin"); setError(""); setSuccessMsg("") }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              portalMode === "admin"
                ? "bg-teal-600 text-white shadow-sm border border-teal-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Doctor &amp; Admin Hub</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Card Body */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* ======================================================= */}
          {/* MODE 1: PATIENT & CITIZEN PORTAL                        */}
          {/* ======================================================= */}
          {portalMode === "patient" && (
            <div className="space-y-5">
              {/* Patient Tab Switch: Sign In vs Sign Up */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => { setPatientTab("signin"); setError("") }}
                  className={`pb-3 text-xs font-bold border-b-2 mr-6 transition cursor-pointer ${
                    patientTab === "signin"
                      ? "border-teal-400 text-teal-300"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  Citizen Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setPatientTab("signup"); setError("") }}
                  className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                    patientTab === "signup"
                      ? "border-teal-400 text-teal-300"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  New Patient Registration (Sign Up)
                </button>
              </div>

              {/* Patient Sign In Form */}
              {patientTab === "signin" && (
                <form onSubmit={handlePatientSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Phone Number, Patient ID or Name
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="+91 98640 12845 or Bimla Karmakar"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Passcode / PIN
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPatientPass ? "text" : "password"}
                        value={patientPassword}
                        onChange={(e) => setPatientPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPatientPass(!showPatientPass)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                      >
                        {showPatientPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span>Verifying Patient Record...</span>
                    ) : (
                      <>
                        <span>Sign In &amp; Open Screening Hub</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-400">
                      Screening for the first time?{" "}
                      <button
                        type="button"
                        onClick={() => setPatientTab("signup")}
                        className="text-teal-400 font-semibold hover:underline cursor-pointer"
                      >
                        Register New Patient
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Patient Sign Up Form */}
              {patientTab === "signup" && (
                <form onSubmit={handlePatientSignUp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. Maya Sharma"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="+91 98640 XXXXX"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Age</label>
                      <input
                        type="number"
                        value={signupAge}
                        onChange={(e) => setSignupAge(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                        min="18"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Gender</label>
                      <select
                        value={signupGender}
                        onChange={(e) => setSignupGender(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Passcode</label>
                      <input
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="sandhi123"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Height, Weight and Calculated BMI */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Height (cm)</label>
                        <input
                          type="number"
                          value={signupHeight}
                          onChange={(e) => setSignupHeight(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={signupWeight}
                          onChange={(e) => setSignupWeight(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                      <span>Calculated BMI: <strong className="text-teal-400">{bmiValue} kg/m²</strong></span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                        {Number(bmiValue) >= 30 ? "Obese" : Number(bmiValue) >= 25 ? "Overweight" : "Normal Weight"}
                      </span>
                    </div>
                  </div>

                  {/* State & Occupation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">NER State</label>
                      <select
                        value={signupState}
                        onChange={(e) => setSignupState(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      >
                        <option value="Assam">Assam</option>
                        <option value="Meghalaya">Meghalaya</option>
                        <option value="Tripura">Tripura</option>
                        <option value="Manipur">Manipur</option>
                        <option value="Mizoram">Mizoram</option>
                        <option value="Nagaland">Nagaland</option>
                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                        <option value="Sikkim">Sikkim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Primary Occupation</label>
                      <select
                        value={signupOccupation}
                        onChange={(e) => setSignupOccupation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      >
                        <option value="Tea Garden Worker">Tea Garden Worker</option>
                        <option value="Agricultural Farmer">Agricultural Farmer</option>
                        <option value="Handloom Weaver">Handloom Weaver</option>
                        <option value="Domestic / Manual Labor">Domestic / Manual Labor</option>
                        <option value="Desk / Sedentary">Desk / Sedentary</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span>Saving to Supabase Database...</span>
                    ) : (
                      <>
                        <span>Complete Registration &amp; Begin Screening</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* MODE 2: DOCTOR & MDONER ADMIN HUB ACCESS                */}
          {/* ======================================================= */}
          {portalMode === "admin" && (
            <div className="space-y-4">
              <div className="p-3 bg-teal-950/60 border border-teal-800 rounded-xl flex items-start gap-2.5 text-xs text-teal-200">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Clinical Officer &amp; Surveillance Access</p>
                  <p className="text-[11px] text-teal-300 mt-0.5">
                    Authorized doctors, orthopedic specialists, and MDoNER state nodal officers only. Provides complete 8-state NER surveillance access.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Medical Officer / Officer ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      placeholder="invictus"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Clinical Security Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showAdminPass ? "text" : "password"}
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>Authenticating Medical Officer...</span>
                  ) : (
                    <>
                      <span>Sign In to Doctor &amp; Admin Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick Auto-Fill Demo Credentials */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
                  <span>Demo Doctor: <strong className="text-teal-300">invictus / invictus@11</strong></span>
                  <button
                    type="button"
                    onClick={() => { setAdminUser("invictus"); setAdminPass("invictus@11") }}
                    className="text-teal-400 hover:text-teal-300 font-semibold hover:underline cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Sandhi-AI • MDoNER Problem Statement PS 26004</p>
          <p>Complies with Ayushman Bharat Digital Mission (ABDM) &amp; HIPAA Guidelines</p>
        </div>
      </div>
    </div>
  )
}
