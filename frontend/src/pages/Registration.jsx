import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, User, Stethoscope, FileText, ChevronDown } from "lucide-react"

function Registration() {
  const navigate = useNavigate()

  // Dynamic Patient State
  const [fullName, setFullName] = useState("Bimla Karmakar")
  const [age, setAge] = useState(58)
  const [gender, setGender] = useState("Female")
  const [phone, setPhone] = useState("9864012345")
  const [stateName, setStateName] = useState("Assam")
  const [district, setDistrict] = useState("Kamrup Metropolitan")
  const [height, setHeight] = useState(156)
  const [weight, setWeight] = useState(64)
  const [joint, setJoint] = useState("Right Knee")
  const [occupation, setOccupation] = useState("Tea Garden Worker / Farmer")
  const [symptoms, setSymptoms] = useState("Morning stiffness > 30 mins, audible cracking during stair climbing")

  const handleSubmit = (e) => {
    e.preventDefault()

    const patientData = {
      name: fullName || "Bimla Karmakar",
      age: Number(age) || 58,
      gender,
      phone,
      state: stateName,
      district,
      height: Number(height) || 156,
      weight: Number(weight) || 64,
      joint,
      occupation,
      symptoms,
      abhaId: `14-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      registeredAt: new Date().toISOString()
    }

    localStorage.setItem("sandhi_patient", JSON.stringify(patientData))
    navigate("/assessment", { state: { patient: patientData } })
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-12 selection:bg-teal-500 selection:text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-8 py-4 flex items-center gap-4 shadow-md">
        <button 
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-950 text-teal-300 font-bold text-sm shadow-inner ring-1 ring-teal-800">
            SA
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              SANDHI-AI
            </h1>
            <p className="text-[10px] text-teal-400 font-medium uppercase tracking-wider">
              Patient Registration &bull; Step 1 of 4
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-4xl p-6 md:p-8 mt-4">

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <FileText size={14} className="text-teal-400" />
            Step 1 of 4 &bull; Clinical Onboarding
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Register Screening Patient
          </h2>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm">
            Enter the patient details. Diagnostic score, range of motion, and risk category are calculated dynamically based on these parameters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal Information */}
          <div className="rounded-2xl bg-slate-900/90 shadow-xl border border-slate-800 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-teal-950 rounded-lg text-teal-300 border border-teal-800">
                <User size={18} />
              </div>
              <h3 className="font-semibold text-white text-sm">Personal Demographics</h3>
            </div>

            <div className="p-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min="18"
                  max="110"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Phone / ABHA Registered Mobile</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">NER State</label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                >
                  <option value="Assam">Assam</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Sikkim">Sikkim</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">District / PHC Block</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Clinical Joint & Occupational Stress */}
          <div className="rounded-2xl bg-slate-900/90 shadow-xl border border-slate-800 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-teal-950 rounded-lg text-teal-300 border border-teal-800">
                <Stethoscope size={18} />
              </div>
              <h3 className="font-semibold text-white text-sm">Target Joint & Biomechanical Exposure</h3>
            </div>

            <div className="p-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Index Joint Examined</label>
                <select
                  value={joint}
                  onChange={(e) => setJoint(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                >
                  <option value="Right Knee">Right Knee</option>
                  <option value="Left Knee">Left Knee</option>
                  <option value="Bilateral Knee">Bilateral Knee (Both Joints)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Primary Occupational Loading</label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-400">Reported Symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows="2"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white outline-none focus:border-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Continue to Step 2: WOMAC Questionnaire</span>
              <ArrowRight size={16} />
            </button>
          </div>

        </form>

      </main>

    </div>
  )
}

export default Registration
