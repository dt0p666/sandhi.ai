import { useState, useEffect, useRef, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import ScreeningStepper from "../components/ScreeningStepper"
import { updateScreeningStep } from "../utils/supabaseClient"
import { speakText, VOICE_PROMPTS } from "../utils/speech"
import { 
  Activity, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  FileText, 
  Layers, 
  Radio, 
  Sparkles, 
  Volume2, 
  VolumeX,
  Stethoscope,
  ShieldAlert
} from "lucide-react"

export default function Analysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const waveformCanvasRef = useRef(null)
  const animRef = useRef(null)

  // Retrieve passed patient and prior module states
  const storedPatient = localStorage.getItem("sandhi_patient")
  const patient = location.state?.patient || (storedPatient ? JSON.parse(storedPatient) : {
    name: "Bimla Karmakar",
    age: 58,
    gender: "Female",
    state: "Assam",
    district: "Kamrup",
    joint: "Right Knee",
    abhaId: "14-5829-1029-4821"
  })

  // Module 1: Questionnaire Data (WOMAC)
  const storedWomac = localStorage.getItem("sandhi_womac")
  const womacPayload = location.state?.assessmentData || (storedWomac ? JSON.parse(storedWomac) : null)
  const qScore = Number(location.state?.womacScore ?? (womacPayload?.womacScore ?? 45))
  const womacBreakdown = womacPayload?.subscale_breakdown || { pain: 10, stiffness: 4, function: 28, total_womac: 42 }
  const riskFactors = womacPayload?.risk_factors || { bmi: 25.4, occupation_flag: true, family_history: false, prior_injury: false }

  // Module 2: Computer Vision Video Kinematics Data
  const storedMovement = localStorage.getItem("sandhi_movement")
  const cvMovement = location.state?.movementResults || (storedMovement ? JSON.parse(storedMovement) : {})
  const sitToStandReps = Number(cvMovement?.sitToStandReps ?? 8)
  const romVal = Number(cvMovement?.rom ?? 85)
  const minFlexion = Number(cvMovement?.flexionAngle ?? 95)
  const maxExtension = Number(cvMovement?.extensionAngle ?? 162)
  const varusValgus = cvMovement?.varusValgusAlignment || "Normal"
  const alignmentRatio = Number(cvMovement?.alignmentRatio ?? 1.15)
  const cvConfidence = Number(cvMovement?.cv_confidence ?? 0.88)

  // Compute Module 2 CV Score (0 - 100) based on Spec
  const cvScore = useMemo(() => {
    const repsDeficit = Math.max(0, Math.min(1, (14.0 - sitToStandReps) / 10.0)) * 40.0
    const romDeficit = Math.max(0, Math.min(1, (115.0 - romVal) / 45.0)) * 35.0
    const alignPenalty = varusValgus === "Varus" ? 25.0 : varusValgus === "Valgus" ? 15.0 : 0.0
    return Math.min(100, Math.round(repsDeficit + romDeficit + alignPenalty))
  }, [sitToStandReps, romVal, varusValgus])

  // Module 3: Hardware Sensor State (SandhiBand VAG & IMU)
  const initialBursts = romVal < 70 || qScore > 60 ? 6 : romVal > 105 && qScore < 30 ? 1 : 4
  const initialFreq = romVal < 70 || qScore > 60 ? 220 : romVal > 105 && qScore < 30 ? 95 : 148

  const [burstCount, setBurstCount] = useState(initialBursts)
  const [peakFrequency, setPeakFrequency] = useState(initialFreq) // Hz
  const [rmsEnergy, setRmsEnergy] = useState(0.42)
  const [sensorPreset, setSensorPreset] = useState(initialBursts >= 6 ? "severe" : initialBursts <= 1 ? "smooth" : "moderate")
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // Compute Module 3 Hardware Score (0 - 100) based on Spec
  const hwScore = useMemo(() => {
    const burstScore = Math.min(50.0, (burstCount / 8.0) * 50.0)
    const freqScore = Math.max(0.0, Math.min(35.0, ((peakFrequency - 100.0) / 150.0) * 35.0))
    const rmsScore = Math.min(15.0, (rmsEnergy / 0.80) * 15.0)
    return Math.min(100, Math.round(burstScore + freqScore + rmsScore))
  }, [burstCount, peakFrequency, rmsEnergy])

  // Module 4: Tri-Factor Fusion Engine (Exact Sandhi AI Spec)
  const fusionResult = useMemo(() => {
    let w_q = 0.30
    let w_cv = 0.35
    let w_hw = 0.35

    // Confidence adjustment guardrail
    if (cvConfidence < 0.6) {
      const deficit = w_cv * (1.0 - cvConfidence)
      w_cv -= deficit
      w_q += deficit / 2.0
      w_hw += deficit / 2.0
    }

    const final = Math.min(100, Math.max(0, Math.round(w_q * qScore + w_cv * cvScore + w_hw * hwScore)))

    let category = "low"
    let kl = 0
    if (final < 33) {
      category = "low"
      kl = final < 18 ? 0 : 1
    } else if (final < 66) {
      category = "moderate"
      kl = 2
    } else {
      category = "high"
      kl = final >= 82 ? 4 : 3
    }

    const explanations = []
    if (qScore >= 50) {
      explanations.push(`Elevated joint pain & stiffness reported in clinical questionnaire (${Math.round(qScore)}/100).`)
    }
    if (cvScore >= 50) {
      explanations.push(`Reduced knee flexion arc and functional chair-stand power captured on video (${Math.round(cvScore)}/100).`)
    }
    if (hwScore >= 45) {
      explanations.push(`Acoustic vibroarthrographic crepitus spikes detected by contact sensor (${Math.round(hwScore)}/100).`)
    }
    if (explanations.length === 0) {
      explanations.push("All 3 clinical diagnostic streams are within normal, healthy parameters.")
    }

    return {
      finalScore: final,
      riskCategory: category.toUpperCase(),
      klGrade: kl,
      weights: { w_q: Number(w_q.toFixed(2)), w_cv: Number(w_cv.toFixed(2)), w_hw: Number(w_hw.toFixed(2)) },
      explanations
    }
  }, [qScore, cvScore, hwScore, cvConfidence])

  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem("sandhi_lang") || "en")

  useEffect(() => {
    const onLangChange = (e) => {
      if (e.detail) {
        setSelectedLang(e.detail)
        const prompt = VOICE_PROMPTS[e.detail] || VOICE_PROMPTS.en
        speakText(prompt.crepitusNotice, e.detail)
      }
    }
    window.addEventListener("sandhi_language_changed", onLangChange)
    return () => window.removeEventListener("sandhi_language_changed", onLangChange)
  }, [])

  // SandhiBand Real-time Oscilloscope Waveform Canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let phase = 0
    let animId = null

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      const midY = height / 2

      ctx.fillStyle = "#090d16"
      ctx.fillRect(0, 0, width, height)

      // Oscilloscope grid lines
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw VAG Baseline + Crepitus Spikes
      ctx.beginPath()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = "#2dd4bf"

      phase += 0.08
      for (let x = 0; x < width; x++) {
        const normX = x / width
        let y = Math.sin(x * 0.05 + phase) * 8 + (Math.random() - 0.5) * 4

        // Crepitus spikes based on burstCount
        const spikeIntervals = [0.20, 0.42, 0.65, 0.85].slice(0, Math.min(4, burstCount))
        spikeIntervals.forEach((spikeX) => {
          const dist = Math.abs(normX - spikeX)
          if (dist < 0.04) {
            const spikeAmp = Math.cos((dist / 0.04) * (Math.PI / 2)) * 55
            const jitter = Math.sin(x * 0.8 + phase * 3) * 12
            y += spikeAmp + jitter
          }
        })

        if (x === 0) {
          ctx.moveTo(x, midY + y)
        } else {
          ctx.lineTo(x, midY + y)
        }
      }
      ctx.stroke()

      // Marker dots for crepitus bursts
      const spikeXPositions = [width * 0.20, width * 0.42, width * 0.65, width * 0.85].slice(0, Math.min(4, burstCount))
      spikeXPositions.forEach((sx, idx) => {
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(sx, midY - 45, 5, 0, 2 * Math.PI)
        ctx.fill()

        ctx.fillStyle = "#fca5a5"
        ctx.font = "bold 9px Inter, sans-serif"
        ctx.fillText(`BURST #${idx + 1}`, sx - 22, midY - 55)
      })

      animId = requestAnimationFrame(render)
    }

    render()
    return () => { if (animId) cancelAnimationFrame(animId) }
  }, [burstCount])

  // Play auditory crepitus feedback
  const playCrepitusSound = () => {
    try {
      setIsPlayingAudio(true)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioCtx.currentTime
      for (let i = 0; i < Math.min(burstCount, 6); i++) {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = "sawtooth"
        osc.frequency.setValueAtTime(peakFrequency + (i * 25), now + (i * 0.22))
        gain.gain.setValueAtTime(0.08, now + (i * 0.22))
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.22) + 0.12)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start(now + (i * 0.22))
        osc.stop(now + (i * 0.22) + 0.15)
      }
      setTimeout(() => setIsPlayingAudio(false), burstCount * 220 + 200)
    } catch {
      setIsPlayingAudio(false)
    }
  }

  const handleApplyPreset = (preset) => {
    setSensorPreset(preset)
    if (preset === "severe") {
      setBurstCount(7)
      setPeakFrequency(245)
      setRmsEnergy(0.68)
    } else if (preset === "moderate") {
      setBurstCount(4)
      setPeakFrequency(148)
      setRmsEnergy(0.38)
    } else {
      setBurstCount(1)
      setPeakFrequency(88)
      setRmsEnergy(0.15)
    }
  }

  const handleProceedToResults = () => {
    const fusedPayload = {
      patient,
      compositeScore: fusionResult.finalScore,
      riskCategory: fusionResult.riskCategory,
      klProxy: fusionResult.klGrade,
      womacScore: qScore,
      movementResults: {
        ...cvMovement,
        sitToStandReps,
        rom: romVal,
        varusValgusAlignment: varusValgus,
        alignmentRatio
      },
      vagData: {
        burstCount,
        peakFrequency,
        rmsEnergy,
        crepitusDetected: burstCount >= 3
      },
      triFactorBreakdown: {
        questionnaire_score: qScore,
        cv_score: cvScore,
        hardware_score: hwScore,
        weights: fusionResult.weights,
        explanations: fusionResult.explanations
      }
    }

    try {
      updateScreeningStep(3, { bursts: burstCount, peakFreq: peakFrequency, rms: rmsEnergy }, Math.round(hwScore))
    } catch (e) {}
    localStorage.setItem("sandhi_fused_result", JSON.stringify(fusedPayload))
    navigate("/results", { state: fusedPayload })
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-teal-500 selection:text-white pb-16">
      <Navbar />
      <ScreeningStepper currentStep={3} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                Module 3 &amp; 4: Hardware &amp; Fusion
              </span>
              <span className="text-xs font-bold text-slate-400">
                Patient: {patient.name} ({patient.gender}, {patient.age}y)
              </span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-black text-white">
              Tri-Factor Multimodal Fusion Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Synthesizing Questionnaire (30%) + CV Kinematics (35%) + Hardware Vibroarthrography (35%)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border ${
              fusionResult.riskCategory === "HIGH" ? "bg-rose-950 text-rose-300 border-rose-800" :
              fusionResult.riskCategory === "MODERATE" ? "bg-amber-950 text-amber-300 border-amber-800" :
              "bg-emerald-950 text-emerald-300 border-emerald-800"
            }`}>
              {fusionResult.riskCategory} RISK &bull; Score: {fusionResult.finalScore}/100
            </span>
          </div>
        </div>

        {/* ── 3-PILLAR MULTI-MODAL ARCHITECTURE CARDS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          
          {/* PILLAR 1: QUESTIONNAIRE WOMAC */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 uppercase">
                  Modality 1: Questionnaire
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Weight: 30%</span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-bold text-white">WOMAC Symptom Index</h3>
                <span className="text-2xl font-black text-teal-400 font-mono">{qScore}/100</span>
              </div>

              {/* Progress */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full ${qScore > 60 ? "bg-red-500" : qScore > 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${qScore}%` }}
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pain Subscale:</span>
                  <span className="font-bold text-white">{womacBreakdown.pain} / 20.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stiffness Subscale:</span>
                  <span className="font-bold text-white">{womacBreakdown.stiffness} / 8.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Function:</span>
                  <span className="font-bold text-white">{womacBreakdown.function} / 68.0</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">BMI / Occupation:</span>
                  <span className="font-mono text-teal-400">{riskFactors.bmi} kg/m² &bull; {riskFactors.occupation_flag ? "Manual" : "Sedentary"}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-800">
              {qScore > 50 ? "Elevated morning stiffness & weight-bearing pain" : "Normal joint comfort"}
            </p>
          </div>

          {/* PILLAR 2: COMPUTER VISION KINEMATICS */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                  Modality 2: Computer Vision
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Weight: 35%</span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-bold text-white">Video Kinematics Score</h3>
                <span className="text-2xl font-black text-cyan-400 font-mono">{cvScore}/100</span>
              </div>

              {/* Progress */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full ${cvScore > 60 ? "bg-red-500" : cvScore > 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${cvScore}%` }}
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">30s Chair Stand:</span>
                  <span className="font-bold text-white">{sitToStandReps} reps (Norm: 14)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Knee ROM:</span>
                  <span className="font-bold text-white">{romVal}° (Norm: &gt;115°)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coronal Alignment:</span>
                  <span className="font-bold text-cyan-400">{varusValgus} ({alignmentRatio})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">CV Confidence:</span>
                  <span className="font-mono text-emerald-400">{Math.round(cvConfidence * 100)}% Landmark Tracking</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-800">
              {sitToStandReps < 8 ? "Severely reduced quadriceps functional power" : "Stable sit-to-stand kinematics"}
            </p>
          </div>

          {/* PILLAR 3: HARDWARE ACOUSTIC SENSOR */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 uppercase">
                  Modality 3: Hardware Sensor
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Weight: 35%</span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-bold text-white">SandhiBand VAG Crepitus</h3>
                <span className="text-2xl font-black text-amber-400 font-mono">{hwScore}/100</span>
              </div>

              {/* Progress */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full rounded-full ${hwScore > 60 ? "bg-red-500" : hwScore > 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${hwScore}%` }}
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Crepitus Bursts:</span>
                  <span className="font-bold text-white">{burstCount} bursts / cycle</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dominant Frequency:</span>
                  <span className="font-bold text-white">{peakFrequency} Hz (Friction band)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RMS Vibration:</span>
                  <span className="font-bold text-amber-400">{rmsEnergy} mV</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-500">Crepitus State:</span>
                  <span className="font-mono text-amber-400">{burstCount >= 6 ? "Severe Wear" : burstCount >= 3 ? "Moderate" : "Smooth Flow"}</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-800">
              {burstCount >= 3 ? "Subchondral bone / cartilage friction detected" : "Laminar synovial fluid articulation"}
            </p>
          </div>

        </div>

        {/* ── SANDHIBAND HARDWARE OSCILLOSCOPE WAVEFORM SIMULATOR ── */}
        <div className="mb-6 rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-300 border border-teal-800 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  SandhiBand™ Vibroarthrographic Acoustic Waveform
                </h3>
                <p className="text-xs text-slate-400">
                  ESP32-S3 + Piezoelectric Transducer &bull; Bandpass Filter: 100 Hz – 1,000 Hz
                </p>
              </div>
            </div>

            {/* Presets & Audio Playback */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyPreset("smooth")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sensorPreset === "smooth" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                🟢 Smooth Synovial (KL 0-1)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("moderate")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sensorPreset === "moderate" ? "bg-amber-600 text-white shadow-sm" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                🟡 Moderate Crepitus (KL 2)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("severe")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sensorPreset === "severe" ? "bg-rose-600 text-white shadow-sm" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                🔴 Severe Chondral Wear (KL 3-4)
              </button>

              <button
                type="button"
                onClick={playCrepitusSound}
                disabled={isPlayingAudio}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{isPlayingAudio ? "🔊" : "▶"}</span>
                <span>{isPlayingAudio ? "Playing VAG..." : "Audio Playback"}</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            <canvas
              ref={waveformCanvasRef}
              width={720}
              height={200}
              className="w-full h-48 object-cover block"
            />
            <div className="absolute bottom-2 left-4 text-[10px] font-mono text-slate-400 flex gap-4">
              <span>Sampling: 4,000 Hz</span>
              <span>FFT Peak: <b className="text-teal-400">{peakFrequency} Hz</b></span>
              <span>Acoustic Bursts: <b className="text-red-400">{burstCount} detected</b></span>
            </div>
          </div>
        </div>

        {/* ── FUSION ENGINE SYNTHESIS & EXPLAINABLE REASONING ── */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                Module 4: Rule-Based Fusion Output
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                Final Composite OA Score: {fusionResult.finalScore} / 100
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Equation: Final = ({fusionResult.weights.w_q} × {qScore}) + ({fusionResult.weights.w_cv} × {cvScore}) + ({fusionResult.weights.w_hw} × {hwScore})
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-bold block">Kellgren-Lawrence Proxy</span>
                <span className="text-lg font-black text-teal-400 font-mono">Grade {fusionResult.klGrade}</span>
              </div>
              <button
                onClick={handleProceedToResults}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(20,184,166,0.4)] flex items-center gap-2 cursor-pointer transition"
              >
                <span>Generate Final Clinical Report</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Explainable Sub-Score Reasons */}
          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Explainable Clinical Indicators (Why this score was assigned):
            </h4>
            <ul className="space-y-1.5">
              {fusionResult.explanations.map((exp, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                  <CheckCircle2 size={14} className="text-teal-400 shrink-0 mt-0.5" />
                  <span>{exp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* NON-NEGOTIABLE GUARDRAIL: MEDICAL DISCLAIMER */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-950/60 border border-amber-800 flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              <b className="text-amber-300">Mandatory Clinical Guardrail:</b> Sandhi AI is an AI-assisted multi-modal screening tool for early osteoarthritis risk stratification, not a definitive medical diagnosis. If risk is moderate or high, consult an Orthopedic Specialist or Medical Officer for clinical examination and confirmatory radiographic imaging (X-ray).
            </p>
          </div>

        </div>

      </main>
    </div>
  )
}
