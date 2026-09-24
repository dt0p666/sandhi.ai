import { useNavigate } from "react-router-dom"
import { ClipboardList, Video, Cpu, Award, ArrowLeft, CheckCircle2 } from "lucide-react"
import { getCurrentScreeningSession } from "../utils/supabaseClient"

export default function ScreeningStepper({ currentStep = 1 }) {
  const navigate = useNavigate()
  const session = getCurrentScreeningSession()
  const patient = session?.patient

  const steps = [
    {
      num: 1,
      title: "Questionnaire",
      subtitle: "WOMAC Pain & Demographics",
      icon: ClipboardList,
      route: "/assessment",
      completed: !!session?.steps?.step1?.completed
    },
    {
      num: 2,
      title: "Computer Vision",
      subtitle: "OpenCV Posture & 30s Stand",
      icon: Video,
      route: "/movement",
      completed: !!session?.steps?.step2?.completed
    },
    {
      num: 3,
      title: "Hardware VAG",
      subtitle: "SandhiBand Crepitus Sensor",
      icon: Cpu,
      route: "/analysis",
      completed: !!session?.steps?.step3?.completed
    },
    {
      num: 4,
      title: "Final Results",
      subtitle: "Tri-Factor Multimodal Report",
      icon: Award,
      route: "/results",
      completed: !!session?.steps?.step4?.completed
    }
  ]

  return (
    <div className="w-full bg-slate-900/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-md">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Return to Hub & Patient badge */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => navigate("/screening")}
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Screening Hub</span>
          </button>

          {patient && (
            <div className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">{patient.name || "Patient"}</span>
              <span className="text-slate-400">({patient.gender || "Female"}, {patient.age || 50}y)</span>
            </div>
          )}
        </div>

        {/* Center: 4-Step Stepper Blocks */}
        <div className="grid grid-cols-4 gap-2 w-full md:w-auto md:flex items-center">
          {steps.map((s, idx) => {
            const Icon = s.icon
            const isActive = currentStep === s.num
            const isCompleted = s.completed

            return (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => navigate(s.route)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-800/90 border-teal-500 text-teal-300 shadow-md ring-1 ring-teal-500/30"
                      : isCompleted
                      ? "bg-slate-900 border-emerald-700/80 text-emerald-300 hover:bg-slate-800"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? "bg-teal-500 text-slate-950"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-850 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[11px] font-bold leading-none">{s.title}</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{s.subtitle}</p>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`hidden md:block w-3 h-0.5 mx-1 ${isCompleted ? "bg-emerald-500" : "bg-slate-800"}`}></div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
