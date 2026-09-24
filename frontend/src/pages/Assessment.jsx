import { useState, useEffect, useMemo } from "react"
import ScreeningStepper from "../components/ScreeningStepper"
import { getActiveUser, getCurrentScreeningSession, updateScreeningStep } from "../utils/supabaseClient" 
import { useNavigate } from "react-router-dom"
import { 
  ArrowLeft, 
  ArrowRight, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Footprints, 
  Flame, 
  HeartPulse, 
  ClipboardCheck,
  Check,
  UserCheck,
  ShieldCheck
} from "lucide-react"

// Exact WOMAC Subscales as specified in Sandhi AI spec
const PAIN_QUESTIONS = [
  { id: "p1", title: "Walking on flat ground", desc: "Pain experienced while walking on level terrain or corridors" },
  { id: "p2", title: "Going up or down stairs", desc: "Pain while ascending or descending stairs/slopes" },
  { id: "p3", title: "At night while in bed", desc: "Pain that disturbs sleep or occurs while resting in bed" },
  { id: "p4", title: "Sitting or lying down", desc: "Pain while sitting in a chair or resting in a reclined position" },
  { id: "p5", title: "Standing upright / bearing weight", desc: "Pain while standing still and bearing full body weight" }
]

const STIFFNESS_QUESTIONS = [
  { id: "s1", title: "Morning stiffness upon waking", desc: "Stiffness felt immediately after waking before moving around" },
  { id: "s2", title: "Stiffness after sitting or resting", desc: "Stiffness felt after sitting, resting, or lying down during the day" }
]

const FUNCTION_QUESTIONS = [
  { id: "f1", title: "Descending stairs", desc: "Difficulty walking down stairs or steep terrain" },
  { id: "f2", title: "Ascending stairs", desc: "Difficulty climbing upstairs or inclines" },
  { id: "f3", title: "Rising from sitting / chair", desc: "Difficulty getting up from a seated position" },
  { id: "f4", title: "Standing upright", desc: "Difficulty remaining standing for more than 10 minutes" },
  { id: "f5", title: "Bending to floor", desc: "Difficulty bending down to pick up an object from the floor" },
  { id: "f6", title: "Walking on flat ground", desc: "Difficulty walking across a room or street" },
  { id: "f7", title: "Getting in or out of vehicle", desc: "Difficulty entering or exiting a car, bus, or auto" },
  { id: "f8", title: "Going to market / shopping", desc: "Difficulty carrying groceries or walking through markets" },
  { id: "f9", title: "Putting on socks / footwear", desc: "Difficulty reaching feet to wear shoes, socks, or slippers" },
  { id: "f10", title: "Rising from bed", desc: "Difficulty getting out of bed in the morning" },
  { id: "f11", title: "Taking off footwear", desc: "Difficulty removing shoes or socks without assistance" },
  { id: "f12", title: "Lying in bed / turning over", desc: "Difficulty changing sleeping position or turning over" },
  { id: "f13", title: "Getting in/out of bath or washroom", desc: "Difficulty stepping into bathroom or squatting" },
  { id: "f14", title: "Sitting for long periods", desc: "Difficulty maintaining a seated posture" },
  { id: "f15", title: "Getting on/off toilet", desc: "Difficulty using western or Indian commodes" },
  { id: "f16", title: "Heavy domestic / field duties", desc: "Difficulty lifting water buckets, farming chores, tea garden tasks" },
  { id: "f17", title: "Light domestic duties", desc: "Difficulty cooking, sweeping, or light household tasks" }
]

const SEVERITY_LEVELS = [
  { value: 0, label: "None (0)", desc: "No difficulty/pain" },
  { value: 1, label: "Mild (1)", desc: "Slight discomfort" },
  { value: 2, label: "Moderate (2)", desc: "Noticeable limit" },
  { value: 3, label: "Severe (3)", desc: "High difficulty" },
  { value: 4, label: "Extreme (4)", desc: "Unable to perform" }
]

export default function Assessment() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("pain") // "pain" | "stiffness" | "function" | "risk"

  // WOMAC Answers State
  const [painAnswers, setPainAnswers] = useState({ p1: 2, p2: 3, p3: 1, p4: 1, p5: 2 })
  const [stiffnessAnswers, setStiffnessAnswers] = useState({ s1: 3, s2: 2 })
  const [functionAnswers, setFunctionAnswers] = useState(() => {
    const init = {}
    FUNCTION_QUESTIONS.forEach(q => { init[q.id] = 2 })
    return init
  })


  // Auto-load returning patient covariates from profile/session
  useEffect(() => {
    const user = getActiveUser()
    const session = getCurrentScreeningSession()
    const p = session?.patient || user
    if (p) {
      setPatientData(prev => ({
        ...prev,
        name: p.name || prev.name,
        age: p.age || prev.age,
        gender: p.gender || prev.gender,
        state: p.state || prev.state,
        district: p.district || prev.district,
        joint: p.joint || prev.joint
      }))
      if (p.height) setHeightCm(p.height)
      if (p.weight) setWeightKg(p.weight)
      if (p.occupation) setOccupationType(p.occupation.toLowerCase().includes("manual") || p.occupation.toLowerCase().includes("tea") ? "manual" : "sedentary")
      if (p.priorInjury) setPriorInjury(p.priorInjury.toLowerCase().includes("yes"))
      if (p.familyHistory) setFamilyHistory(p.familyHistory.toLowerCase().includes("yes"))
    }
  }, [])

  // Patient Demographics & Additional Risk Factors (Sandhi AI Spec Section 2)
  const [patientData, setPatientData] = useState(() => {
    try {
      const stored = localStorage.getItem("sandhi_patient")
      return stored ? JSON.parse(stored) : {
        name: "Bimla Karmakar",
        age: 58,
        gender: "Female",
        state: "Assam",
        district: "Kamrup",
        joint: "Right Knee"
      }
    } catch {
      return { name: "Bimla Karmakar", age: 58, gender: "Female", state: "Assam", district: "Kamrup", joint: "Right Knee" }
    }
  })

  const [heightCm, setHeightCm] = useState(158)
  const [weightKg, setWeightKg] = useState(64)
  const [occupationType, setOccupationType] = useState("manual") // "manual" | "sedentary"
  const [familyHistory, setFamilyHistory] = useState(false)
  const [priorInjury, setPriorInjury] = useState(false)

  // Auto-calculated BMI
  const bmi = useMemo(() => {
    const hMeter = Math.max(0.5, heightCm / 100)
    return Number((weightKg / (hMeter * hMeter)).toFixed(1))
  }, [heightCm, weightKg])

  // Exact WOMAC Scoring Formula from Spec
  const scoring = useMemo(() => {
    const pValues = Object.values(painAnswers)
    const sValues = Object.values(stiffnessAnswers)
    const fValues = Object.values(functionAnswers)

    const painSum = pValues.reduce((a, b) => a + Number(b || 0), 0)
    const stiffSum = sValues.reduce((a, b) => a + Number(b || 0), 0)
    const funcSum = fValues.reduce((a, b) => a + Number(b || 0), 0)

    const painScore = (painSum / (5 * 4)) * 20.0       // Weight 20
    const stiffnessScore = (stiffSum / (2 * 4)) * 8.0   // Weight 8
    const functionScore = (funcSum / (17 * 4)) * 68.0  // Weight 68
    const totalWomac = painScore + stiffnessScore + functionScore // Out of 96

    const normalizedScore = Math.min(100, Math.round((totalWomac / 96.0) * 100.0))

    return {
      painScore: Number(painScore.toFixed(1)),
      stiffnessScore: Number(stiffnessScore.toFixed(1)),
      functionScore: Number(functionScore.toFixed(1)),
      totalWomac: Number(totalWomac.toFixed(1)),
      normalizedScore
    }
  }, [painAnswers, stiffnessAnswers, functionAnswers])

  const handleSelectSeverity = (qId, val, section) => {
    if (section === "pain") {
      setPainAnswers(prev => ({ ...prev, [qId]: val }))
    } else if (section === "stiffness") {
      setStiffnessAnswers(prev => ({ ...prev, [qId]: val }))
    } else {
      setFunctionAnswers(prev => ({ ...prev, [qId]: val }))
    }
  }

  const handleContinueToMovement = () => {
    const assessmentPayload = {
      patient: patientData,
      womacScore: scoring.normalizedScore,
      subscale_breakdown: {
        pain: scoring.painScore,
        stiffness: scoring.stiffnessScore,
        function: scoring.functionScore,
        total_womac: scoring.totalWomac
      },
      raw_womac: {
        pain: Object.values(painAnswers),
        stiffness: Object.values(stiffnessAnswers),
        function: Object.values(functionAnswers)
      },
      risk_factors: {
        bmi,
        bmi_elevated: bmi >= 25.0,
        occupation_type: occupationType,
        occupation_flag: occupationType === "manual",
        family_history: familyHistory,
        prior_injury: priorInjury,
        height_cm: heightCm,
        weight_kg: weightKg
      }
    }

    updateScreeningStep(1, assessmentPayload, scoring.normalizedScore)
    localStorage.setItem("sandhi_womac", JSON.stringify(assessmentPayload))
    navigate("/movement", { state: { womacScore: scoring.normalizedScore, assessmentData: assessmentPayload } })
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-teal-500 selection:text-white pb-20">
      <ScreeningStepper currentStep={1} />
      
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/registration")}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                Module 1 of 4
              </span>
              <h1 className="text-lg font-black text-white">
                WOMAC Clinical Questionnaire
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Standardized OARSI / ACR Knee Osteoarthritis Symptom &amp; Disability Assessment
            </p>
          </div>
        </div>

        {/* Live Running WOMAC Score Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">WOMAC Disability Index</span>
            <span className="text-sm font-black text-teal-400 font-mono">
              {scoring.normalizedScore}/100 ({scoring.totalWomac} / 96 pts)
            </span>
          </div>
          <button
            onClick={handleContinueToMovement}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Continue to CV Video</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Subscale Progress Navigation Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
          <button
            onClick={() => setActiveTab("pain")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "pain" ? "bg-teal-600 text-white shadow-sm border border-teal-500" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>1. Pain Subscale</span>
            <span className="text-[10px] font-mono opacity-80">({scoring.painScore}/20)</span>
          </button>
          
          <button
            onClick={() => setActiveTab("stiffness")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "stiffness" ? "bg-amber-600 text-white shadow-sm border border-amber-500" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>2. Stiffness</span>
            <span className="text-[10px] font-mono opacity-80">({scoring.stiffnessScore}/8)</span>
          </button>

          <button
            onClick={() => setActiveTab("function")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "function" ? "bg-cyan-600 text-white shadow-sm border border-cyan-500" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>3. Physical Function</span>
            <span className="text-[10px] font-mono opacity-80">({scoring.functionScore}/68)</span>
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "risk" ? "bg-teal-600 text-white shadow-sm border border-teal-500" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>4. Risk Factors &amp; BMI</span>
            <span className="text-[10px] font-mono opacity-80">({bmi})</span>
          </button>
        </div>

        {/* ── TAB 1: PAIN SUBSCALE (5 QUESTIONS, EACH 0-4) ── */}
        {activeTab === "pain" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-teal-950/60 border border-teal-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-teal-300">WOMAC Pain Subscale (5 Items)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Rate the intensity of knee pain experienced over the last 48 hours.</p>
              </div>
              <span className="text-sm font-black text-teal-400 font-mono">{scoring.painScore} / 20.0 pts</span>
            </div>

            {PAIN_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">{q.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-7">{q.desc}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 ml-7">
                  {SEVERITY_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => handleSelectSeverity(q.id, lvl.value, "pain")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        painAnswers[q.id] === lvl.value
                          ? "bg-teal-600 text-white border-teal-500 shadow-sm ring-1 ring-teal-500"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-bold">{lvl.label}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setActiveTab("stiffness")}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Stiffness Subscale →</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 2: STIFFNESS SUBSCALE (2 QUESTIONS, EACH 0-4) ── */}
        {activeTab === "stiffness" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-amber-300">WOMAC Stiffness Subscale (2 Items)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Stiffness is a sensation of restriction or sluggishness in the ease with which you move your knee.</p>
              </div>
              <span className="text-sm font-black text-amber-400 font-mono">{scoring.stiffnessScore} / 8.0 pts</span>
            </div>

            {STIFFNESS_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">{q.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-7">{q.desc}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 ml-7">
                  {SEVERITY_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => handleSelectSeverity(q.id, lvl.value, "stiffness")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        stiffnessAnswers[q.id] === lvl.value
                          ? "bg-amber-600 text-white border-amber-500 shadow-sm ring-1 ring-amber-500"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <p className="text-xs font-bold">{lvl.label}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setActiveTab("pain")}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                ← Back to Pain
              </button>
              <button
                onClick={() => setActiveTab("function")}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Physical Function →</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 3: PHYSICAL FUNCTION SUBSCALE (17 QUESTIONS, EACH 0-4) ── */}
        {activeTab === "function" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-cyan-300">WOMAC Physical Function Subscale (17 Items)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Rate the degree of difficulty experienced while performing daily activities.</p>
              </div>
              <span className="text-sm font-black text-cyan-400 font-mono">{scoring.functionScore} / 68.0 pts</span>
            </div>

            {FUNCTION_QUESTIONS.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-xs border border-slate-700 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white">{q.title}</h3>
                      <p className="text-[11px] text-slate-400">{q.desc}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 ml-7">
                  {SEVERITY_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => handleSelectSeverity(q.id, lvl.value, "function")}
                      className={`py-2 px-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                        functionAnswers[q.id] === lvl.value
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-sm font-bold"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 text-xs"
                      }`}
                    >
                      <span className="text-xs font-bold block">{lvl.value}</span>
                      <span className="text-[9px] block truncate">{lvl.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setActiveTab("stiffness")}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                ← Back to Stiffness
              </button>
              <button
                onClick={() => setActiveTab("risk")}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Risk Factors &amp; BMI →</span>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 4: RISK FACTORS, DEMOGRAPHICS & BMI ── */}
        {activeTab === "risk" && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-md">
              <div>
                <h2 className="text-sm font-bold text-white">Patient Demographics &amp; Biomechanical Risk Covariates</h2>
                <p className="text-xs text-slate-400 mt-0.5">Used for age/sex normalization and composite risk evaluation.</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800">
                BMI: {bmi} kg/m² ({bmi >= 25 ? "Elevated" : "Normal"})
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-md">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value) || 150)}
                    min={100}
                    max={220}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value) || 50)}
                    min={30}
                    max={180}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Primary Occupation Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOccupationType("manual")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      occupationType === "manual" ? "bg-teal-950/80 border-teal-500 text-teal-300 shadow-md ring-1 ring-teal-500/30" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    <p className="text-xs font-bold">🌾 Heavy Manual / Field Labor</p>
                    <p className="text-[11px] mt-0.5 opacity-80">Tea garden plucking, mountain farming, carrying loads &gt;15kg</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOccupationType("sedentary")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      occupationType === "sedentary" ? "bg-teal-950/80 border-teal-500 text-teal-300 shadow-md ring-1 ring-teal-500/30" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    <p className="text-xs font-bold">🏢 Sedentary / Office Work</p>
                    <p className="text-[11px] mt-0.5 opacity-80">Desk worker, shopkeeper, student, light domestic duties</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={familyHistory}
                    onChange={(e) => setFamilyHistory(e.target.checked)}
                    className="w-4 h-4 text-teal-500 rounded border-slate-700 bg-slate-900 focus:ring-teal-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Family History of Arthritis</span>
                    <p className="text-[11px] text-slate-400">Parents or siblings with severe knee pain / surgery</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priorInjury}
                    onChange={(e) => setPriorInjury(e.target.checked)}
                    className="w-4 h-4 text-teal-500 rounded border-slate-700 bg-slate-900 focus:ring-teal-400"
                  />
                  <div>
                    <span className="text-xs font-bold text-white">Prior Knee Joint Injury</span>
                    <p className="text-[11px] text-slate-400">Meniscus tear, ligament sprain, or fracture</p>
                  </div>
                </label>
              </div>

            </div>

            {/* Final Scoring Summary Banner */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-teal-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Module 1 Score Output
                </span>
                <p className="text-2xl font-black text-white mt-0.5">
                  WOMAC Score: {scoring.normalizedScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Pain: <b className="text-teal-300">{scoring.painScore}/20</b> &bull; Stiffness: <b className="text-amber-300">{scoring.stiffnessScore}/8</b> &bull; Function: <b className="text-cyan-300">{scoring.functionScore}/68</b>
                </p>
              </div>

              <button
                onClick={handleContinueToMovement}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition shadow-[0_0_25px_rgba(20,184,166,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to 30s Video Test</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
