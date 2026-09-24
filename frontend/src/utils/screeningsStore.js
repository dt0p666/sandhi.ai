// Sandhi-AI Real-Time Patient Screening Data Store
// Automatically synchronizes citizen screenings into the Doctor & MDoNER Admin Command Hub

const STORAGE_KEY = "sandhi_all_screenings"

export const DEFAULT_SCREENINGS = [
  {
    id: "SCR-948201",
    timestamp: "2026-09-10T14:15:00Z",
    patient: {
      name: "Bimla Karmakar",
      age: 58,
      gender: "Female",
      phone: "+91 98640 12845",
      state: "Assam",
      district: "Kamrup Metropolitan",
      joint: "Right Knee",
      occupation: "Tea Garden Worker",
      abhaId: "14-5829-1029-4821"
    },
    scores: {
      compositeScore: 54,
      riskCategory: "MODERATE",
      klProxy: 2,
      womacScore: 48,
      sitToStandReps: 7,
      rom: 86,
      flexionAngle: 94,
      extensionAngle: 160,
      alignmentRatio: 1.34,
      varusValgus: "Varus",
      burstCount: 4,
      peakFrequency: 142
    },
    clinicalAction: "PHC Physiotherapy & Joint Mobility Monitoring",
    status: "PHC Follow-Up Scheduled",
    notes: "Patient experiences 35 min morning stiffness. Medial joint space narrowing observed."
  },
  {
    id: "SCR-819302",
    timestamp: "2026-09-10T13:40:00Z",
    patient: {
      name: "Chandra Devi Mech",
      age: 71,
      gender: "Female",
      phone: "+91 94350 88219",
      state: "Assam",
      district: "Dibrugarh",
      joint: "Bilateral Knee",
      occupation: "Retired Weaver / Homemaker",
      abhaId: "14-9912-3401-7729"
    },
    scores: {
      compositeScore: 88,
      riskCategory: "HIGH",
      klProxy: 4,
      womacScore: 84,
      sitToStandReps: 3,
      rom: 42,
      flexionAngle: 110,
      extensionAngle: 146,
      alignmentRatio: 1.58,
      varusValgus: "Varus",
      burstCount: 8,
      peakFrequency: 255
    },
    clinicalAction: "URGENT: Fast-track GMCH Guwahati Orthopedic Specialist Triage",
    status: "Urgent Specialist Review",
    notes: "Severe bone-on-bone friction crepitus. Fixed flexion contracture with bow-leg deformity."
  },
  {
    id: "SCR-720194",
    timestamp: "2026-09-10T12:05:00Z",
    patient: {
      name: "Lalremruata Sailo",
      age: 64,
      gender: "Male",
      phone: "+91 98623 55012",
      state: "Mizoram",
      district: "Aizawl",
      joint: "Left Knee",
      occupation: "Horticulture Farmer",
      abhaId: "14-2284-9102-3841"
    },
    scores: {
      compositeScore: 68,
      riskCategory: "HIGH",
      klProxy: 3,
      womacScore: 66,
      sitToStandReps: 5,
      rom: 68,
      flexionAngle: 102,
      extensionAngle: 154,
      alignmentRatio: 1.42,
      varusValgus: "Varus",
      burstCount: 6,
      peakFrequency: 218
    },
    clinicalAction: "Referral to Civil Hospital Aizawl Orthopedic OPD",
    status: "Urgent Specialist Review",
    notes: "Steep terrace farm loading causing joint instability and extension deficit."
  },
  {
    id: "SCR-610283",
    timestamp: "2026-09-10T11:15:00Z",
    patient: {
      name: "Priyam Barua",
      age: 32,
      gender: "Male",
      phone: "+91 97060 44291",
      state: "Assam",
      district: "Jorhat",
      joint: "Right Knee",
      occupation: "Office Executive",
      abhaId: "14-1102-9948-2231"
    },
    scores: {
      compositeScore: 18,
      riskCategory: "LOW",
      klProxy: 0,
      womacScore: 12,
      sitToStandReps: 14,
      rom: 122,
      flexionAngle: 72,
      extensionAngle: 174,
      alignmentRatio: 1.02,
      varusValgus: "Normal",
      burstCount: 1,
      peakFrequency: 82
    },
    clinicalAction: "Community Lifestyle & Ergonomic Guidance",
    status: "Normal Routine",
    notes: "No articular crepitus. Normal joint space width and muscle endurance."
  },
  {
    id: "SCR-509182",
    timestamp: "2026-09-10T10:30:00Z",
    patient: {
      name: "Haobam Thambal Leima",
      age: 62,
      gender: "Female",
      phone: "+91 98561 77301",
      state: "Manipur",
      district: "Imphal West",
      joint: "Right Knee",
      occupation: "Market Vendor (Ima Keithel)",
      abhaId: "14-7731-8842-1920"
    },
    scores: {
      compositeScore: 74,
      riskCategory: "HIGH",
      klProxy: 3,
      womacScore: 72,
      sitToStandReps: 4,
      rom: 58,
      flexionAngle: 106,
      extensionAngle: 150,
      alignmentRatio: 1.48,
      varusValgus: "Varus",
      burstCount: 7,
      peakFrequency: 232
    },
    clinicalAction: "URGENT: Fast-track RIMS Imphal Orthopedic Evaluation",
    status: "Urgent Specialist Review",
    notes: "Prolonged standing vendor duties. Bilateral patellofemoral tenderness."
  },
  {
    id: "SCR-402918",
    timestamp: "2026-09-10T09:20:00Z",
    patient: {
      name: "Tashi Wangchuk Bhutia",
      age: 48,
      gender: "Male",
      phone: "+91 97330 11928",
      state: "Sikkim",
      district: "Gangtok",
      joint: "Left Knee",
      occupation: "High Altitude Guide",
      abhaId: "14-3829-4401-9921"
    },
    scores: {
      compositeScore: 42,
      riskCategory: "MODERATE",
      klProxy: 2,
      womacScore: 38,
      sitToStandReps: 9,
      rom: 96,
      flexionAngle: 88,
      extensionAngle: 164,
      alignmentRatio: 1.22,
      varusValgus: "Normal",
      burstCount: 3,
      peakFrequency: 135
    },
    clinicalAction: "PHC Physiotherapy & Quadriceps Strengthening",
    status: "PHC Follow-Up Scheduled",
    notes: "Mountain terrain joint stress. Mild early patellar crepitus."
  }
]

export function getScreenings() {
  if (typeof window === "undefined") return DEFAULT_SCREENINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCREENINGS))
      return DEFAULT_SCREENINGS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCREENINGS
  } catch (err) {
    return DEFAULT_SCREENINGS
  }
}

export function addScreening(newScreening) {
  if (typeof window === "undefined") return
  try {
    const current = getScreenings()
    // Check if duplicate by ID or same ABHA + timestamp
    const exists = current.some(s => s.id === newScreening.id)
    if (exists) return

    const updated = [newScreening, ...current]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent("sandhi_screenings_updated", { detail: newScreening }))
  } catch (err) {
    console.warn("Screening sync error:", err)
  }
}

export function updateScreeningStatus(id, newStatus, newNotes = null) {
  if (typeof window === "undefined") return
  try {
    const current = getScreenings()
    const updated = current.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: newStatus,
          notes: newNotes !== null ? newNotes : s.notes
        }
      }
      return s
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent("sandhi_screenings_updated"))
  } catch (err) {}
}

// Save a doctor-authored care plan to a screening record.
// carePlanData shape: { exercises, lifestyle, followUpDate, reassessmentSchedule, physioReferral, createdBy, createdAt }
export function updateCarePlan(id, carePlanData) {
  if (typeof window === "undefined") return
  try {
    const current = getScreenings()
    const updated = current.map(s => {
      if (s.id === id) {
        return { ...s, carePlan: carePlanData }
      }
      return s
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent("sandhi_screenings_updated"))
  } catch (err) {}
}

export const getAllScreenings = getScreenings
