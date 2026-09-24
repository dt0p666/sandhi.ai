import { useState, useEffect, useRef } from "react"
import { addScreening, updateScreeningStatus } from "../utils/screeningsStore"
import { useNavigate, useLocation } from "react-router-dom"
import Navbar from "../components/Navbar"
import ScreeningStepper from "../components/ScreeningStepper"
import { updateScreeningStep, getActiveUser } from "../utils/supabaseClient"

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()

  const stateData = location.state || {}
  
  // Read dynamic patient data
  const storedPatient = localStorage.getItem("sandhi_patient")
  let parsedPatient = null
  try {
    parsedPatient = storedPatient ? JSON.parse(storedPatient) : null
  } catch (e) {}

  const patient = stateData.patient || parsedPatient || {
    name: "Bimla Karmakar",
    age: 58,
    gender: "Female",
    state: "Assam",
    district: "Kamrup Metropolitan",
    joint: "Right Knee",
    abhaId: "14-5829-1029-4821"
  }

  // Read dynamic score and metrics
  const compositeScore = stateData.compositeScore ?? 54
  const riskCategory = stateData.riskCategory || (compositeScore >= 65 ? "HIGH" : compositeScore >= 35 ? "MODERATE" : "LOW")
  const klProxy = stateData.klProxy ?? (compositeScore >= 80 ? 4 : compositeScore >= 65 ? 3 : compositeScore >= 35 ? 2 : compositeScore >= 20 ? 1 : 0)
  const womacScore = stateData.womacScore ?? 42

  const movement = stateData.movementResults || {}
  const reps = movement.sitToStandReps ?? 8
  const rom = movement.rom ?? 86
  const varusValgus = movement.varusValgusAlignment || (movement.alignmentRatio > 1.3 ? "Varus" : movement.alignmentRatio < 0.8 ? "Valgus" : "Normal")
  const alignmentRatio = movement.alignmentRatio || 1.15

  const vag = stateData.vagData || {}
  const burstCount = vag.burstCount ?? (compositeScore >= 65 ? 7 : compositeScore >= 35 ? 4 : 1)
  const peakFrequency = vag.peakFrequency ?? (compositeScore >= 65 ? 245 : compositeScore >= 35 ? 142 : 85)
  const triFactor = stateData.triFactorBreakdown || {}

  const hasSyncedRef = useRef(false)
  const [synced, setSynced] = useState(false)
  const screeningIdRef = useRef(null) // tracks the ID of the record added to the store

  // Referral / care-plan follow-up state (Part A)
  const [referralConfirmed, setReferralConfirmed] = useState(() => {
    // Persist referral confirmation per ABHA across page refreshes
    try { return localStorage.getItem(`sandhi_referred_${patient.abhaId}`) === "true" } catch { return false }
  })

  // Role check: only doctors can access /dashboard
  const isDoctor = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("sandhi_user") || "null")
      return u?.role === "doctor"
    } catch { return false }
  })()

  useEffect(() => {
    if (hasSyncedRef.current) return
    hasSyncedRef.current = true

    const newRecord = {
      id: "SCR-" + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString(),
      patient: {
        name: patient.name || "Unknown Patient",
        age: Number(patient.age) || 55,
        gender: patient.gender || "Female",
        phone: patient.phone || "+91 98640 12000",
        state: patient.state || "Assam",
        district: patient.district || "Kamrup Metropolitan",
        joint: patient.joint || "Right Knee",
        occupation: patient.occupation || "Agricultural Worker",
        abhaId: patient.abhaId || "14-" + Math.floor(1000 + Math.random() * 9000) + "-2026-4821"
      },
      scores: {
        compositeScore,
        riskCategory,
        klProxy,
        womacScore,
        sitToStandReps: reps,
        rom,
        flexionAngle: movement.flexionAngle || (180 - rom),
        extensionAngle: movement.extensionAngle || 160,
        alignmentRatio,
        varusValgus,
        burstCount,
        peakFrequency
      },
      clinicalAction: riskCategory === "HIGH" 
        ? "GMCH Guwahati Tertiary Orthopedic Referral"
        : riskCategory === "MODERATE"
        ? "PHC Physiotherapy & Quadriceps Strengthening"
        : "Preventive Joint Health & Lifestyle Counseling",
      status: "New (Auto-Synced)",
      notes: "Auto-synced from citizen screening. Chair Stand: " + reps + " reps, Knee ROM: " + rom + " deg. Acoustic bursts: " + burstCount + "."
    }

    addScreening(newRecord)
    screeningIdRef.current = newRecord.id
    updateScreeningStep(4, { compositeScore, riskCategory, klProxy }, compositeScore)
    setSynced(true)
  }, [compositeScore, riskCategory, klProxy, womacScore, reps, rom, alignmentRatio, varusValgus, burstCount, peakFrequency, patient])

  const [downloading, setDownloading] = useState(false)

  const handleDownloadPDF = () => {
    setDownloading(true)
    setTimeout(() => {
      window.print()
      setDownloading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-teal-500 selection:text-white">
      <Navbar />
      <ScreeningStepper currentStep={4} />

      <main className="mx-auto max-w-4xl p-4 md:p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-bold px-3 py-1 text-xs uppercase tracking-wider">
            Screening Protocol Complete &bull; Multi-Modal AI Output
          </span>
          <h1 className="mt-2 text-3xl font-black text-white tracking-tight">
            Osteoarthritis Clinical Risk Evaluation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Patient-specific diagnostic synthesis generated for MDoNER PS 26004
          </p>
        </div>

        {/* Real-Time Telemetry Synchronization Notice */}
        <div className="mb-6 rounded-2xl bg-teal-950/60 border border-teal-800 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-teal-200">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>⚡ Automatically Synchronized with Doctor &amp; Admin Hub</span>
                <span className="text-[10px] bg-teal-900 px-2 py-0.5 rounded-full border border-teal-700 text-teal-300 font-mono font-semibold">LIVE SYNC</span>
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Screening biomarkers for <b>{patient.name}</b> (ABHA: {patient.abhaId || "14-xxxx"}) are now immediately viewable in the clinical command dashboard.
              </p>
            </div>
          </div>
          {isDoctor && (
            <button
              onClick={() => navigate("/dashboard")}
              className="shrink-0 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>Inspect in Doctor Hub →</span>
            </button>
          )}
        </div>

        {/* Patient Bar */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white">{patient.name}</p>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-medium border border-slate-700">
                {patient.age}y &bull; {patient.gender}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ABHA: <b className="font-mono text-teal-300">{patient.abhaId || "14-5829-1029-4821"}</b> &bull; {patient.joint || "Right Knee"} &bull; {patient.district}, {patient.state}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="rounded-xl border border-teal-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-teal-300 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>📄</span>
              <span>{downloading ? "Generating PDF..." : "Export Clinical PDF"}</span>
            </button>
          </div>
        </div>

        {/* Score Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 text-center shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Patient Multi-Modal Composite Risk Score
          </p>

          <p className={`mt-3 text-7xl font-black font-mono tracking-tight ${
            riskCategory === "HIGH" ? "text-rose-500" :
            riskCategory === "MODERATE" ? "text-amber-400" : "text-emerald-400"
          }`}>
            {compositeScore}
            <span className="text-2xl text-slate-500 font-normal"> / 100</span>
          </p>

          <div className="mt-3 flex justify-center">
            <span className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border ${
              riskCategory === "HIGH" ? "bg-rose-950 text-rose-300 border-rose-800" :
              riskCategory === "MODERATE" ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"
            }`}>
              {riskCategory} RISK &bull; KELLGREN-LAWRENCE GRADE {klProxy} PROXY
            </span>
          </div>

          {/* Color Gradient Track */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex border border-slate-700">
              <div className="h-full bg-emerald-500" style={{ width: "35%" }} />
              <div className="h-full bg-amber-400" style={{ width: "30%" }} />
              <div className="h-full bg-rose-500" style={{ width: "35%" }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
              <span>0 Low (Grade 0-1)</span>
              <span>35 Moderate (Grade 2)</span>
              <span>65 High (Grade 3-4)</span>
              <span>100</span>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-lg text-xs text-slate-400 leading-relaxed">
            Composite evaluation fuses MediaPipe 30s chair stand kinematics, SandhiBand™ VAG acoustic friction micro-bursts, clinical WOMAC index, and anatomical knee axis ratios.
          </p>
        </div>

        {/* Sandhi AI 3-Pillar Sub-Score Breakdown */}
        <div className="mt-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-white">
              Sandhi AI — Tri-Factor Multimodal Sub-Scores
            </h3>
            <span className="text-xs font-mono font-bold text-slate-400">
              Final = (0.30 × Q) + (0.35 × CV) + (0.35 × HW)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-teal-400 uppercase">1. Questionnaire (30%)</span>
                <span className="text-sm font-black text-white font-mono">{triFactor.questionnaire_score ?? womacScore}/100</span>
              </div>
              <p className="text-[11px] text-slate-400">WOMAC pain, stiffness &amp; physical function scale</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase">2. CV Kinematics (35%)</span>
                <span className="text-sm font-black text-white font-mono">{triFactor.cv_score ?? (reps < 8 ? 72 : 40)}/100</span>
              </div>
              <p className="text-[11px] text-slate-400">{reps} chair stands in 30s &bull; {rom}° ROM</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase">3. Hardware Sensor (35%)</span>
                <span className="text-sm font-black text-white font-mono">{triFactor.hardware_score ?? (burstCount >= 5 ? 65 : 35)}/100</span>
              </div>
              <p className="text-[11px] text-slate-400">{burstCount} VAG bursts &bull; {peakFrequency} Hz peak</p>
            </div>
          </div>
        </div>

        {/* Diagnostic Factor Breakdown */}
        <div className="mt-6 rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Diagnostic Biomarker Breakdown for {patient.name}
            </h3>
            <span className="text-xs font-bold text-teal-300 bg-teal-950 px-2.5 py-1 rounded-md border border-teal-800">
              Calibrated Values
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            
            {/* 1. Range of Motion */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 flex items-start gap-3">
              <span className="text-xl">📐</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">Knee Range of Motion (ROM)</p>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    rom < 75 ? "bg-rose-950 text-rose-300 border-rose-800" : rom < 100 ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"
                  }`}>
                    {rom}°
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {rom < 75 
                    ? `Severe functional ROM restriction (${rom}°). Flexion contracture and significant terminal extension lag.`
                    : rom < 100 
                    ? `Moderate functional flexion deficit (${rom}° ROM). Mild stiffness during deep flexion.`
                    : `Normal healthy joint flexibility (${rom}° ROM). Full extension and smooth flexion.`
                  }
                </p>
              </div>
            </div>

            {/* 2. SandhiBand VAG Crepitus */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 flex items-start gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">SandhiBand™ VAG Crepitus</p>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    burstCount >= 6 ? "bg-rose-950 text-rose-300 border-rose-800" : burstCount >= 3 ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"
                  }`}>
                    {burstCount} Bursts &bull; {peakFrequency} Hz
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {burstCount >= 6 
                    ? `Coarse high-frequency acoustic micro-bursts indicate significant articular cartilage erosion and bone-on-bone friction.`
                    : burstCount >= 3 
                    ? `Moderate vibration bursts captured during mid-flexion, indicative of early patellofemoral cartilage softening.`
                    : `Smooth acoustic profile with low-frequency waves, confirming adequate synovial fluid lubrication.`
                  }
                </p>
              </div>
            </div>

            {/* 3. 30-Second Chair Stand Repetitions */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 flex items-start gap-3">
              <span className="text-xl">🪑</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">30s Chair Stand Test (CST)</p>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    reps < 6 ? "bg-rose-950 text-rose-300 border-rose-800" : reps < 10 ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"
                  }`}>
                    {reps} Reps
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {reps < 6 
                    ? `Severely reduced lower extremity quadriceps power (${reps} reps). High functional fall risk.`
                    : reps < 10 
                    ? `Mild-to-moderate quadriceps weakness (${reps} reps). Extended recovery time per cycle.`
                    : `Optimal quadriceps endurance and balance (${reps} reps completed with stable cadence).`
                  }
                </p>
              </div>
            </div>

            {/* 4. Joint Alignment Ratio */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 flex items-start gap-3">
              <span className="text-xl">⚖️</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white">Knee Anatomical Alignment</p>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                    varusValgus !== "Normal" ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-emerald-950 text-emerald-300 border-emerald-800"
                  }`}>
                    {varusValgus} (Ratio: {alignmentRatio})
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {varusValgus === "Varus" 
                    ? `Bow-leg varus angulation (ratio ${alignmentRatio} > 1.3) multiplies compressive forces on medial joint compartment.`
                    : varusValgus === "Valgus" 
                    ? `Knock-knee valgus axis shifts mechanical stress towards the lateral patellofemoral facet.`
                    : `Neutral mechanical axis (ratio ${alignmentRatio}) protects against eccentric compartmental overloading.`
                  }
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ── PART A: CLINIC REFERRAL PANEL (HIGH / MODERATE risk only) ── */}
        {riskCategory !== "LOW" && (
          <div className={`mt-6 rounded-2xl p-6 shadow-md border ${
            riskCategory === "HIGH" 
              ? "border-rose-800 bg-rose-950/60" 
              : "border-amber-800 bg-amber-950/60"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  riskCategory === "HIGH" ? "bg-rose-900/80 text-rose-300 border-rose-700" : "bg-amber-900/80 text-amber-300 border-amber-700"
                }`}>
                  {riskCategory === "HIGH" ? "🚨 Priority Referral" : "🩺 Clinical Assessment Recommended"}
                </span>
                <h3 className={`mt-2 text-lg font-black ${riskCategory === "HIGH" ? "text-rose-200" : "text-amber-200"}`}>
                  Elevated OA Risk Markers Detected
                </h3>
                <p className={`text-xs mt-0.5 ${riskCategory === "HIGH" ? "text-rose-300" : "text-amber-300"}`}>
                  Clinical assessment recommended. A healthcare professional will review your results and guide the next steps.
                </p>
              </div>
              {referralConfirmed && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold">
                  ✅ Referral Confirmed
                </span>
              )}
            </div>

            {/* Nearest Facility Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {riskCategory === "HIGH" ? (
                <>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">🏥</span>
                    <div>
                      <p className="text-xs font-bold text-white">Tertiary Orthopedic Centre</p>
                      <p className="text-xs text-slate-300">GMCH Guwahati — Orthopedic OPD</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">📍 Bhangagarh, Guwahati, Assam</p>
                      <p className="text-[10px] text-slate-400">Radiographic K-L staging + specialist consultation</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">🏥</span>
                    <div>
                      <p className="text-xs font-bold text-white">Tertiary Orthopedic Centre</p>
                      <p className="text-xs text-slate-300">RIMS Imphal — Orthopedic Department</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">📍 Lamphelpat, Imphal, Manipur</p>
                      <p className="text-[10px] text-slate-400">Arthroscopy evaluation + viscosupplementation</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">📱</span>
                    <div>
                      <p className="text-xs font-bold text-white">Teleconsultation Available</p>
                      <p className="text-xs text-slate-300">eSanjeevani Orthopaedic Tele-OPD</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">Mon–Sat, 9 AM – 1 PM</p>
                      <p className="text-[10px] text-slate-400">Connect from your nearest civil hospital or health centre</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">🏥</span>
                    <div>
                      <p className="text-xs font-bold text-white">Nearest Civil Hospital</p>
                      <p className="text-xs text-slate-300">District-Level Government Hospital</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">📍 Ask ASHA worker for nearest civil hospital</p>
                      <p className="text-[10px] text-slate-400">Pain management + urgent upward referral letter</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">🏥</span>
                    <div>
                      <p className="text-xs font-bold text-white">Nearest Civil Hospital</p>
                      <p className="text-xs text-slate-300">Supervised quadriceps physiotherapy program</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">📍 Contact nearest civil hospital in your district</p>
                      <p className="text-[10px] text-slate-400">4× weekly supervised physiotherapy sessions</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-start gap-3 shadow-md">
                    <span className="text-xl shrink-0">📱</span>
                    <div>
                      <p className="text-xs font-bold text-white">Teleconsultation Available</p>
                      <p className="text-xs text-slate-300">eSanjeevani Physiotherapy Tele-OPD</p>
                      <p className="text-[11px] text-teal-400 font-semibold mt-1">Mon–Fri, 10 AM – 4 PM</p>
                      <p className="text-[10px] text-slate-400">Remote follow-up for rural patients who cannot travel</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Confirm Referral CTA */}
            {!referralConfirmed ? (
              <button
                onClick={() => {
                  setReferralConfirmed(true)
                  try { localStorage.setItem(`sandhi_referred_${patient.abhaId}`, "true") } catch {}
                  if (screeningIdRef.current) {
                    updateScreeningStatus(screeningIdRef.current, riskCategory === "HIGH" ? "Referred to Tertiary Centre" : "Referred to Civil Hospital", null)
                  }
                }}
                className={`mt-4 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md ${
                  riskCategory === "HIGH" ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
              >
                ✅ Confirm Referral &amp; Notify Doctor Hub
              </button>
            ) : (
              <p className="mt-4 text-xs text-emerald-400 font-semibold">
                ✅ Referral confirmed. Your results have been sent to the Doctor &amp; MDoNER Command Hub for review. The healthcare worker will create a care plan for you.
              </p>
            )}
          </div>
        )}

        {/* LOW RISK: Preventive Guidance */}
        {riskCategory === "LOW" && (
          <div className="mt-6 rounded-2xl p-6 shadow-md border border-emerald-800 bg-emerald-950/60">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-emerald-200">🌿 Community Health &amp; Prevention Guidance</h3>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Protocol: LOW Risk</span>
            </div>
            <ul className="mt-3.5 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2"><span className="font-bold text-emerald-400 text-sm">&bull;</span><span><b className="text-white">Preventive Joint Health:</b> Maintain regular low-impact aerobic walking and aquatic/cycling exercises.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-emerald-400 text-sm">&bull;</span><span><b className="text-white">Dietary &amp; Hydration Education:</b> Anti-inflammatory diet rich in calcium and vitamin D suited to North Eastern regional cuisine.</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-emerald-400 text-sm">&bull;</span><span><b className="text-white">Annual Health Check:</b> Schedule routine community screening in 12 months.</span></li>
            </ul>
            <button onClick={() => navigate("/screening")} className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow-md">
              📅 Schedule Annual Reassessment
            </button>
          </div>
        )}

        {/* ── PART A: FOLLOW-UP / RE-ASSESSMENT PANEL (all risk levels) ── */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">🔁 Follow-up &amp; Re-assessment</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {riskCategory === "HIGH"
                  ? "Your doctor will schedule a follow-up after reviewing your referral. When the date arrives, begin a new screening session to track your progress."
                  : riskCategory === "MODERATE"
                  ? "A 90-day re-assessment is recommended. Your healthcare worker will confirm the date once they create your care plan."
                  : "An annual re-assessment is recommended to confirm your joint health remains stable."}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Recommended Next Screening</p>
              <p className="text-sm font-black text-teal-400 font-mono">
                {riskCategory === "HIGH" ? "After Doctor Review" : riskCategory === "MODERATE" ? "90 Days" : "12 Months"}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                localStorage.removeItem("sandhi_patient")
                localStorage.removeItem("sandhi_womac")
                localStorage.removeItem("sandhi_movement")
                navigate("/registration")
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              🔁 Begin Re-assessment Now
            </button>
            <p className="text-[11px] text-slate-400 text-center sm:text-left">
              Starts a fresh screening session. Previous results remain visible in the Doctor Hub.
            </p>
          </div>
        </div>

        {/* MANDATORY GUARDRAIL: CLINICAL DISCLAIMER */}
        <div className="mt-6 rounded-2xl bg-amber-950/60 border border-amber-800 p-4 text-amber-200 flex items-start gap-3 shadow-md">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">Mandatory Clinical Screening Guardrail</p>
            <p className="text-xs text-amber-200 mt-1 leading-relaxed">
              Sandhi AI is an AI-assisted early risk screening tool, not a definitive medical diagnosis. If your risk is moderate or high, consult a qualified Orthopedic Specialist or Medical Officer for clinical examination and confirmatory radiographic imaging (X-ray).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => navigate("/screening")} className="rounded-xl bg-slate-800 border border-slate-700 px-5 py-2.5 text-xs font-bold text-teal-300 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm">
              ← Screening Hub
            </button>
            {isDoctor && (
              <button onClick={() => navigate("/dashboard")} className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer shadow-sm">
                Doctor Hub
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("sandhi_patient")
                localStorage.removeItem("sandhi_womac")
                localStorage.removeItem("sandhi_movement")
                navigate("/registration")
              }}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-6 py-3 text-xs font-bold text-white transition cursor-pointer shadow-md"
            >
              + Start Next Patient Screening
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
