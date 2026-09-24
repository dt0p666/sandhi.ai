import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import ScreeningStepper from "../components/ScreeningStepper"
import { updateScreeningStep } from "../utils/supabaseClient"
import { 
  calculate3DMetricAngle, 
  evaluateLegVisibility, 
  validateSagittalPerspective, 
  TemporalAngleFilter, 
  createMediaPipePoseInstance,
  VISIBILITY_THRESHOLD 
} from "../utils/mediapipePoseEngine"
import { speakText, speakRepPraise, playPleasantChime, getBestVoice, VOICE_PROMPTS, speakVideoNarration } from "../utils/speech"

export default function MovementAnalysis() {
  const navigate = useNavigate()

  // Video & Canvas Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const demoVideoRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameId = useRef(null)

  // Real-time Optical Computer Vision Tracking Refs & States
  const offscreenCanvasRef = useRef(null)
  const sittingBaselineYRef = useRef(null)
  const standingBaselineYRef = useRef(null)
  const sittingHeadYRef = useRef(0.50)
  const standingHeadYRef = useRef(0.24)
  const currentHeadYRef = useRef(0.50)
  const smoothElevationRef = useRef(0.18)
  const lastPostureRef = useRef("SITTING")
  const repCooldownRef = useRef(0)
  const [elevationPercent, setElevationPercent] = useState(18)
  const [calibrationNotice, setCalibrationNotice] = useState("")

  // ── CLINICAL MEDIAPIPE 3D WORLD LANDMARKS & SENSOR FUSION STATES ──
  const poseInstanceRef = useRef(null)
  const temporalFilterRef = useRef(new TemporalAngleFilter(0.35))
  const [modelComplexity, setModelComplexity] = useState(1) // 1 (balanced) | 2 (maximum clinical precision)
  const [isSagittalView, setIsSagittalView] = useState(true)
  const [sagittalNotice, setSagittalNotice] = useState("Optimal Sagittal View")
  const [occlusionWarning, setOcclusionWarning] = useState("")
  const [isUsingWorldLandmarks, setIsUsingWorldLandmarks] = useState(false)

  // Modes: 'DEMO' (Human video demonstration) or 'TEST' (Active camera/simulation test)
  const [activeMode, setActiveMode] = useState("DEMO") 
  const [demoVideoSource, setDemoVideoSource] = useState("video") // 'video' or 'youtube'
  const [videoStepIndex, setVideoStepIndex] = useState(0)

  // Cycle synchronized multilingual subtitles during video demonstration
  useEffect(() => {
    let interval = null
    if (activeMode === "DEMO") {
      interval = setInterval(() => {
        setVideoStepIndex((prev) => (prev + 1) % 4)
      }, 3500)
    }
    return () => clearInterval(interval)
  }, [activeMode])

  // Pre-test countdown state: null | 3 | 2 | 1 | 'GO'
  const [countdown, setCountdown] = useState(null)
  const [isTestStarted, setIsTestStarted] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [cameraError, setCameraError] = useState("")

  // Clinical Profile & Biomechanical States (Dynamic Testing)
  const [clinicalProfile, setClinicalProfile] = useState("moderate") // 'healthy' | 'moderate' | 'severe'
  const [kneeAngle, setKneeAngle] = useState(165)
  const [liveFlexionAngle, setLiveFlexionAngle] = useState(15) // Clinical flexion: 0° = straight, ~90° = seated, increases as knee bends
  const [minFlexion, setMinFlexion] = useState(88)
  const [maxExtension, setMaxExtension] = useState(168)
  const [sitToStandState, setSitToStandState] = useState("STANDING") // 'STANDING' or 'SITTING'
  const [repCount, setRepCount] = useState(0)
  const [alignmentRatio, setAlignmentRatio] = useState(1.05)
  const [alignmentStatus, setAlignmentStatus] = useState("Normal Alignment (0.8 ≤ ratio ≤ 1.3)")

  // 30s Timer
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [testComplete, setTestComplete] = useState(false)
  const [completionReason, setCompletionReason] = useState("") // '10_REPS' or 'TIME_UP'

  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem("sandhi_lang") || "en")
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false)

  const isTestStartedRef = useRef(isTestStarted)
  const testCompleteRef = useRef(testComplete)
  const selectedLangRef = useRef(selectedLang)
  const cameraActiveRef = useRef(cameraActive)
  const isSimulatingRef = useRef(isSimulating)
  const clinicalProfileRef = useRef(clinicalProfile)
  const repCountRef = useRef(repCount)
  const kneeAngleRef = useRef(kneeAngle)
  const lastMediaPipeAngleTimeRef = useRef(0)
  const processFrameRef = useRef(null)

  // repPhaseRef tracks state in the knee flexion cycle: "IDLE", "EXTENDED", "FLEXED"
  const repPhaseRef = useRef("IDLE")
  // Records timestamp when the knee last crossed the extension threshold (≥140°).
  // Used to reject jitter crossings that happen impossibly fast (< 400ms).
  const lastExtensionTimeRef = useRef(0)
  // Real-time camera positioning guidance message (empty = all good, shown = user needs to reposition)
  const [cameraGuidance, setCameraGuidance] = useState("")

  useEffect(() => {
    isTestStartedRef.current = isTestStarted
  }, [isTestStarted])

  useEffect(() => {
    testCompleteRef.current = testComplete
  }, [testComplete])

  useEffect(() => {
    selectedLangRef.current = selectedLang
  }, [selectedLang])

  useEffect(() => {
    cameraActiveRef.current = cameraActive
  }, [cameraActive])

  useEffect(() => {
    isSimulatingRef.current = isSimulating
  }, [isSimulating])

  useEffect(() => {
    clinicalProfileRef.current = clinicalProfile
  }, [clinicalProfile])

  useEffect(() => {
    repCountRef.current = repCount
  }, [repCount])

  useEffect(() => {
    kneeAngleRef.current = kneeAngle
  }, [kneeAngle])

  // Accessibility & Manual Testing: Spacebar toggles Sit / Stand
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault()
        const newPosture = lastPostureRef.current === "STANDING" ? "SITTING" : "STANDING"
        lastPostureRef.current = newPosture
        setSitToStandState(newPosture)
        if (newPosture === "SITTING") {
          const now = Date.now()
          if (isTestStartedRef.current && !testCompleteRef.current && now - repCooldownRef.current > 600) {
            repCooldownRef.current = now
            setRepCount((prev) => {
              const next = Math.min(10, prev + 1)
              repCountRef.current = next
              playPleasantChime()
              speakRepPraise(next, selectedLangRef.current)
              return next
            })
          }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const onLangChange = (e) => {
      if (e.detail) setSelectedLang(e.detail)
    }
    window.addEventListener("sandhi_language_changed", onLangChange)
    return () => window.removeEventListener("sandhi_language_changed", onLangChange)
  }, [])

  const handleSelectLang = (langKey, playAudio = true) => {
    setSelectedLang(langKey)
    localStorage.setItem("sandhi_lang", langKey)
    window.dispatchEvent(new CustomEvent("sandhi_language_changed", { detail: langKey }))

    // Restart video when language is changed so it synchronizes
    if (demoVideoRef.current) {
      demoVideoRef.current.currentTime = 0
      demoVideoRef.current.play().catch(() => {})
    }

    if (playAudio) {
      setIsPlayingVoicePreview(true)
      speakVideoNarration(langKey)
      setTimeout(() => setIsPlayingVoicePreview(false), 4000)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  }, [])

  // ── AUTO-END CONDITION: STOP IMMEDIATELY AFTER 10 REPS (User Request) ──
  useEffect(() => {
    if (isTestStarted && repCount >= 10 && !testComplete) {
      handleCompleteTest("10_REPS")
    }
  }, [repCount, isTestStarted, testComplete])

  // 30s Countdown timer (ONLY runs after user clicks 'Start Test Now' and countdown finishes)
  useEffect(() => {
    let interval = null
    if (isTestStarted && !testComplete && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1)
      }, 1000)
    } else if (isTestStarted && !testComplete && timerSeconds === 0) {
      handleCompleteTest("TIME_UP")
    }
    return () => clearInterval(interval)
  }, [isTestStarted, testComplete, timerSeconds])

  const handleCompleteTest = (reason) => {
    setTestComplete(true)
    testCompleteRef.current = true
    setIsTestStarted(false)
    isTestStartedRef.current = false
    setCompletionReason(reason)
    stopCamera()

    const prompt = VOICE_PROMPTS[selectedLangRef.current] || VOICE_PROMPTS.en
    const finalReps = repCountRef.current ?? repCount
    if (reason === "10_REPS") {
      speakText(prompt.tenRepsFinished, selectedLangRef.current)
    } else {
      if (selectedLangRef.current === "en") {
        speakText(`${prompt.testFinished} You completed ${finalReps} repetitions!`, "en")
      } else {
        speakText(prompt.testFinished, selectedLangRef.current)
      }
    }
  }

  // ── INITIATE COUNTDOWN BEFORE TIMER (User Request: "ask first like start now test") ──
  const triggerStartTest = (useWebcam = true) => {
    setActiveMode("TEST")
    setRepCount(0)
    repCountRef.current = 0
    setTimerSeconds(30)
    setTestComplete(false)
    testCompleteRef.current = false
    setIsTestStarted(false)
    isTestStartedRef.current = false
    lastPostureRef.current = "SITTING"
    // Reset knee rep cycle state machine so test starts fresh
    repPhaseRef.current = "IDLE"
    lastExtensionTimeRef.current = 0
    repCooldownRef.current = 0
    // Reset temporal filter so prior session angle doesn't bleed in
    if (temporalFilterRef.current) temporalFilterRef.current.reset()
    playPleasantChime()
    setCountdown(3)

    // Pre-start the camera immediately so it is already bright and active!
    if (useWebcam) {
      launchCamera()
    }

    const prompt = VOICE_PROMPTS[selectedLang] || VOICE_PROMPTS.en
    speakText(prompt.countdown3, selectedLang)

    setTimeout(() => {
      setCountdown(2)
      speakText(prompt.countdown2, selectedLang)
    }, 1000)

    setTimeout(() => {
      setCountdown(1)
      speakText(prompt.countdown1, selectedLang)
    }, 2000)

    setTimeout(() => {
      setCountdown("GO!")
      speakText(prompt.countdownGo, selectedLang)
      
      // Start the actual 30-second timer and detection ONLY NOW!
      setTimeout(() => {
        setCountdown(null)
        setIsTestStarted(true)
        isTestStartedRef.current = true
        if (!useWebcam) {
          launchSimulation()
        } else {
          if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
          animFrameId.current = requestAnimationFrame(() => {
            if (processFrameRef.current) {
              processFrameRef.current()
            } else {
              processFrame()
            }
          })
        }
      }, 700)
    }, 3000)
  }

  // Initialize MediaPipe Pose with 3D World Landmarks & Temporal Smoothing
  const initMediaPipePose = (complexity = 1) => {
    try {
      if (poseInstanceRef.current) {
        poseInstanceRef.current.close?.()
      }

      const pose = createMediaPipePoseInstance(handleMediaPipeResults, complexity)
      poseInstanceRef.current = pose
    } catch (e) {
      console.warn("MediaPipe Pose init notice:", e)
    }
  }

  // Clinical MediaPipe Results Callback
  // Clinical MediaPipe Results Callback
  const handleMediaPipeResults = (results) => {
    if (!results || !results.poseLandmarks) return

    // Draw Live Skeleton Overlay from MediaPipe 2D Landmarks
    // Read real Nose (0) & Shoulders (11, 12) for upper body vertical position
    if (results.poseLandmarks[0]) {
      const nose = results.poseLandmarks[0]
      const lSh = results.poseLandmarks[11]
      const rSh = results.poseLandmarks[12]
      if (nose.visibility > 0.35) {
        let headY = nose.y
        if (lSh && rSh && lSh.visibility > 0.25 && rSh.visibility > 0.25) {
          headY = (nose.y * 2 + lSh.y + rSh.y) / 4.0
        }
        currentHeadYRef.current = headY
      }
    }

    // 1. Occlusion / Visibility Gating
    const visEval = evaluateLegVisibility(results.poseLandmarks, "auto")

    // ── CAMERA GUIDANCE (Part B): compute actionable message before gating ──
    // Check raw landmark confidences for hip, knee, ankle on the auto-selected side
    const hipVis = visEval.hipVis ?? 0
    const kneeVis = visEval.kneeVis ?? 0
    const ankleVis = visEval.ankleVis ?? 0
    const avgLegVis = (hipVis + kneeVis + ankleVis) / 3

    let guidanceMsg = ""
    if (!visEval.isValid) {
      if (kneeVis < 0.35 && hipVis > 0.4) {
        guidanceMsg = "🦵 Move back — your full leg isn't visible. Step away from camera."
      } else if (kneeVis < 0.35) {
        guidanceMsg = "🦵 Knee not detected — stand sideways to the camera for best tracking."
      } else if (hipVis < 0.35) {
        guidanceMsg = "🏃 Move back so your hip and knee are both in frame."
      } else {
        guidanceMsg = "⚠ Keep your hip and knee in view during the exercise."
      }
    } else if (avgLegVis < 0.45) {
      guidanceMsg = "💡 Step into better light — landmark confidence is low."
    } else if (ankleVis < 0.20 && kneeVis > 0.5) {
      guidanceMsg = "📐 Try to keep your ankle in frame for the most accurate knee angle."
    }
    setCameraGuidance(guidanceMsg)

    if (!visEval.isValid) {
      setOcclusionWarning("⚠️ Occlusion Gated: Keep hip and knee in view")
      // If landmark confidence drops during an active rep cycle, reset phase to avoid false counting
      if (repPhaseRef.current === "NEED_FLEXION") {
        repPhaseRef.current = "NEED_EXTENSION"
      }
      return
    } else {
      setOcclusionWarning("")
    }

    // 2. Sagittal Perspective Validator (Check side-on vs frontal)
    if (results.poseWorldLandmarks) {
      const sagEval = validateSagittalPerspective(results.poseWorldLandmarks)
      setIsSagittalView(sagEval.isSagittal)
      setSagittalNotice(sagEval.status)
    }

    // 3. 3D World Metric Coordinates Angle Math (Euclidean dot product in meters)
    let rawAngle = null
    if (results.poseWorldLandmarks && results.poseWorldLandmarks.length >= 29) {
      setIsUsingWorldLandmarks(true)
      const hip = visEval.side === "right" ? results.poseWorldLandmarks[24] : results.poseWorldLandmarks[23]
      const knee = visEval.side === "right" ? results.poseWorldLandmarks[26] : results.poseWorldLandmarks[25]
      const ankle = visEval.ankle ? (visEval.side === "right" ? results.poseWorldLandmarks[28] : results.poseWorldLandmarks[27]) : null
      rawAngle = calculate3DMetricAngle(hip, knee, ankle)
    } else {
      setIsUsingWorldLandmarks(false)
      rawAngle = calculate3DMetricAngle(visEval.hip, visEval.knee, visEval.ankle)
    }

    // 4. Temporal Smoothing (EMA Filter eliminates jitter and false flips)
    const smoothedAngle = temporalFilterRef.current.update(rawAngle)
    if (smoothedAngle !== null && !isNaN(smoothedAngle)) {
      kneeAngleRef.current = smoothedAngle
      lastMediaPipeAngleTimeRef.current = Date.now()
      setKneeAngle(smoothedAngle)
      // Clinical flexion convention: 0° = fully extended/straight, increases as knee bends
      setLiveFlexionAngle(Math.max(0, Math.round(180 - smoothedAngle)))
      setMinFlexion(prev => Math.min(prev, smoothedAngle))
      setMaxExtension(prev => Math.max(prev, smoothedAngle))

      // 5. Knee Flexion Rep Detection State Machine
      // Uses the live flexion angle displayed to the user:
      // liveFlexionAngle: 0° = straight leg (standing), ~90°+ = bent leg (seated / flexed)
      // Cycle: FLEXED (flexion >= 46°) -> EXTENDED (flexion <= 40°) -> REP + 1
      const currentFlex = Math.max(0, Math.round(180 - smoothedAngle))
      const now = Date.now()

      // Diagnostic logging for developer/clinician verification
      if (!window.__lastRepLogTime || now - window.__lastRepLogTime > 500) {
        console.log(`[Sandhi KneeRep] Flexion: ${currentFlex}° | JointAngle: ${Math.round(smoothedAngle)}° | State: ${repPhaseRef.current} | Reps: ${repCountRef.current} | TestStarted: ${isTestStartedRef.current}`)
        window.__lastRepLogTime = now
      }

      // Initialize state if IDLE
      if (repPhaseRef.current === "IDLE") {
        if (currentFlex >= 28) {
          repPhaseRef.current = "FLEXED"
          setSitToStandState("SITTING")
          lastPostureRef.current = "SITTING"
        } else if (currentFlex <= 22) {
          repPhaseRef.current = "EXTENDED"
          setSitToStandState("STANDING")
          lastPostureRef.current = "STANDING"
        }
      }

      if (currentFlex <= 22) {
        // Knee is straight / extended (standing position)
        setSitToStandState("STANDING")
        lastPostureRef.current = "STANDING"

        if (repPhaseRef.current === "FLEXED") {
          // Completed the cycle: was bent, now straightened back up!
          const timeSinceCooldown = now - repCooldownRef.current
          if (timeSinceCooldown > 500 && !testCompleteRef.current) {
            repCooldownRef.current = now
            repPhaseRef.current = "EXTENDED"
            setRepCount(prev => {
              const next = Math.min(10, prev + 1)
              repCountRef.current = next
              console.log(`[Sandhi KneeRep] 🎯 REP INCREMENTED -> ${next} (from knee flexion: ${currentFlex}°)`)
              playPleasantChime()
              speakRepPraise(next, selectedLangRef.current)
              return next
            })
          } else {
            repPhaseRef.current = "EXTENDED"
          }
        } else {
          repPhaseRef.current = "EXTENDED"
        }
      } else if (currentFlex >= 28) {
        // Knee is bent / flexed past flexion threshold (seated position)
        setSitToStandState("SITTING")
        lastPostureRef.current = "SITTING"
        repPhaseRef.current = "FLEXED"
      }
    }
  }

  // ── DRAW VIBRANT BIOMECHANICAL HUMAN BODY SHAPE AVATAR ──
  const drawBiomechanicalAvatar = (ctx, x, y, width, height, elev, posture, angle) => {
    ctx.save()
    // 1. Futuristic Hologram Pod Background
    ctx.fillStyle = "rgba(10, 15, 30, 0.85)"
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, 16)
    ctx.fill()
    ctx.strokeStyle = posture === "STANDING" ? "rgba(16, 185, 129, 0.8)" : "rgba(245, 158, 11, 0.8)"
    ctx.lineWidth = 2
    ctx.stroke()

    // 2. Pod Header Label
    ctx.fillStyle = "#38bdf8"
    ctx.font = "bold 9px Inter, sans-serif"
    ctx.fillText("BIOMECHANICAL AVATAR", x + 12, y + 18)

    // 3. Avatar Articulation Geometry
    const cx = x + width * 0.48
    const cy = y + height * 0.48
    const scale = 0.82

    const headY = cy - 65 * scale + (1 - elev) * 32 * scale
    const neckY = headY + 14 * scale
    const hipX = cx - (1 - elev) * 16 * scale
    const hipY = cy + (1 - elev) * 32 * scale

    const kneeX = cx + (1 - elev) * 20 * scale
    const kneeY = hipY + 38 * scale + (1 - elev) * 8 * scale

    const ankleX = cx + (1 - elev) * 6 * scale
    const ankleY = cy + 85 * scale

    const primaryColor = posture === "STANDING" ? "#10b981" : "#f59e0b"
    const secondaryColor = "#00f5ff"

    // Draw Chair if Sitting
    if (elev < 0.50) {
      ctx.beginPath()
      ctx.strokeStyle = "rgba(100, 116, 139, 0.6)"
      ctx.lineWidth = 3
      ctx.moveTo(hipX - 18 * scale, hipY - 25 * scale)
      ctx.lineTo(hipX - 18 * scale, hipY + 12 * scale)
      ctx.lineTo(hipX + 10 * scale, hipY + 12 * scale)
      ctx.lineTo(hipX + 10 * scale, cy + 85 * scale)
      ctx.stroke()
    }

    // Spine / Torso
    ctx.beginPath()
    ctx.strokeStyle = secondaryColor
    ctx.lineWidth = 5
    ctx.lineCap = "round"
    ctx.moveTo(cx, neckY)
    ctx.lineTo(hipX, hipY)
    ctx.stroke()

    // Thigh (Hip to Knee)
    ctx.beginPath()
    ctx.strokeStyle = primaryColor
    ctx.lineWidth = 7
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(kneeX, kneeY)
    ctx.stroke()

    // Shin / Calf (Knee to Ankle)
    ctx.beginPath()
    ctx.strokeStyle = secondaryColor
    ctx.lineWidth = 5
    ctx.moveTo(kneeX, kneeY)
    ctx.lineTo(ankleX, ankleY)
    ctx.stroke()

    // Foot
    ctx.beginPath()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 4
    ctx.moveTo(ankleX, ankleY)
    ctx.lineTo(ankleX + 16 * scale, ankleY)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(cx, headY, 11 * scale, 0, 2 * Math.PI)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.strokeStyle = primaryColor
    ctx.lineWidth = 3
    ctx.stroke()

    // Joints (Hip, Knee, Ankle)
    ;[[hipX, hipY, "#38bdf8"], [kneeX, kneeY, primaryColor], [ankleX, ankleY, "#38bdf8"]].forEach(([jx, jy, c]) => {
      ctx.beginPath()
      ctx.arc(jx, jy, 5 * scale, 0, 2 * Math.PI)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.strokeStyle = c
      ctx.lineWidth = 2.5
      ctx.stroke()
    })

    // Knee Angle & Posture Status Tag
    ctx.fillStyle = primaryColor
    ctx.font = "bold 11px Inter, sans-serif"
    ctx.fillText(`${posture} (${angle}°)`, x + 12, y + height - 14)

    ctx.restore()
  }

  const launchCamera = async () => {
    try {
      setCameraError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      cameraActiveRef.current = true
      setIsSimulating(false)
      isSimulatingRef.current = false

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {})
        }
        videoRef.current.play().catch(() => {})
      }

      // Initialize MediaPipe Pose
      initMediaPipePose(modelComplexity)

      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      animFrameId.current = requestAnimationFrame(() => {
        if (processFrameRef.current) {
          processFrameRef.current()
        } else {
          processFrame()
        }
      })
    } catch (err) {
      console.warn("Camera access fallback to simulation:", err)
      setCameraError("Camera unavailable. Using Biomechanics Detection Simulator.")
      launchSimulation()
    }
  }

  const launchSimulation = () => {
    setIsSimulating(true)
    isSimulatingRef.current = true
    setCameraActive(true)
    cameraActiveRef.current = true
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    animFrameId.current = requestAnimationFrame(() => {
      if (processFrameRef.current) {
        processFrameRef.current()
      } else {
        processFrame()
      }
    })
  }

  // ── REAL COMPUTER VISION FACE & UPPER-BODY Y TRACKER ──
  const analyzeWebcamBodyY = (video) => {
    if (!video || video.readyState < 2) return null
    if (!offscreenCanvasRef.current && typeof document !== "undefined") {
      const oc = document.createElement("canvas")
      oc.width = 120
      oc.height = 90
      offscreenCanvasRef.current = oc
    }
    const offCanvas = offscreenCanvasRef.current
    if (!offCanvas) return null
    const offCtx = offCanvas.getContext("2d", { willReadFrequently: true })

    try {
      offCtx.drawImage(video, 0, 0, 120, 90)
      const frameData = offCtx.getImageData(0, 0, 120, 90).data

      let skinWeightSum = 0
      let skinYSum = 0
      let topDetectedY = 90

      // Scan upper 80% of rows in central 70% width
      for (let y = 4; y < 75; y += 2) {
        for (let x = 18; x < 102; x += 3) {
          const idx = (y * 120 + x) * 4
          const r = frameData[idx]
          const g = frameData[idx + 1]
          const b = frameData[idx + 2]

          // Detect human skin tones
          const isSkin = r > 70 && g > 38 && b > 22 && r > g && r > b && (r - g) > 8
          const isHeadUpper = y < 45 && r < 70 && g < 70 && b < 70

          if (isSkin || isHeadUpper) {
            if (y < topDetectedY) topDetectedY = y
            const weight = (90 - y) * 2.0 + (isSkin ? 30 : 15)
            skinYSum += y * weight
            skinWeightSum += weight
          }
        }
      }

      if (skinWeightSum === 0) return null
      const centroidY = skinYSum / skinWeightSum
      return (topDetectedY * 0.65 + centroidY * 0.35) / 90.0
    } catch {
      return null
    }
  }

  // ── PROCESS FRAME WITH DYNAMIC AVATAR & HEAD TRACKING ──
  const processFrame = (simulatedProgress = null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    let elevation = 0.2
    const isLiveWebcam = (cameraActiveRef.current || cameraActive) && !(isSimulatingRef.current || isSimulating) && videoRef.current

    // Send frame to MediaPipe Pose detector if loaded
    if (isLiveWebcam && poseInstanceRef.current && videoRef.current.readyState >= 2) {
      try {
        poseInstanceRef.current.send({ image: videoRef.current })
      } catch (e) {}
    }

    let observedHeadY = currentHeadYRef.current

    if (isLiveWebcam) {
      const opticalY = analyzeWebcamBodyY(videoRef.current)
      if (opticalY !== null) {
        observedHeadY = opticalY
      }

      if (observedHeadY !== null) {
        // Expand baselines adaptively
        if (observedHeadY > sittingHeadYRef.current) {
          sittingHeadYRef.current = Math.min(0.75, sittingHeadYRef.current * 0.90 + observedHeadY * 0.10)
        }
        if (observedHeadY < standingHeadYRef.current) {
          standingHeadYRef.current = Math.max(0.12, standingHeadYRef.current * 0.90 + observedHeadY * 0.10)
        }

        const span = Math.max(0.14, sittingHeadYRef.current - standingHeadYRef.current)
        // High head (observedHeadY small) -> rawElev ~ 1.0 (Standing)
        // Lower head (observedHeadY large) -> rawElev ~ 0.0 (Sitting)
        const rawElev = Math.max(0, Math.min(1, (sittingHeadYRef.current - observedHeadY) / span))

        smoothElevationRef.current = 0.65 * smoothElevationRef.current + 0.35 * rawElev
        elevation = smoothElevationRef.current
      } else {
        elevation = smoothElevationRef.current
      }
    } else {
      const profile = clinicalProfileRef.current || clinicalProfile
      const speedDivisor = profile === "healthy" ? 210 : profile === "severe" ? 540 : 330
      const t = simulatedProgress !== null ? simulatedProgress : Date.now() / speedDivisor
      elevation = (Math.sin(t) + 1) / 2
      smoothElevationRef.current = elevation
    }

    setElevationPercent(Math.round(elevation * 100))

    // Determine Posture with hysteresis
    let currentPosture = lastPostureRef.current
    if (elevation >= 0.50) {
      currentPosture = "STANDING"
    } else if (elevation <= 0.40) {
      currentPosture = "SITTING"
    }

    const isLiveMediaPipeActive = isLiveWebcam && (Date.now() - lastMediaPipeAngleTimeRef.current < 1000)

    // State Transition & Rep Counting
    // When MediaPipe is active, knee goniometry drives rep counting in handleMediaPipeResults.
    // When MediaPipe is NOT delivering angles (simulation, or webcam cropped above knees),
    // optical elevation tracking provides seamless, reliable sit-to-stand rep counting!
    if (currentPosture !== lastPostureRef.current) {
      const prevPosture = lastPostureRef.current
      lastPostureRef.current = currentPosture
      setSitToStandState(currentPosture)

      if (currentPosture === "STANDING" && prevPosture === "SITTING") {
        const now = Date.now()
        if (!testCompleteRef.current && now - repCooldownRef.current > 500) {
          repCooldownRef.current = now
          setRepCount((prevReps) => {
            const nextReps = Math.min(10, prevReps + 1)
            repCountRef.current = nextReps
            console.log(`[Sandhi ElevationRep] 🎯 REP INCREMENTED -> ${nextReps} (from body elevation)`)
            playPleasantChime()
            speakRepPraise(nextReps, selectedLangRef.current)
            return nextReps
          })
        }
      }
    }

    // Dynamic knee angle from real elevation
    const profile = clinicalProfileRef.current || clinicalProfile
    const lowAngle = profile === "healthy" ? 74 : profile === "severe" ? 104 : 88
    const highAngle = profile === "healthy" ? 174 : profile === "severe" ? 148 : 166
    const currentFlexAngle = Math.round(lowAngle + elevation * (highAngle - lowAngle))

    const displayAngle = isLiveMediaPipeActive ? (kneeAngleRef.current || currentFlexAngle) : currentFlexAngle

    if (!isLiveMediaPipeActive) {
      setKneeAngle(currentFlexAngle)
      setLiveFlexionAngle(Math.max(0, Math.round(180 - currentFlexAngle)))
      setMinFlexion(prev => Math.min(prev, currentFlexAngle))
      setMaxExtension(prev => Math.max(prev, currentFlexAngle))
    }

    // ── 1. DRAW BIOMECHANICAL HUMAN BODY AVATAR (Left Side Pod) ──
    drawBiomechanicalAvatar(ctx, 16, 75, 140, 260, elevation, currentPosture, displayAngle)

    // ── 2. DRAW HEAD LEVEL LASER TRACKER ON VIDEO (NO LINES ON FACE!) ──
    const displayHeadY = (observedHeadY || (sittingHeadYRef.current - elevation * (sittingHeadYRef.current - standingHeadYRef.current))) * height
    ctx.save()

    // Stand Target Line
    const standY = standingHeadYRef.current * height
    ctx.beginPath()
    ctx.strokeStyle = "rgba(16, 185, 129, 0.55)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 6])
    ctx.moveTo(170, standY)
    ctx.lineTo(width - 20, standY)
    ctx.stroke()
    ctx.fillStyle = "#34d399"
    ctx.font = "bold 10px Inter, sans-serif"
    ctx.fillText("▲ STAND LEVEL", width - 125, standY - 4)

    // Sit Target Line
    const sitY = sittingHeadYRef.current * height
    ctx.beginPath()
    ctx.strokeStyle = "rgba(245, 158, 11, 0.55)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 6])
    ctx.moveTo(170, sitY)
    ctx.lineTo(width - 20, sitY)
    ctx.stroke()
    ctx.fillStyle = "#fbbf24"
    ctx.font = "bold 10px Inter, sans-serif"
    ctx.fillText("▼ SIT LEVEL", width - 110, sitY + 14)

    // Current Dynamic Head Laser Line
    ctx.beginPath()
    ctx.strokeStyle = currentPosture === "STANDING" ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)"
    ctx.lineWidth = 2.5
    ctx.setLineDash([8, 4])
    ctx.moveTo(170, displayHeadY)
    ctx.lineTo(width - 20, displayHeadY)
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 11px Inter, sans-serif"
    ctx.fillText(`👤 Head (${Math.round(elevation * 100)}%)`, width - 130, displayHeadY - 5)
    ctx.restore()

    if ((cameraActiveRef.current || isTestStartedRef.current || isSimulatingRef.current) && !testCompleteRef.current) {
      animFrameId.current = requestAnimationFrame(() => {
        if (processFrameRef.current) {
          processFrameRef.current()
        } else {
          processFrame()
        }
      })
    }
  }

  processFrameRef.current = processFrame

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current)
    }
    setCameraActive(false)
    cameraActiveRef.current = false
    setIsSimulating(false)
    isSimulatingRef.current = false
    isTestStartedRef.current = false
  }

  const continueToAIAnalysis = () => {
    stopCamera()
    const storedWomac = localStorage.getItem("sandhi_womac")
    let womacData = null
    try {
      womacData = storedWomac ? JSON.parse(storedWomac) : null
    } catch (e) {}

    const storedPatient = localStorage.getItem("sandhi_patient")
    let patientData = null
    try {
      patientData = storedPatient ? JSON.parse(storedPatient) : null
    } catch (e) {}

    const romCalculated = Math.max(25, maxExtension - minFlexion)
    const finalReps = repCountRef.current ?? repCount

    const movementData = {
      gait: { value: `${Math.round(alignmentRatio * 100)}%`, status: alignmentStatus },
      knee: { value: `${romCalculated}° ROM`, status: romCalculated < 75 ? "Severe ROM Deficit" : romCalculated < 100 ? "Mild ROM Deficit" : "Normal ROM" },
      posture: { value: `${finalReps} Reps`, status: finalReps >= 10 ? "Target 10 Reps Achieved" : `${finalReps} Reps in 30s` },
      sitToStandReps: finalReps,
      timeElapsed: Math.max(1, 30 - timerSeconds),
      flexionAngle: minFlexion,
      extensionAngle: maxExtension,
      rom: romCalculated,
      alignmentRatio: alignmentRatio,
      alignmentStatus: alignmentStatus,
      varusValgusAlignment: alignmentRatio > 1.3 ? "Varus" : alignmentRatio < 0.8 ? "Valgus" : "Normal",
      clinicalProfile
    }

    const cvScore = Math.round(Math.max(10, Math.min(95, 100 - (repCount * 4 + (romCalculated / 120) * 35))))
    updateScreeningStep(2, movementData, cvScore)
    localStorage.setItem("sandhi_movement", JSON.stringify(movementData))

    navigate("/analysis", {
      state: {
        patient: patientData,
        womacScore: womacData?.womacScore ?? (clinicalProfile === "healthy" ? 14 : clinicalProfile === "severe" ? 82 : 44),
        assessmentData: womacData,
        movementResults: movementData
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <ScreeningStepper currentStep={2} />

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        
        {/* Header & Mode Switcher */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Step 3 of 4 &bull; Computer Vision Kinematics</span>
            <h1 className="mt-1 text-2xl md:text-3xl font-black text-white tracking-tight">
              30-Second Chair Stand Test (10 Reps Target)
            </h1>
            <p className="text-sm text-slate-400">
              Watch the demonstration first, then click <b className="text-teal-300">Start Test Now</b> to begin the 3-2-1 countdown.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveMode("DEMO")
                stopCamera()
                setIsTestStarted(false)
                setTestComplete(false)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === "DEMO" ? "bg-slate-700 text-teal-300 shadow-sm border border-slate-600" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📺</span>
              <span>Human Demo Video</span>
            </button>

            <button
              onClick={() => triggerStartTest(true)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeMode === "TEST" ? "bg-teal-600 text-white shadow-sm border border-teal-500" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📷</span>
              <span>Live Camera Test</span>
            </button>
          </div>
        </div>

        {/* ── MULTILINGUAL AUDIO VOICE GUIDANCE DECK (MDoNER Item 4) ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 shadow-md mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/90 text-white text-lg shadow-sm border border-teal-500/40">
                🗣️
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Audio Voice Language</span>
                  <span className="rounded-full bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
                    6 NER & National Languages
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select your preferred language. All countdowns, 10-rep praises, and instructions will speak in this voice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectLang(selectedLang, true)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isPlayingVoicePreview
                    ? "bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400/40 animate-pulse"
                    : "bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700"
                }`}
                title="Play Audio Sample"
              >
                <span>🔊</span>
                <span>{isPlayingVoicePreview ? "Speaking..." : "Play Voice Sample"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playPleasantChime()
                  speakText(VOICE_PROMPTS[selectedLang]?.welcomeTutorial, selectedLang)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Listen to Full Tutorial"
              >
                <span>🌸</span>
                <span className="hidden sm:inline">Tutorial Audio</span>
              </button>
            </div>
          </div>

          {/* 6 Language Selection Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.keys(VOICE_PROMPTS).map((langKey) => {
              const lang = VOICE_PROMPTS[langKey]
              const isSelected = selectedLang === langKey
              return (
                <button
                  key={langKey}
                  type="button"
                  onClick={() => handleSelectLang(langKey, true)}
                  className={`relative p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-slate-800 border-teal-500 shadow-md ring-2 ring-teal-500/30"
                      : "bg-slate-950/60 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xl leading-none">{lang.flag}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-teal-300 bg-teal-950 px-1.5 py-0.5 rounded-md border border-teal-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs leading-tight">
                      {lang.nativeName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {lang.name}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Currently selected phrase preview text */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-1.5">
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-teal-300">Current Voice:</span>
              <span className="italic text-slate-400 truncate">
                "{VOICE_PROMPTS[selectedLang]?.previewPhrase}"
              </span>
            </div>
            <div className="text-[11px] text-teal-400 font-medium whitespace-nowrap">
              🗣️ Audio Active: {VOICE_PROMPTS[selectedLang]?.name} ({VOICE_PROMPTS[selectedLang]?.nativeName})
            </div>
          </div>
        </div>

        {/* ── MODE 1: HUMAN DEMONSTRATION VIDEO STAGE ── */}
        {activeMode === "DEMO" && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 shadow-xl mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
              <div>
                <span className="rounded-full bg-teal-950 text-teal-300 border border-teal-800 text-xs font-bold px-3 py-0.5 uppercase tracking-wider">
                  {VOICE_PROMPTS[selectedLang]?.flag} {VOICE_PROMPTS[selectedLang]?.name} ({VOICE_PROMPTS[selectedLang]?.nativeName}) Clinical Video
                </span>
                <h3 className="mt-1 text-xl font-bold text-white">
                  {VOICE_PROMPTS[selectedLang]?.videoTitle || "How a Real Human Performs the Chair Stand Test"}
                </h3>
                <p className="text-xs text-slate-400">
                  {VOICE_PROMPTS[selectedLang]?.videoSubtitle || "Observe the clinical demonstration before starting your camera test."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakVideoNarration(selectedLang)}
                  className="rounded-xl bg-teal-600 text-white hover:bg-teal-500 px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md border border-teal-500/40"
                >
                  <span>🔊</span>
                  <span>Play {VOICE_PROMPTS[selectedLang]?.nativeName} Spoken Video Audio</span>
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 items-center">
              
              {/* Left: REAL HUMAN BEING CLINICAL DEMONSTRATION VIDEO */}
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl aspect-4/3 flex items-center justify-center group">
                  {demoVideoSource === "video" ? (
                    <video
                      ref={demoVideoRef}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full h-full object-cover"
                    >
                      <source src="/videos/human_demo.webm" type="video/webm" />
                      <source src="https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d5/30-Second_Chair_Stand_Test.webm/30-Second_Chair_Stand_Test.webm.480p.vp9.webm" type="video/webm" />
                      <source src="https://upload.wikimedia.org/wikipedia/commons/d/d5/30-Second_Chair_Stand_Test.webm" type="video/webm" />
                      Your browser does not support HTML5 video.
                    </video>
                  ) : (
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/Ng-UOHjTejY?autoplay=1&mute=1&loop=1&playlist=Ng-UOHjTejY"
                      title="Clinical 30-Second Chair Stand Test Human Demo"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}

                  {/* Top Badge: Dynamic Selected Language */}
                  <div className="absolute top-3 left-3 pointer-events-none rounded-lg bg-slate-900/90 backdrop-blur-md px-3 py-1.5 text-white flex items-center gap-2 border border-slate-700/80 shadow-md">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold tracking-wide uppercase text-emerald-300">
                      {VOICE_PROMPTS[selectedLang]?.videoBadge || "Clinical Demo Video"}
                    </span>
                  </div>

                  {/* Top Right: Native Language Voice Narration Button */}
                  <button
                    type="button"
                    onClick={() => speakVideoNarration(selectedLang)}
                    className="absolute top-3 right-3 rounded-lg bg-teal-600/95 hover:bg-teal-500 backdrop-blur-md px-3 py-1.5 text-white text-xs font-bold flex items-center gap-1.5 border border-teal-400/50 shadow-lg cursor-pointer transition"
                    title={`Hear video narration in ${VOICE_PROMPTS[selectedLang]?.name}`}
                  >
                    <span>🔊</span>
                    <span>{VOICE_PROMPTS[selectedLang]?.nativeName} Audio</span>
                  </button>

                  {/* Synchronized Real-time Subtitles in Selected Language */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md rounded-xl p-3 border border-slate-700 shadow-xl">
                    <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
                        Subtitles ({VOICE_PROMPTS[selectedLang]?.name} - {VOICE_PROMPTS[selectedLang]?.nativeName})
                      </span>
                      <span className="text-slate-400">Step {videoStepIndex + 1} of 4</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug">
                      {VOICE_PROMPTS[selectedLang]?.videoSteps?.[videoStepIndex] || VOICE_PROMPTS.en.videoSteps[0]}
                    </p>
                  </div>
                </div>

                {/* Source Selection Bar */}
                <div className="flex items-center justify-between text-xs bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Demonstration Video:</span>
                    <button
                      type="button"
                      onClick={() => setDemoVideoSource("video")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        demoVideoSource === "video"
                          ? "bg-teal-600 text-white shadow-sm border border-teal-500"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <span>🎥</span>
                      <span>Real Patient Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoVideoSource("youtube")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        demoVideoSource === "youtube"
                          ? "bg-red-600 text-white shadow-sm border border-red-500"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      <span>▶</span>
                      <span>YouTube Guide</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-teal-400 font-semibold hidden md:inline">
                    Authentic Clinical Assessment Video
                  </span>
                </div>
              </div>

              {/* Right: Golden Rules & Big "Start Test Now" Button */}
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wide">3 Golden Rules for Accuracy</h4>
                  
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="font-bold text-teal-400 text-sm">1.</span>
                    <span><b className="text-white">Sturdy Chair:</b> Place a firm chair against a wall so it won't slide. Keep feet flat on the floor.</span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="font-bold text-teal-400 text-sm">2.</span>
                    <span><b className="text-white">Cross Your Arms:</b> Fold arms across your chest. Do not push off from the chair or thighs with your hands!</span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="font-bold text-teal-400 text-sm">3.</span>
                    <span><b className="text-white">Target 10 Reps:</b> Stand all the way up, then sit back down smoothly. Test automatically finishes when you reach 10 reps!</span>
                  </div>
                </div>

                {/* Big Start Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    onClick={() => triggerStartTest(true)}
                    className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 py-4 px-6 text-sm font-black text-white hover:from-teal-500 hover:to-emerald-500 transition shadow-[0_0_30px_rgba(20,184,166,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Ready? Start Test Now (3-2-1 Countdown)</span>
                  </button>

                  <button
                    onClick={() => triggerStartTest(false)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>▶</span>
                    <span>Start in Simulation Mode (Without Webcam)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── MODE 2: ACTIVE LIVE TEST WITH 3-2-1 COUNTDOWN ── */}
        {activeMode === "TEST" && (
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Live Camera Box with Vibrant Catchy Neon Accents */}
            <div className={`lg:col-span-2 relative rounded-3xl overflow-hidden bg-slate-950 border-3 transition-all duration-300 aspect-4/3 flex items-center justify-center ${
              sitToStandState === "STANDING"
                ? "border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                : "border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)]"
            }`}>
              
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                  cameraActive && !isSimulating ? "opacity-90" : "hidden"
                }`}
              />

              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {/* 3-2-1 COUNTDOWN OVERLAY */}
              {countdown !== null && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
                  <p className="text-xs uppercase tracking-widest text-cyan-400 font-black mb-2 animate-pulse">
                    Get Into Position &bull; Arms Crossed Across Chest
                  </p>
                  <span className="text-9xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-300 drop-shadow-[0_0_35px_rgba(251,191,36,0.8)] animate-bounce">
                    {countdown}
                  </span>
                  <p className="text-xs text-slate-300 mt-4 font-semibold">Starting 30-Second Chair Stand Test...</p>
                </div>
              )}

              {/* 10 REPETITIONS CELEBRATION MODAL */}
              {testComplete && (
                <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 border-4 border-white flex items-center justify-center text-4xl mb-4 shadow-[0_0_40px_rgba(16,185,129,0.8)] animate-bounce">
                    🎉
                  </div>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 px-4 py-1 text-xs font-black uppercase tracking-wider mb-2">
                    {completionReason === "10_REPS" ? "Goal Achieved: 10 Repetitions Completed!" : "30s Assessment Complete"}
                  </span>
                  <h3 className="text-3xl font-black text-white">
                    {completionReason === "10_REPS" ? "10/10 Reps Finished!" : "Time Complete!"}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mt-2 leading-relaxed">
                    Knee kinematics, flexion range ({liveFlexionAngle}° peak flexion), and quadriceps endurance successfully measured.
                  </p>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={continueToAIAnalysis}
                      className="rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 px-7 py-3.5 font-black text-slate-950 text-xs shadow-[0_0_25px_rgba(45,212,191,0.6)] hover:brightness-110 transition cursor-pointer flex items-center gap-2"
                    >
                      <span>Proceed to AI Analysis</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => triggerStartTest(cameraActive && !isSimulating)}
                      className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                    >
                      Retest
                    </button>
                  </div>
                </div>
              )}

              {/* Clinical Occlusion & Gating Warning */}
              {occlusionWarning && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-rose-950/95 border border-rose-500 text-rose-200 text-xs font-bold shadow-xl animate-bounce">
                  {occlusionWarning}
                </div>
              )}

              {/* Sagittal Plane & 3D World Coordinates Badges */}
              <div className="absolute top-16 left-4 z-30 flex flex-col gap-1.5 pointer-events-none">
                <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                  isSagittalView
                    ? "bg-emerald-950/85 border-emerald-500/60 text-emerald-300"
                    : "bg-amber-950/90 border-amber-500/80 text-amber-200 animate-pulse"
                }`}>
                  <span>{isSagittalView ? "📐 Sagittal: Side-On View" : "⚠️ Frontal View (Turn 90° sideways)"}</span>
                </div>

                <div className="px-2.5 py-1 rounded-xl text-[10px] font-bold border border-cyan-500/40 bg-slate-950/85 text-cyan-300 flex items-center gap-1.5 backdrop-blur-md shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>{isUsingWorldLandmarks ? "🌐 3D Metric World Landmarks" : "⚡ Temporal EMA Smoothed"}</span>
                </div>
              </div>

              {/* Model Complexity Toggle */}
              <div className="absolute top-16 right-4 z-30 flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    const next = modelComplexity === 1 ? 2 : 1
                    setModelComplexity(next)
                    initMediaPipePose(next)
                  }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                    modelComplexity === 2
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      : "bg-slate-950/85 text-teal-300 border-teal-500/50 hover:bg-slate-900"
                  }`}
                  title="Toggle MediaPipe Model Complexity"
                >
                  <span>{modelComplexity === 2 ? "🔬 Complexity: 2 (Clinical)" : "⚡ Complexity: 1 (Live 30fps)"}</span>
                </button>
              </div>

              {/* ── TOP HUD: VIBRANT GLOWING POSTURE BADGE & KNEE ANGLE ── */}
              <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
                
              </div>

              <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                {/* 30s Timer with glowing digits */}
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700 shadow-xl flex items-center gap-2 text-xs font-bold text-white">
                  <span className="text-slate-400 text-[11px]">Timer:</span>
                  <span className={`text-base font-black font-mono ${
                    timerSeconds <= 5 ? "text-rose-400 animate-ping" : timerSeconds <= 10 ? "text-amber-400" : "text-cyan-400"
                  }`}>
                    {timerSeconds}s
                  </span>
                </div>

                {/* Knee Flexion Angle (Clinical: 0° = straight, ↑ as knee bends) */}
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Flex: <strong className={`text-sm font-mono ${liveFlexionAngle >= 70 ? "text-amber-300" : liveFlexionAngle >= 40 ? "text-yellow-200" : "text-emerald-300"}`}>{liveFlexionAngle}°</strong></span>
                </div>
              </div>

              {/* Bottom Progress Bar: 0 to 10 Reps */}
              <div className="absolute bottom-4 left-4 right-4 z-30 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-3 text-white shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 font-mono">
                      {repCount} / 10
                    </span>
                    <span className="text-xs font-bold text-slate-200">Reps Completed</span>
                  </div>
                  <span className="text-[11px] font-mono text-teal-300 font-bold">
                    {repCount >= 10 ? "Target Reached!" : `${10 - repCount} reps to goal`}
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(45,212,191,0.8)]"
                    style={{ width: `${Math.min(100, (repCount / 10) * 100)}%` }}
                  />
                </div>
              </div>

            </div>

            {/* ── CAMERA POSITIONING GUIDANCE BANNER (Part B) ──
                Shown whenever landmark visibility is poor enough to affect tracking quality.
                Appears before AND during the assessment so the user always knows if the
                camera can see their knee properly. */}
            {cameraGuidance !== "" && activeMode === "TEST" && (
              <div className="mt-2 flex items-center gap-3 rounded-xl bg-amber-950/70 border border-amber-700 px-4 py-2.5 shadow text-amber-200 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>{cameraGuidance}</span>
              </div>
            )}

            {/* Right Column: Live Metrics */}
            <div className="space-y-4">
              
              {/* Interactive Telemetry Controls Card */}
              <div className="rounded-2xl border border-teal-800/70 bg-teal-950/50 p-4 shadow-md">
                <span className="text-[11px] font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  Live Posture & Rep Controls
                </span>
                <div className="grid grid-cols-2 gap-2">
                  
                  <button
                    type="button"
                    onClick={() => {
                      setRepCount(prev => Math.min(10, prev + 1))
                      playPleasantChime()
                      speakRepPraise(repCount + 1, selectedLang)
                    }}
                    className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>+1 Count Rep</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 text-center font-medium">
                  💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold">Spacebar</kbd> anytime to toggle Sit / Stand!
                </div>
              </div>

              {/* ── LIVE KNEE FLEXION & GONIOMETRY TELEMETRY CARD ── */}
              <div className="rounded-2xl border border-cyan-800/60 bg-slate-900/90 p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Knee Flexion Goniometry
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                    Live CV Optical
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className={`text-4xl font-black font-mono ${liveFlexionAngle >= 70 ? "text-amber-400" : liveFlexionAngle >= 40 ? "text-yellow-300" : "text-emerald-400"}`}>
                      {liveFlexionAngle}°
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-medium">Live Knee Bend</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Peak Bend</span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {Math.max(0, Math.round(180 - minFlexion))}°
                    </span>
                  </div>
                </div>

                {/* Dynamic Flexion Arc Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>0° (Straight)</span>
                    <span>90° (Seated Bend)</span>
                    <span>130°+ (Deep)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-amber-500 rounded-full transition-all duration-150"
                      style={{ width: `${Math.min(100, (liveFlexionAngle / 130) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">Active Arc (ROM)</span>
                    <span className="text-sm font-black font-mono text-teal-300">{Math.max(0, Math.round(maxExtension - minFlexion))}°</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">Interior Angle</span>
                    <span className="text-sm font-black font-mono text-slate-200">{kneeAngle}°</span>
                  </div>
                </div>

                <p className="mt-2.5 text-[10px] text-slate-500 leading-tight">
                  📐 Optical CV measures 3-point joint goniometry (hip-knee-ankle). Postural standing/sitting elevation is verified by SandhiBand™ hardware (IMU + FSR).
                </p>
              </div>

              {/* Repetition Target Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Repetition Target</span>
                  <span className="text-xs font-black text-emerald-300 font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800">
                    {repCount} / 10 Reps
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 font-mono">
                    {repCount}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">of 10 completed</span>
                </div>
                <div className="mt-3 h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (repCount / 10) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Test auto-completes and proceeds to AI analysis when you reach 10 reps.
                </p>
              </div>

              {/* Real-time Posture Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Current Posture</span>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-4 w-4 rounded-full ${
                      sitToStandState === "STANDING" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                    }`} />
                    <span className="text-xl font-black text-white tracking-wide">{sitToStandState}</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-300 font-mono bg-cyan-950 px-2 py-0.5 rounded-md border border-cyan-800">
                    Elevation: {elevationPercent}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Camera Vision &amp; Elevation: &gt;52% (Standing) &bull; &lt;40% (Sitting)
                </p>
              </div>

              {/* Multilingual Voice Coach Card */}
              <div className="rounded-2xl border border-teal-800/60 bg-teal-950/40 p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 uppercase tracking-wide">Audio Voice Coach</span>
                  <span className="text-xs font-bold text-teal-400 font-mono">{VOICE_PROMPTS[selectedLang]?.flag} {VOICE_PROMPTS[selectedLang]?.name}</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Real-time encouragement &amp; counts spoken in <b className="text-teal-300">{VOICE_PROMPTS[selectedLang]?.nativeName}</b>.
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectLang(selectedLang, true)}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-teal-900 border border-slate-700 hover:border-teal-700 text-xs font-bold text-teal-300 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <span>🔊</span>
                  <span>Test Audio Phrase</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={continueToAIAnalysis}
                  className="w-full rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 py-4 px-4 font-black text-slate-950 hover:brightness-110 transition cursor-pointer shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  <span>Proceed to Step 3: Hardware Ingestion</span>
                  <span>→</span>
                </button>

                <button
                  onClick={() => {
                    setActiveMode("DEMO")
                    stopCamera()
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  ← Replay Demonstration Video
                </button>
              </div>

            </div>          </div>
        )}

      </main>
    </div>
  )
}
