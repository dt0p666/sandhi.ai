import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { VOICE_PROMPTS, speakText, playPleasantChime } from "../utils/speech"

export default function Navbar({ onPortalChange }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [portalMode, setPortalMode] = useState("asha")
  const [selectedLang, setSelectedLang] = useState("en")
  const [user, setUser] = useState({ username: "invictus", full_name: "Admin Invictus", role: "admin" })

  useEffect(() => {
    const savedPortal = localStorage.getItem("sandhi_portal_mode") || "asha"
    setPortalMode(savedPortal)

    const savedLang = localStorage.getItem("sandhi_lang") || "en"
    setSelectedLang(savedLang)

    const storedUser = localStorage.getItem("sandhi_user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {}
    }

    const onLangChange = (e) => {
      if (e.detail) setSelectedLang(e.detail)
    }
    window.addEventListener("sandhi_language_changed", onLangChange)
    return () => window.removeEventListener("sandhi_language_changed", onLangChange)
  }, [])

  const handlePortalSwitch = (mode) => {
    setPortalMode(mode)
    localStorage.setItem("sandhi_portal_mode", mode)
    if (onPortalChange) {
      onPortalChange(mode)
    }
    // If not already on dashboard, take them to dashboard
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard")
    }
  }

  const handleLangChange = (lang) => {
    setSelectedLang(lang)
    localStorage.setItem("sandhi_lang", lang)
    window.dispatchEvent(new CustomEvent("sandhi_language_changed", { detail: lang }))
    const prompt = VOICE_PROMPTS[lang]
    if (prompt) {
      playPleasantChime()
      speakText(prompt.previewPhrase || prompt.nativeName, lang)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("sandhi_token")
    localStorage.removeItem("sandhi_user")
    navigate("/")
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        
        {/* Brand */}
        <div 
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 shadow-sm overflow-hidden group-hover:scale-105 transition">
            <img src="/logo.png" alt="SANDHI-AI Logo" className="h-full w-full object-contain p-1" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-tight">SANDHI-AI</span>
              <span className="hidden sm:inline-block rounded-md bg-teal-950 border border-teal-800 px-2 py-0.5 text-[10px] font-bold text-teal-400 tracking-wide">
                MDoNER 26004
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Assessment of NER Degenerative Joint Health & Intervention
            </p>
          </div>
        </div>

        {/* DUAL PORTAL SWITCHER (PDF Checklist Item 1) */}
        <div className="flex items-center rounded-xl bg-slate-950/80 p-1 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => { setPortalMode("patient"); navigate("/screening") }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              location.pathname === "/screening" || location.pathname === "/assessment" || location.pathname === "/movement"
                ? "bg-teal-600 text-white shadow-sm border border-teal-500 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span className="text-base">🩺</span>
            <span className="hidden md:inline">Citizen Screening Hub</span>
            <span className="md:hidden">Screening</span>
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("doctor")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
              portalMode === "doctor"
                ? "bg-teal-600 text-white shadow-sm border border-teal-500 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span className="text-base">⚕</span>
            <span className="hidden md:inline">Doctor & MDoNER Hub</span>
            <span className="md:hidden">Doctor</span>
          </button>
        </div>

        {/* Right Tools: Multilingual Voice & User */}
        <div className="flex items-center gap-3">
          
          {/* MULTILINGUAL VOICE TOGGLE (PDF Checklist Item 4) */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5 text-xs">
            {Object.keys(VOICE_PROMPTS).map((langKey) => {
              const lang = VOICE_PROMPTS[langKey]
              const isSelected = selectedLang === langKey
              return (
                <button
                  key={langKey}
                  type="button"
                  title={`Voice audio: ${lang.name} (${lang.nativeName}) - Click to hear audio`}
                  onClick={() => handleLangChange(langKey)}
                  className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-xs font-bold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="hidden lg:inline">{lang.name}</span>
                </button>
              )
            })}
          </div>

          {/* User profile badge */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800 text-right">
            <div>
              <p className="text-xs font-bold text-slate-200">{user.full_name || "Admin Invictus"}</p>
              <p className="text-[10px] text-teal-400 capitalize font-medium">{user.role || "Admin"}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 transition text-xs cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
