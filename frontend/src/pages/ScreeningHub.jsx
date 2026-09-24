import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ClipboardList,
  Video,
  Cpu,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  History,
  AlertCircle,
  RefreshCw,
  LogOut,
  Stethoscope,
  Activity,
  ChevronRight
} from "lucide-react"
import {
  getCurrentScreeningSession,
  resetScreeningSession,
  getActiveUser,
  logoutUser
} from "../utils/supabaseClient"
import { getAllScreenings } from "../utils/screeningsStore"

export default function ScreeningHub() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [pastScreenings, setPastScreenings] = useState([])

  useEffect(() => {
    const user = getActiveUser()
    setCurrentUser(user)
    const currentSess = getCurrentScreeningSession()
    setSession(currentSess)

    // Load past screenings for this user/patient
    const all = getAllScreenings()
    if (user) {
      const userTests = all.filter(s => 
        (s.patient?.name && user.name && s.patient.name.toLowerCase() === user.name.toLowerCase()) ||
        (s.patient?.phone && user.phone && s.patient.phone === user.phone) ||
        (s.patient?.id && user.id && s.patient.id === user.id)
      )
      setPastScreenings(userTests)
    } else {
      setPastScreenings(all.slice(0, 3))
    }
  }, [])

  const handleStartNew = () => {
    if (window.confirm("Start a new screening session? Previous profile data will be preserved.")) {
      const fresh = resetScreeningSession()
      setSession(fresh)
    }
  }

  const handleLogout = () => {
    logoutUser()
    navigate("/login")
  }

  const patient = session?.patient || currentUser || {}
  const steps = session?.steps || {}

  // Calculate completion percentage
  const completedCount = [
    steps.step1?.completed,
    steps.step2?.completed,
    steps.step3?.completed,
    steps.step4?.completed
  ].filter(Boolean).length
  const progressPercent = Math.round((completedCount / 4) * 100)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black shadow-md">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Sandhi-AI <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">Citizen Screening</span>
              </h1>
              <p className="text-xs text-slate-400">Tri-Factor Early Knee Osteoarthritis Diagnostic Pipeline</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
              title="Reset session and start over"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Fresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900/80 px-3 py-1.5 rounded-lg border border-rose-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-8">
        {/* Patient Profile Card */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400 text-xl font-bold shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-white">{patient.name || "Bimla Karmakar"}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 font-mono border border-teal-800">
                    ID: {patient.id || "PAT-948201"}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                    {pastScreenings.length > 0 ? `Screening #${pastScreenings.length + 1} (Follow-Up)` : "Screening #1 (Initial)"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span>Age: <strong className="text-slate-200">{patient.age || 58}y</strong></span>
                  <span>•</span>
                  <span>Gender: <strong className="text-slate-200">{patient.gender || "Female"}</strong></span>
                  <span>•</span>
                  <span>BMI: <strong className="text-slate-200">{patient.bmi || 24.5} kg/m²</strong> ({patient.height || 160}cm / {patient.weight || 62}kg)</span>
                  <span>•</span>
                  <span>Region: <strong className="text-teal-400">{patient.state || "Assam"}, {patient.district || "Kamrup"}</strong></span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Previous demographic &amp; joint covariates automatically loaded into this test session.</span>
                </p>
              </div>
            </div>

            {/* Overall Progress Widget */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 md:w-64 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-400">Diagnostic Progress</span>
                <span className="text-teal-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">
                {completedCount} of 4 Tri-Factor steps completed
              </p>
            </div>
          </div>
        </section>

        {/* 4 Interactive Step Blocks */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Tri-Factor Diagnostic Pipeline Steps</span>
            </h3>
            <span className="text-xs text-slate-400">Complete each block to unlock full multimodal fusion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Block 1: WOMAC Questionnaire */}
            <div
              onClick={() => navigate("/assessment")}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between group ${
                steps.step1?.completed
                  ? "bg-slate-900/90 border-emerald-500/70 hover:border-emerald-400 shadow-md"
                  : "bg-slate-900/90 border-slate-800 hover:border-teal-500 hover:shadow-lg"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      steps.step1?.completed ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-teal-950 text-teal-300 border border-teal-800"
                    }`}>
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 font-mono">Step 1 of 4</span>
                      <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition">Clinical WOMAC Questionnaire</h4>
                    </div>
                  </div>

                  {steps.step1?.completed ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Score: {steps.step1.score ?? 48}/100
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  WOMAC 3 subscales (5 Pain items, 2 Stiffness items, 17 Physical Function items) + occupation, prior injury &amp; family history.
                </p>

                {steps.step1?.completed && steps.step1?.data && (
                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span>Pain: <strong className="text-white">{steps.step1.data.painScore || 10}/20</strong></span>
                    <span>•</span>
                    <span>Stiffness: <strong className="text-white">{steps.step1.data.stiffnessScore || 4}/8</strong></span>
                    <span>•</span>
                    <span>Function: <strong className="text-white">{steps.step1.data.functionScore || 32}/68</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300 border-t border-slate-800 mt-4">
                <span>{steps.step1?.completed ? "Review / Edit Responses" : "Start Questionnaire (Step 1)"}</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Block 2: Computer Vision Video Posture */}
            <div
              onClick={() => navigate("/movement")}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between group ${
                steps.step2?.completed
                  ? "bg-slate-900/90 border-emerald-500/70 hover:border-emerald-400 shadow-md"
                  : "bg-slate-900/90 border-slate-800 hover:border-teal-500 hover:shadow-lg"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      steps.step2?.completed ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-teal-950 text-teal-300 border border-teal-800"
                    }`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 font-mono">Step 2 of 4</span>
                      <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition">OpenCV / CV Posture &amp; Stand Test</h4>
                    </div>
                  </div>

                  {steps.step2?.completed ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Score: {steps.step2.score ?? 55}/100
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time 30s chair-stand tracker with knee flexion/extension angle tracking, silhouette elevation meter, and coronal alignment.
                </p>

                {steps.step2?.completed && (
                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span>Reps: <strong className="text-white">{steps.step2.data?.reps || 7}</strong></span>
                    <span>•</span>
                    <span>ROM: <strong className="text-white">{steps.step2.data?.rom || 86}°</strong></span>
                    <span>•</span>
                    <span>Confidence: <strong className="text-white">{steps.step2.data?.confidence || "92%"}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300 border-t border-slate-800 mt-4">
                <span>{steps.step2?.completed ? "Retest Video Posture" : "Start CV Stand Test (Step 2)"}</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Block 3: Hardware VAG Diagnostic */}
            <div
              onClick={() => navigate("/analysis")}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between group ${
                steps.step3?.completed
                  ? "bg-slate-900/90 border-emerald-500/70 hover:border-emerald-400 shadow-md"
                  : "bg-slate-900/90 border-slate-800 hover:border-teal-500 hover:shadow-lg"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      steps.step3?.completed ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-teal-950 text-teal-300 border border-teal-800"
                    }`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 font-mono">Step 3 of 4</span>
                      <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition">SandhiBand Hardware Diagnostic</h4>
                    </div>
                  </div>

                  {steps.step3?.completed ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Score: {steps.step3.score ?? 58}/100
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Vibroarthrography (VAG) acoustic contact sensor waveforms (100Hz–1kHz), crepitus burst counting, and accelerometer vibration RMS.
                </p>

                {steps.step3?.completed && (
                  <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span>Bursts: <strong className="text-white">{steps.step3.data?.bursts || 4}</strong></span>
                    <span>•</span>
                    <span>Peak: <strong className="text-white">{steps.step3.data?.peakFreq || 142} Hz</strong></span>
                    <span>•</span>
                    <span>RMS: <strong className="text-white">{steps.step3.data?.rms || "0.42 m/s²"}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300 border-t border-slate-800 mt-4">
                <span>{steps.step3?.completed ? "Re-read Sensor Signal" : "Ingest Hardware Signals (Step 3)"}</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Block 4: Tri-Factor Fusion & Final Report */}
            <div
              onClick={() => navigate("/results")}
              className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between group ${
                steps.step4?.completed
                  ? "bg-slate-900/90 border-emerald-500/70 hover:border-emerald-400 shadow-md"
                  : "bg-slate-900/90 border-slate-800 hover:border-amber-500 hover:shadow-lg"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-bold text-white shadow-md">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-mono">Step 4 of 4</span>
                      <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">Tri-Factor Multimodal AI Fusion</h4>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-semibold flex items-center gap-1">
                    Final Dossier
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Dynamic weighted fusion (30% WOMAC + 35% CV + 35% Hardware), Kellgren-Lawrence grade staging proxy, localized dietary &amp; lifestyle guidance.
                </p>

                <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>Composite Risk: <strong className="text-amber-300 font-bold">Moderate OA (KL Grade 2)</strong></span>
                  <span className="text-emerald-400 font-medium">Syncs to MDoNER Hub</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300 border-t border-slate-800 mt-4">
                <span>View Full Medical Dossier &amp; Summary</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Previous Screening History (for repeat visits) */}
        {pastScreenings.length > 0 && (
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                <span>My Previous Screening History</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{pastScreenings.length} previous test(s) found</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-950 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Date / ID</th>
                    <th className="py-2.5 px-3">Joint</th>
                    <th className="py-2.5 px-3">WOMAC Score</th>
                    <th className="py-2.5 px-3">CV Reps</th>
                    <th className="py-2.5 px-3">Acoustic Crepitus</th>
                    <th className="py-2.5 px-3">Composite Risk</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {pastScreenings.map((sc, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-3 font-mono text-white">
                        <div>{new Date(sc.timestamp || Date.now()).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">{sc.id}</div>
                      </td>
                      <td className="py-3 px-3">{sc.patient?.joint || "Right Knee"}</td>
                      <td className="py-3 px-3 font-semibold">{sc.scores?.womacScore ?? 48}/100</td>
                      <td className="py-3 px-3">{sc.scores?.sitToStandReps ?? 7} reps ({sc.scores?.rom ?? 86}°)</td>
                      <td className="py-3 px-3">{sc.scores?.burstCount ?? 4} bursts ({sc.scores?.peakFrequency ?? 142} Hz)</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          sc.scores?.riskCategory === "HIGH"
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : sc.scores?.riskCategory === "MODERATE"
                            ? "bg-amber-950 text-amber-300 border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border-emerald-800"
                        }`}>
                          {sc.scores?.riskCategory || "MODERATE"} (KL-{sc.scores?.klProxy ?? 2})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => navigate("/results")}
                          className="text-teal-400 hover:text-teal-300 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Clinical Disclaimer Banner */}
        <div className="bg-amber-950/60 border border-amber-800 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200 shadow-md">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">Statutory Clinical Notice (MDoNER / ICMR Tele-Medicine Guidelines):</p>
            <p className="mt-0.5 text-amber-200">
              Sandhi-AI is an artificial intelligence-assisted triage and early knee osteoarthritis risk screening tool. It does not replace diagnostic clinical radiographs or formal consultation by an orthopedic surgeon.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
