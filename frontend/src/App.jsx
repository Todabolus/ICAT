import { useState, useEffect } from 'react'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------
const THEMES = {
  dark: {
    logo:              '/logo_white.svg',
    page:              'bg-[#0A1628]',
    header:            'bg-cap-navy',
    headerText:        'text-white',
    headerBtn:         'text-cap-sky hover:text-white',
    card:              'bg-[#0E1E30] border border-[#1E3A54]',
    cardHeaderBorder:  'border-[#1E3A54]',
    cardTitle:         'text-cap-sky',
    cardText:          'text-gray-300',
    setupCard:         'bg-[#0E1E30] border border-[#1E3A54]',
    formTitle:         'text-white',
    formSubtitle:      'text-gray-400',
    formLabel:         'text-gray-300',
    input:             'bg-[#0A1628] border-[#1E3A54] text-white placeholder-gray-500 focus:ring-cap-sky focus:border-cap-sky',
    toggleActive:      'bg-cap-blue text-white',
    toggleInactive:    'bg-[#0A1628] text-gray-400 hover:bg-[#122030]',
    toggleBorder:      'border-[#1E3A54]',
    spinnerWrapper:    'text-gray-400',
    footer:            'bg-cap-navy border-t border-[#1E3A54]',
    footerText:        'text-gray-500',
    sectionLabel:      'text-gray-400',
    sidebar:           'bg-[#070E17] border-r border-[#1E3A54]',
    sidebarTitle:      'text-gray-400',
    sidebarItem:       'hover:bg-[#0E1E30] border-b border-[#1A3050]',
    sidebarItemActive: 'bg-[#0E1E30] border-b border-[#1A3050]',
    sidebarCompany:    'text-gray-200',
    sidebarMeta:       'text-gray-500',
    sidebarEmpty:      'text-gray-600',
    sidebarDeleteBtn:  'text-gray-600 hover:text-red-400',
    sidebarClearBtn:   'text-gray-600 hover:text-red-400',
    sidebarToggleBtn:  'text-gray-500 hover:text-gray-300',
  },
  light: {
    logo:              '/logo_blue.svg',
    page:              'bg-[#EEF3F7]',
    header:            'bg-white border-b border-gray-200',
    headerText:        'text-cap-navy',
    headerBtn:         'text-cap-blue hover:text-cap-navy',
    card:              'bg-white border border-gray-200',
    cardHeaderBorder:  'border-gray-100',
    cardTitle:         'text-cap-navy',
    cardText:          'text-gray-700',
    setupCard:         'bg-white border border-gray-200',
    formTitle:         'text-cap-navy',
    formSubtitle:      'text-cap-muted',
    formLabel:         'text-cap-navy',
    input:             'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-cap-blue focus:border-cap-blue',
    toggleActive:      'bg-cap-blue text-white',
    toggleInactive:    'bg-white text-cap-muted hover:bg-[#EEF3F7]',
    toggleBorder:      'border-gray-300',
    spinnerWrapper:    'text-gray-400',
    footer:            'bg-white border-t border-gray-200',
    footerText:        'text-gray-400',
    sectionLabel:      'text-cap-navy',
    sidebar:           'bg-white border-r border-gray-200',
    sidebarTitle:      'text-cap-muted',
    sidebarItem:       'hover:bg-[#EEF3F7] border-b border-gray-100',
    sidebarItemActive: 'bg-[#EEF3F7] border-b border-gray-100',
    sidebarCompany:    'text-cap-navy',
    sidebarMeta:       'text-gray-400',
    sidebarEmpty:      'text-gray-400',
    sidebarDeleteBtn:  'text-gray-300 hover:text-red-400',
    sidebarClearBtn:   'text-gray-400 hover:text-red-500',
    sidebarToggleBtn:  'text-gray-400 hover:text-gray-600',
  },
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const LANGS = {
  en: {
    themeLight: '☀ Light', themeDark: '☾ Dark',
    settingsBtn: 'Settings', cancelBtn: 'Cancel',
    historyTitle: 'History', historyClear: 'Clear all', historyClearConfirm: 'Delete all history entries?', historyEmpty: 'No analyses yet',
    inputLabel: 'Client Analysis', inputPlaceholder: 'Enter client name…',
    runBtn: 'Analyse', runningBtn: 'Analysing…',
    newAnalysis: 'New Analysis',
    stepDimensions: 'Data Maturity Analysis', stepFinancial: 'Financial Research', stepSynthesis: 'Business Value Analyst',
    stepWaiting: 'Waiting for prerequisites…',
    setupTitle: 'Setup',
    setupSubtitle: 'Configure your LLM access. Settings are stored locally on your device.',
    providerLabel: 'Provider', apiKeyLabel: 'API Key', apiKeyPlaceholderExisting: 'Leave blank to keep existing key',
    endpointOptLabel: 'Endpoint (optional)', endpointAzureLabel: 'Azure Endpoint',
    modelLabel: 'Model', deploymentLabel: 'Deployment Name', apiVersionLabel: 'API Version',
    endpointOptPlaceholder: 'Leave blank for default OpenAI',
    saveBtn: 'Save & start', savingBtn: 'Saving…',
    errApiKey: 'API Key is required.', errEndpoint: 'Azure Endpoint is required.',
    errSave: 'Save failed.', errConnect: 'Connection to server failed.',
    errGeneric: 'Error processing request.',
    spinning: 'Analysis running…',
    summarizeBtn: 'Summarize', summarizingBtn: 'Summarizing…',
    summaryLabel: 'Summary', originalLabel: 'Original',
    footer: 'ICAT · Capgemini Internal Tool · Data is processed locally',
  },
  de: {
    themeLight: '☀ Hell', themeDark: '☾ Dunkel',
    settingsBtn: 'Einstellungen', cancelBtn: 'Abbrechen',
    historyTitle: 'Verlauf', historyClear: 'Alles löschen', historyClearConfirm: 'Alle Einträge löschen?', historyEmpty: 'Noch keine Analysen',
    inputLabel: 'Clientanalyse', inputPlaceholder: 'Clientname eingeben…',
    runBtn: 'Analysieren', runningBtn: 'Analysiere…',
    newAnalysis: 'Neue Analyse',
    stepDimensions: 'Data-Maturity-Analyse', stepFinancial: 'Finanzrecherche', stepSynthesis: 'Business-Value-Analyst',
    stepWaiting: 'Wartet auf Vorschritte…',
    setupTitle: 'Einrichtung',
    setupSubtitle: 'Konfiguriere deinen LLM-Zugang. Die Einstellungen werden lokal auf deinem Gerät gespeichert.',
    providerLabel: 'Anbieter', apiKeyLabel: 'API Key', apiKeyPlaceholderExisting: 'Leer lassen um bestehenden Key zu behalten',
    endpointOptLabel: 'Endpoint (optional)', endpointAzureLabel: 'Azure Endpoint',
    modelLabel: 'Model', deploymentLabel: 'Deployment Name', apiVersionLabel: 'API Version',
    endpointOptPlaceholder: 'Leer lassen für Standard OpenAI',
    saveBtn: 'Speichern & starten', savingBtn: 'Speichern…',
    errApiKey: 'API Key ist erforderlich.', errEndpoint: 'Azure Endpoint ist erforderlich.',
    errSave: 'Speichern fehlgeschlagen.', errConnect: 'Verbindung zum Server fehlgeschlagen.',
    errGeneric: 'Fehler beim Verarbeiten der Anfrage.',
    spinning: 'Analyse läuft…',
    summarizeBtn: 'Zusammenfassen', summarizingBtn: 'Zusammenfassen…',
    summaryLabel: 'Zusammenfassung', originalLabel: 'Original',
    footer: 'ICAT · Capgemini Internal Tool · Daten werden lokal verarbeitet',
  },
  fr: {
    themeLight: '☀ Clair', themeDark: '☾ Sombre',
    settingsBtn: 'Paramètres', cancelBtn: 'Annuler',
    historyTitle: 'Historique', historyClear: 'Tout effacer', historyClearConfirm: 'Supprimer tout l\'historique ?', historyEmpty: 'Aucune analyse',
    inputLabel: 'Analyse client', inputPlaceholder: 'Entrez le nom du client…',
    runBtn: 'Analyser', runningBtn: 'Analyse en cours…',
    newAnalysis: 'Nouvelle analyse',
    stepDimensions: 'Analyse de maturité des données', stepFinancial: 'Analyse financière', stepSynthesis: 'Analyste valeur commerciale',
    stepWaiting: 'En attente des prérequis…',
    setupTitle: 'Configuration',
    setupSubtitle: 'Configurez votre accès LLM. Les paramètres sont stockés localement sur votre appareil.',
    providerLabel: 'Fournisseur', apiKeyLabel: 'Clé API', apiKeyPlaceholderExisting: 'Laisser vide pour conserver la clé existante',
    endpointOptLabel: 'Point de terminaison (optionnel)', endpointAzureLabel: 'Point de terminaison Azure',
    modelLabel: 'Modèle', deploymentLabel: 'Nom du déploiement', apiVersionLabel: 'Version API',
    endpointOptPlaceholder: 'Laisser vide pour OpenAI par défaut',
    saveBtn: 'Enregistrer & démarrer', savingBtn: 'Enregistrement…',
    errApiKey: 'La clé API est requise.', errEndpoint: "Le point de terminaison Azure est requis.",
    errSave: "Échec de l'enregistrement.", errConnect: 'Connexion au serveur échouée.',
    errGeneric: 'Erreur lors du traitement de la demande.',
    spinning: 'Analyse en cours…',
    summarizeBtn: 'Résumer', summarizingBtn: 'Résumé en cours…',
    summaryLabel: 'Résumé', originalLabel: 'Original',
    footer: 'ICAT · Outil interne Capgemini · Les données sont traitées localement',
  },
  pl: {
    themeLight: '☀ Jasny', themeDark: '☾ Ciemny',
    settingsBtn: 'Ustawienia', cancelBtn: 'Anuluj',
    historyTitle: 'Historia', historyClear: 'Wyczyść wszystko', historyClearConfirm: 'Usunąć całą historię?', historyEmpty: 'Brak analiz',
    inputLabel: 'Analiza klienta', inputPlaceholder: 'Wpisz nazwę klienta…',
    runBtn: 'Analizuj', runningBtn: 'Analizowanie…',
    newAnalysis: 'Nowa analiza',
    stepDimensions: 'Analiza dojrzałości danych', stepFinancial: 'Analiza finansowa', stepSynthesis: 'Analityk wartości biznesowej',
    stepWaiting: 'Oczekiwanie na warunki wstępne…',
    setupTitle: 'Konfiguracja',
    setupSubtitle: 'Skonfiguruj dostęp do LLM. Ustawienia są przechowywane lokalnie na urządzeniu.',
    providerLabel: 'Dostawca', apiKeyLabel: 'Klucz API', apiKeyPlaceholderExisting: 'Pozostaw puste, aby zachować istniejący klucz',
    endpointOptLabel: 'Endpoint (opcjonalny)', endpointAzureLabel: 'Azure Endpoint',
    modelLabel: 'Model', deploymentLabel: 'Nazwa wdrożenia', apiVersionLabel: 'Wersja API',
    endpointOptPlaceholder: 'Pozostaw puste dla domyślnego OpenAI',
    saveBtn: 'Zapisz i uruchom', savingBtn: 'Zapisywanie…',
    errApiKey: 'Klucz API jest wymagany.', errEndpoint: 'Azure Endpoint jest wymagany.',
    errSave: 'Zapisywanie nie powiodło się.', errConnect: 'Połączenie z serwerem nie powiodło się.',
    errGeneric: 'Błąd podczas przetwarzania żądania.',
    spinning: 'Analiza w toku…',
    summarizeBtn: 'Podsumuj', summarizingBtn: 'Podsumowywanie…',
    summaryLabel: 'Podsumowanie', originalLabel: 'Oryginał',
    footer: 'ICAT · Narzędzie wewnętrzne Capgemini · Dane są przetwarzane lokalnie',
  },
}

const DEFAULT_FORM = { provider: 'openai', api_key: '', endpoint: '', api_version: '' }
const HISTORY_KEY = 'icat-history'
const LANG_KEY = 'icat-lang'
const ACTIVE_KEY = 'icat-active'
const JOB_KEY = 'icat-job'
const MAX_HISTORY = 50

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(entries) { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)) }

function stepsFromEntry(entry) {
  const s = (v) => v ? 'done' : 'error'
  return {
    dimensions_1: { status: s(entry.dimensions_1), data: entry.dimensions_1 || null, error: null },
    dimensions_2: { status: s(entry.dimensions_2), data: entry.dimensions_2 || null, error: null },
    financial:    { status: s(entry.financial_webscraper), data: entry.financial_webscraper || null, error: null },
    synthesis:    { status: s(entry.synthesis), data: entry.synthesis || null, error: null },
  }
}

function stepsFromPendingEntry(entry) {
  const step = (v) => v
    ? { status: 'done', data: v, error: null }
    : { status: 'loading', data: null, error: null }
  return {
    dimensions_1: step(entry.dimensions_1),
    dimensions_2: step(entry.dimensions_2),
    financial:    step(entry.financial_webscraper),
    synthesis:    entry.synthesis
      ? { status: 'done', data: entry.synthesis, error: null }
      : { status: 'waiting', data: null, error: null },
  }
}

async function readJobStream(res, updateHistory, setSteps, onJobId) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed.startsWith('data: ')) continue
      let event; try { event = JSON.parse(trimmed.slice(6)) } catch { continue }
      if (event.type === 'job_id') {
        if (onJobId) onJobId(event.job_id)
        continue
      }
      if (event.type === 'step_done') {
        if (event.step === 'dimensions_1')              updateHistory('dimensions_1', event.data)
        else if (event.step === 'dimensions_2')         updateHistory('dimensions_2', event.data)
        else if (event.step === 'financial_webscraper') updateHistory('financial_webscraper', event.data)
        else if (event.step === 'synthesis')            updateHistory('synthesis', event.data)
        setSteps(prev => {
          if (!prev) return prev
          const next = { ...prev }
          if (event.step === 'dimensions_1')              next.dimensions_1 = { status: 'done', data: event.data, error: null }
          else if (event.step === 'dimensions_2')         next.dimensions_2 = { status: 'done', data: event.data, error: null }
          else if (event.step === 'financial_webscraper') next.financial = { status: 'done', data: event.data, error: null }
          else if (event.step === 'synthesis')            next.synthesis = { status: 'done', data: event.data, error: null }
          return next
        })
      } else if (event.type === 'step_error') {
        setSteps(prev => {
          if (!prev) return prev
          const next = { ...prev }
          if (event.step === 'dimensions_1')              next.dimensions_1 = { status: 'error', data: null, error: event.message }
          else if (event.step === 'dimensions_2')         next.dimensions_2 = { status: 'error', data: null, error: event.message }
          else if (event.step === 'financial_webscraper') next.financial = { status: 'error', data: null, error: event.message }
          else if (event.step === 'synthesis')            next.synthesis = { status: 'error', data: null, error: event.message }
          return next
        })
      } else if (event.type === 'step_start' && event.step === 'synthesis') {
        setSteps(prev => prev ? { ...prev, synthesis: { status: 'loading', data: null, error: null } } : prev)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------
function Logo({ th }) {
  return (
    <div className="flex items-center gap-4">
      <img src={th.logo} alt="Capgemini" className="h-7" style={{ display: 'block' }} />
      <div className="leading-none">
        <div className={`font-bold tracking-widest uppercase text-xl ${th.headerText}`}>ICAT</div>
        <div className="font-light text-cap-sky tracking-wide text-[10px]">Intelligent Client Analysis Tool</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Language Dropdown
// ---------------------------------------------------------------------------
const LANG_META = {
  en: { flag: '🇬🇧', label: 'English' },
  de: { flag: '🇩🇪', label: 'Deutsch' },
  fr: { flag: '🇫🇷', label: 'Français' },
  pl: { flag: '🇵🇱', label: 'Polski' },
}

function LangDropdown({ lang, onChangeLang, th }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-lg leading-none hover:opacity-80 transition-opacity"
        title={LANG_META[lang].label}>
        {LANG_META[lang].flag}
      </button>
      {open && (
        <div className={`absolute right-0 top-8 z-50 rounded-lg shadow-lg overflow-hidden min-w-[140px] ${th.setupCard}`}>
          {Object.entries(LANG_META).map(([code, { flag, label }]) => (
            <button key={code}
              onClick={() => { onChangeLang(code); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left
                ${code === lang ? th.toggleActive : `${th.cardText} ${th.sidebarItem}`}`}>
              <span className="text-base">{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header Controls (theme toggle + lang switcher)
// ---------------------------------------------------------------------------
function HeaderControls({ theme, onToggleTheme, lang, onChangeLang, th, t }) {
  return (
    <div className="flex items-center gap-5">
      <LangDropdown lang={lang} onChangeLang={onChangeLang} th={th} />
      <button onClick={onToggleTheme}
        className={`text-xs font-medium transition-colors tracking-widest uppercase ${th.headerBtn}`}>
        {theme === 'dark' ? t.themeLight : t.themeDark}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------
function Field({ label, required, th, children }) {
  return (
    <div className="mb-4">
      <label className={`block text-sm font-medium mb-1 ${th.formLabel}`}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({ message, onConfirm, onCancel, th, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`rounded-xl shadow-xl w-80 overflow-hidden ${th.setupCard}`}>
        <div className="h-1 bg-cap-blue" />
        <div className="p-6">
          <p className={`text-sm mb-6 ${th.formSubtitle}`}>{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${th.headerBtn}`}>
              {t.cancelBtn}
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
              {t.historyClear}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History Sidebar
// ---------------------------------------------------------------------------
function HistorySidebar({ history, activeId, onSelect, onDelete, onClear, onNewAnalysis, th, t, open, onToggle }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
    {showConfirm && (
      <ConfirmDialog
        message={t.historyClearConfirm}
        onConfirm={() => { setShowConfirm(false); onClear() }}
        onCancel={() => setShowConfirm(false)}
        th={th} t={t}
      />
    )}
    <aside className={`flex-shrink-0 flex flex-col overflow-hidden transition-all duration-200 ${open ? 'w-56' : 'w-10'} ${th.sidebar}`}>
      {/* Header row */}
      {open ? (
        <div className={`h-10 flex items-center justify-between border-b ${th.cardHeaderBorder}`}>
          <span className={`pl-3 text-xs font-semibold uppercase tracking-widest ${th.sidebarTitle}`}>
            {t.historyTitle}
          </span>
          <div className="flex items-center">
            {history.length > 0 && (
              <button onClick={() => setShowConfirm(true)}
                className={`text-xs px-2 transition-colors ${th.sidebarClearBtn}`}>
                {t.historyClear}
              </button>
            )}
            <button onClick={onToggle}
              className={`w-10 h-10 flex items-center justify-center text-sm leading-none border-l transition-colors ${th.cardHeaderBorder} ${th.sidebarToggleBtn}`}
              title="Collapse">
              <span className="pb-0.5">‹</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={onToggle}
            title="Expand"
            className={`w-10 h-10 flex items-center justify-center leading-none border-b ${th.cardHeaderBorder} ${th.sidebarToggleBtn} transition-colors`}>
            <span className="pb-0.5">›</span>
          </button>
          <button
            onClick={onNewAnalysis}
            title={t.newAnalysis}
            className={`w-10 h-10 flex items-center justify-center text-lg leading-none border-b ${th.cardHeaderBorder} ${th.sidebarToggleBtn} transition-colors`}>
            +
          </button>
        </>
      )}

      {open && (
        <div className="flex-1 overflow-y-auto">
          {/* New Analysis top entry */}
          <div
            onClick={onNewAnalysis}
            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b ${th.cardHeaderBorder} ${th.sidebarItem}`}>
            <span className={`text-sm font-medium ${th.sidebarCompany}`}>+ {t.newAnalysis}</span>
          </div>
          {history.length === 0 ? (
            <p className={`text-xs px-4 py-6 text-center ${th.sidebarEmpty}`}>{t.historyEmpty}</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id}
                className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  entry.id === activeId ? th.sidebarItemActive : th.sidebarItem
                }`}
                onClick={() => onSelect(entry)}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${th.sidebarCompany}`}>{entry.company}</p>
                  <p className={`text-[11px] ${th.sidebarMeta}`}>{fmt(entry.timestamp)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0 ${th.sidebarDeleteBtn}`}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Workflow Step Cards
// ---------------------------------------------------------------------------
function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-cap-blue flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function StatusIcon({ status }) {
  if (status === 'loading') return <Spinner />
  if (status === 'done')    return <span className="text-green-500 text-xl font-bold leading-none flex-shrink-0">✓</span>
  if (status === 'error')   return <span className="text-red-500 text-xl font-bold leading-none flex-shrink-0">✗</span>
  return <span className={`text-xl leading-none flex-shrink-0 opacity-40`}>○</span>
}

function MarkdownContent({ content, th }) {
  const md = {
    h1: ({ children }) => <h1 className={`text-lg font-bold mt-4 mb-2 ${th.cardTitle}`}>{children}</h1>,
    h2: ({ children }) => <h2 className={`text-base font-bold mt-4 mb-2 ${th.cardTitle}`}>{children}</h2>,
    h3: ({ children }) => <h3 className={`text-sm font-semibold mt-3 mb-1 ${th.cardTitle}`}>{children}</h3>,
    p:  ({ children }) => <p className={`text-sm leading-relaxed mb-2 ${th.cardText}`}>{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className={`list-disc list-inside text-sm mb-2 space-y-0.5 ${th.cardText}`}>{children}</ul>,
    ol: ({ children }) => <ol className={`list-decimal list-inside text-sm mb-2 space-y-0.5 ${th.cardText}`}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ inline, children }) => inline
      ? <code className="px-1 py-0.5 rounded text-xs font-mono bg-black/10">{children}</code>
      : <pre className="p-3 rounded-lg text-xs font-mono overflow-x-auto bg-black/10 mb-2"><code>{children}</code></pre>,
    hr: () => <hr className="my-3 border-current opacity-20" />,
    table: ({ children }) => (
      <div className="overflow-x-auto mb-3">
        <table className={`w-full text-sm border-collapse ${th.cardText}`}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className={`${th.cardTitle} font-semibold`}>{children}</thead>,
    th: ({ children }) => <th className={`text-left px-3 py-2 border-b text-xs uppercase tracking-wider ${th.cardHeaderBorder}`}>{children}</th>,
    td: ({ children }) => <td className={`px-3 py-2 border-b text-sm ${th.cardHeaderBorder}`}>{children}</td>,
  }
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={md}>
      {content}
    </ReactMarkdown>
  )
}

function DetailModal({ title, content, onClose, th }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden ${th.setupCard}`}
        onClick={(e) => e.stopPropagation()}>
        <div className={`h-1 bg-cap-blue`} />
        <div className={`flex items-center justify-between px-5 py-3 border-b ${th.cardHeaderBorder}`}>
          <span className={`text-sm font-semibold uppercase tracking-widest ${th.sectionLabel}`}>{title}</span>
          <button onClick={onClose} className={`text-lg leading-none transition-colors ${th.sidebarToggleBtn}`}>✕</button>
        </div>
        <div className="overflow-y-auto p-5">
          <MarkdownContent content={content} th={th} />
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, status, error, waitingText, th, onClick }) {
  const clickable = (status === 'done' || status === 'error') && onClick
  const leftBorder =
    status === 'done'    ? 'border-l-[3px] border-l-green-500' :
    status === 'error'   ? 'border-l-[3px] border-l-red-500' :
    status === 'loading' ? 'border-l-[3px] border-l-cap-blue' :
                           'border-l-[3px] border-l-gray-600'
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 ${leftBorder} shadow-sm ${th.card} ${
        clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.012] hover:brightness-110' : ''
      }`}
      onClick={clickable ? onClick : undefined}>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs font-semibold uppercase tracking-widest ${th.sectionLabel}`}>{title}</span>
          <StatusIcon status={status} />
        </div>
        {status === 'error' && error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        {status === 'waiting' && waitingText && (
          <p className={`text-xs mt-3 italic opacity-50 ${th.cardText}`}>{waitingText}</p>
        )}
      </div>
    </div>
  )
}

function parseInline(text) {
  const parts = []
  const regex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(https?:\/\/\S+)/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    if (m[1] !== undefined) {
      parts.push({ text: m[1] || m[2], link: m[2], color: '#0052CC' })
    } else if (m[3] !== undefined) {
      parts.push({ text: m[3], bold: true })
    } else if (m[4] !== undefined) {
      parts.push({ text: m[4], italics: true })
    } else {
      const url = m[5]
      parts.push({ text: url.length > 35 ? url.slice(0, 35) + '…' : url, link: url, color: '#0052CC' })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  if (parts.length === 0) return text
  if (parts.length === 1 && !parts[0].bold && !parts[0].italics && !parts[0].link) return parts[0].text
  return parts
}

function markdownToPdf(markdown) {
  const items = []
  const lines = markdown.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^---+$/.test(line.trim())) { items.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 505, y2: 0, lineWidth: 0.5, lineColor: '#D1D5DB' }], margin: [0, 6, 0, 6] }); i++; continue }
    if (line.startsWith('# '))  { items.push({ text: parseInline(line.slice(2).trim()),  style: 'h1' }); i++; continue }
    if (line.startsWith('## ')) { items.push({ text: parseInline(line.slice(3).trim()),  style: 'h2' }); i++; continue }
    if (line.startsWith('### ')){ items.push({ text: parseInline(line.slice(4).trim()),  style: 'h3' }); i++; continue }
    if (line.trim().startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++ }
      const isSep = l => /^\|[\s\-:|]+\|/.test(l)
      const parseRow = l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const dataRows = rows.filter(l => !isSep(l))
      const hasHeader = rows.length > 1 && isSep(rows[1])
      if (dataRows.length > 0) {
        const ncols = parseRow(dataRows[0]).length
        const cellFontSize = ncols >= 6 ? 7 : ncols >= 5 ? 7.5 : 9
        const cellPad = ncols >= 5 ? [2, 3, 2, 3] : [4, 4, 4, 4]
        const cleanCell = (s) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
        const body = dataRows.map((l, ri) =>
          parseRow(l).map(cell => ({
            text: parseInline(cleanCell(cell)), fontSize: cellFontSize, margin: cellPad,
            bold: ri === 0 && hasHeader, color: ri === 0 && hasHeader ? '#0A1628' : '#374151',
            fillColor: ri === 0 && hasHeader ? '#EEF3F7' : ri % 2 === 1 ? '#F9FAFB' : '#FFFFFF',
          }))
        )
        items.push({
          table: { headerRows: hasHeader ? 1 : 0, widths: Array(ncols).fill('*'), body },
          layout: { hLineWidth: (j, n) => j === 0 || j === n.table.body.length ? 0.8 : 0.4, vLineWidth: () => 0.4, hLineColor: () => '#D1D5DB', vLineColor: () => '#D1D5DB' },
          margin: [0, 6, 0, 10],
        })
      }
      continue
    }
    if (/^[-*+] /.test(line)) {
      const bullets = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) { bullets.push(parseInline(lines[i].replace(/^[-*+] /, ''))); i++ }
      items.push({ ul: bullets, style: 'list', margin: [0, 2, 0, 8] })
      continue
    }
    if (/^\d+\. /.test(line)) {
      const nums = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { nums.push(parseInline(lines[i].replace(/^\d+\. /, ''))); i++ }
      items.push({ ol: nums, style: 'list', margin: [0, 2, 0, 8] })
      continue
    }
    if (line.trim()) { items.push({ text: parseInline(line.trim()), style: 'p' }) }
    i++
  }
  return items
}

function WorkflowCards({ steps, t, th, initialSummary, onSaveSummary, companyName }) {
  const [modal, setModal] = useState(null) // { title, content }
  const [summary, setSummary] = useState(initialSummary ?? null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(!!initialSummary)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleSummarize = async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: steps.synthesis.data }),
      })
      const data = await res.json()
      setSummary(data.summary)
      setShowSummary(true)
      onSaveSummary?.(data.summary)
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleExportPDF = async () => {
    setPdfLoading(true)
    try {
      const content = showSummary ? summary : steps.synthesis.data
      const label = (showSummary ? t.summaryLabel : 'Business Value Analysis').toUpperCase()
      const bandH = 44
      let logoSvg = null
      try {
        const resp = await fetch('/logo_white.svg')
        if (resp.ok) logoSvg = await resp.text()
      } catch (_) { /* Logo bleibt weg wenn nicht ladbar */ }
      const docDef = {
        pageSize: 'A4', pageMargins: [45, bandH + 14, 45, 45],
        header: (_page, _count, size) => [
          { canvas: [{ type: 'rect', x: 0, y: 0, w: size.width, h: bandH, color: '#0A1628' }] },
          ...(logoSvg ? [{ svg: logoSvg, width: 95, absolutePosition: { x: 45, y: 12 } }] : [
            { text: 'Capgemini', bold: true, fontSize: 9, color: '#94A3B8', characterSpacing: 1.5, absolutePosition: { x: 45, y: 15 } },
          ]),
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 0, y2: 18, lineWidth: 0.5, lineColor: '#334155' }], absolutePosition: { x: 155, y: 13 } },
          { text: 'ICAT', bold: true, fontSize: 14, color: '#FFFFFF', characterSpacing: 3, absolutePosition: { x: 163, y: 11 } },
          { text: 'Intelligent Client Analysis Tool', fontSize: 6.5, color: '#60A5FA', characterSpacing: 0.5, absolutePosition: { x: 163, y: 26 } },
        ],
        footer: (page, count) => ({ text: `${page} / ${count}`, alignment: 'right', fontSize: 8, color: '#9CA3AF', margin: [0, 0, 45, 0] }),
        content: [
          { text: companyName || '', style: 'docTitle' },
          { text: label, style: 'docLabel' },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 50, y2: 0, lineWidth: 1.5, lineColor: '#0052CC' }], margin: [0, 4, 0, 18] },
          ...markdownToPdf(content),
        ],
        styles: {
          docTitle: { fontSize: 22, bold: true, color: '#0A1628', margin: [0, 0, 0, 4] },
          docLabel: { fontSize: 8, color: '#60A5FA' },
          h1: { fontSize: 16, bold: true, color: '#0A1628', margin: [0, 14, 0, 5] },
          h2: { fontSize: 13, bold: true, color: '#0A1628', margin: [0, 12, 0, 4] },
          h3: { fontSize: 11, bold: true, color: '#0A1628', margin: [0, 10, 0, 3] },
          p: { fontSize: 10, color: '#374151', lineHeight: 1.6, margin: [0, 0, 0, 7] },
          list: { fontSize: 10, color: '#374151', lineHeight: 1.5 },
        },
        defaultStyle: { font: 'Roboto' },
      }
      pdfMake.createPdf(docDef).download(`${(companyName || 'export').replace(/[^a-zA-Z0-9]/g, '_')}_ICAT.pdf`)
    } finally { setPdfLoading(false) }
  }

  const d1 = steps.dimensions_1
  const d2 = steps.dimensions_2
  const dimDone  = d1.status === 'done' && d2.status === 'done'
  const dimError = (d1.status === 'error' || d2.status === 'error') && d1.status !== 'loading' && d2.status !== 'loading'
  const dimStatus = dimDone ? 'done' : dimError ? 'error' : 'loading'
  const dimErrorMsg = d1.error || d2.error
  const dimContent = dimDone ? (d1.data || '') + (d2.data ? '\n\n---\n\n' + d2.data : '') : ''

  return (
    <>
      {modal && <DetailModal title={modal.title} content={modal.content} onClose={() => setModal(null)} th={th} />}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <StepCard
            title={t.stepDimensions} status={dimStatus} error={dimErrorMsg} th={th}
            onClick={dimDone ? () => setModal({ title: t.stepDimensions, content: dimContent })
              : dimStatus === 'error' ? () => setModal({ title: t.stepDimensions, content: dimErrorMsg || '–' })
              : undefined}
          />
          <StepCard
            title={t.stepFinancial} status={steps.financial.status} error={steps.financial.error} th={th}
            onClick={steps.financial.status === 'done' ? () => setModal({ title: t.stepFinancial, content: steps.financial.data })
              : steps.financial.status === 'error' ? () => setModal({ title: t.stepFinancial, content: steps.financial.error || '–' })
              : undefined}
          />
        </div>

        {/* Flow connectors */}
        <div className="grid grid-cols-2 gap-4">
          {[false, true].map((sky, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 opacity-30">
              <div className={`w-px h-4 ${sky ? 'bg-cap-sky' : 'bg-cap-blue'}`} />
              <svg width="9" height="6" viewBox="0 0 9 6" fill="none" className={sky ? 'text-cap-sky' : 'text-cap-blue'}>
                <path d="M0 0L4.5 6L9 0Z" fill="currentColor" />
              </svg>
            </div>
          ))}
        </div>

        <StepCard
          title={t.stepSynthesis} status={steps.synthesis.status} error={steps.synthesis.error} waitingText={t.stepWaiting} th={th}
          onClick={steps.synthesis.status === 'error' ? () => setModal({ title: t.stepSynthesis, content: steps.synthesis.error || '–' }) : undefined}
        />

        {/* BVA result — prominent output card */}
        {steps.synthesis.status === 'done' && steps.synthesis.data && (
          <div className={`rounded-xl overflow-hidden ring-1 ring-cap-blue/25 shadow-lg shadow-cap-blue/5 ${th.card}`}>
            <div className={`flex items-center justify-between px-5 py-3 border-b ${th.cardHeaderBorder}`}>
              <span className={`text-xs font-semibold uppercase tracking-widest ${th.cardTitle}`}>
                {t.stepSynthesis}
              </span>
              <div className="flex items-center gap-2">
                {summary ? (
                  <div className={`flex rounded-lg border overflow-hidden ${th.toggleBorder}`}>
                    <button
                      onClick={() => setShowSummary(false)}
                      className={`text-xs px-3 py-1 font-medium transition-colors ${!showSummary ? th.toggleActive : th.toggleInactive}`}>
                      {t.originalLabel}
                    </button>
                    <button
                      onClick={() => setShowSummary(true)}
                      className={`text-xs px-3 py-1 font-medium transition-colors ${showSummary ? th.toggleActive : th.toggleInactive}`}>
                      {t.summaryLabel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSummarize}
                    disabled={summaryLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-cap-blue hover:bg-cap-navy disabled:opacity-50 text-white">
                    {summaryLoading ? t.summarizingBtn : t.summarizeBtn}
                  </button>
                )}
                <button
                  onClick={handleExportPDF}
                  disabled={pdfLoading}
                  title="Export PDF"
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border disabled:opacity-50 ${th.toggleBorder} ${th.toggleInactive}`}>
                  {pdfLoading ? '…' : 'PDF'}
                </button>
              </div>
            </div>
            <div className="p-6">
              <MarkdownContent content={showSummary ? summary : steps.synthesis.data} th={th} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Setup Screen
// ---------------------------------------------------------------------------
function SetupScreen({ onSaved, onCancel, initialConfig, th, theme, onToggleTheme, lang, onChangeLang, t }) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...initialConfig })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const hasExisting = !!onCancel  // onCancel only exists when config was saved before

  const handleSave = async () => {
    if (!form.api_key.trim() && !hasExisting) { setError(t.errApiKey); return }
    if (form.provider === 'azure' && !form.endpoint.trim()) { setError(t.errEndpoint); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) onSaved()
      else setError(t.errSave)
    } catch { setError(t.errConnect) } finally { setSaving(false) }
  }

  const inputClass = `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${th.input}`

  return (
    <div className={`min-h-screen flex flex-col ${th.page}`}>
      <header className={`px-8 py-4 flex items-center justify-between ${th.header}`}>
        <Logo th={th} />
        <HeaderControls theme={theme} onToggleTheme={onToggleTheme} lang={lang} onChangeLang={onChangeLang} th={th} t={t} />
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`rounded-xl shadow-sm w-full max-w-lg overflow-hidden ${th.setupCard}`}>
          <div className="h-1 bg-cap-blue" />
          <div className="p-8">
            <h2 className={`text-xl font-semibold mb-1 ${th.formTitle}`}>{t.setupTitle}</h2>
            <p className={`text-sm mb-6 ${th.formSubtitle}`}>{t.setupSubtitle}</p>

            <Field label={t.providerLabel} required th={th}>
              <div className={`flex rounded-lg border overflow-hidden ${th.toggleBorder}`}>
                {['openai', 'azure'].map((p) => (
                  <button key={p} onClick={() => set('provider', p)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.provider === p ? th.toggleActive : th.toggleInactive
                    }`}>
                    {p === 'openai' ? 'OpenAI' : 'Azure OpenAI'}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t.apiKeyLabel} required={!hasExisting} th={th}>
              <input type="password" value={form.api_key} onChange={(e) => set('api_key', e.target.value)}
                placeholder={hasExisting ? t.apiKeyPlaceholderExisting : 'sk-...'} className={inputClass} />
            </Field>

            <Field label={form.provider === 'azure' ? t.endpointAzureLabel : t.endpointOptLabel}
              required={form.provider === 'azure'} th={th}>
              <input type="text" value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)}
                placeholder={form.provider === 'azure' ? 'https://<resource>.openai.azure.com' : t.endpointOptPlaceholder}
                className={inputClass} />
            </Field>


            {form.provider === 'azure' && (
              <Field label={t.apiVersionLabel} th={th}>
                <input type="text" value={form.api_version} onChange={(e) => set('api_version', e.target.value)}
                  placeholder="2025-04-01-preview" className={inputClass} />
              </Field>
            )}

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button onClick={handleSave} disabled={saving}
              className="w-full mt-2 bg-cap-blue hover:bg-cap-navy disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
              {saving ? t.savingBtn : t.saveBtn}
            </button>
            {onCancel && (
              <button onClick={onCancel}
                className={`w-full mt-2 text-sm font-medium py-2.5 rounded-lg transition-colors ${th.headerBtn}`}>
                {t.cancelBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
function MainApp({ onOpenSettings, th, theme, onToggleTheme, lang, onChangeLang, t }) {
  const [history, setHistory] = useState(loadHistory)

  // Restored once on mount via lazy initializer
  const [restoredEntry] = useState(() => {
    try {
      const savedId = Number(localStorage.getItem(ACTIVE_KEY))
      if (!savedId) return null
      return loadHistory().find(e => e.id === savedId) || null
    } catch { return null }
  })

  // Check for an in-progress job that should be reconnected to
  const [pendingJob] = useState(() => {
    try {
      const job = JSON.parse(localStorage.getItem(JOB_KEY) || 'null')
      if (!job) return null
      const entry = loadHistory().find(e => e.id === job.entry_id)
      if (!entry || entry.synthesis) return null  // already done or gone
      return job
    } catch { return null }
  })

  const [companyName, setCompanyName] = useState(() => restoredEntry?.company ?? '')
  const [steps, setSteps] = useState(() => {
    if (!restoredEntry) return null
    if (pendingJob && pendingJob.entry_id === restoredEntry.id) return stepsFromPendingEntry(restoredEntry)
    return stepsFromEntry(restoredEntry)
  })
  const [activeId, setActiveId] = useState(() => restoredEntry?.id ?? null)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [activeId])

  // On mount: reconnect to a job that was still running when the page was last reloaded
  useEffect(() => {
    if (!pendingJob || !restoredEntry) return
    const { job_id, entry_id } = pendingJob
    const updateHistory = (key, value) => {
      setHistory(prev => {
        const updated = prev.map(e => e.id === entry_id ? { ...e, [key]: value } : e)
        saveHistory(updated)
        return updated
      })
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/job/${job_id}/stream`)
        if (!res.ok) {
          // Job gone (server restarted) — show saved state with errors for nulls
          localStorage.removeItem(JOB_KEY)
          setSteps(stepsFromEntry(restoredEntry))
          return
        }
        await readJobStream(res, updateHistory, setSteps)
        localStorage.removeItem(JOB_KEY)
      } catch {
        localStorage.removeItem(JOB_KEY)
        setSteps(stepsFromEntry(restoredEntry))
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showInput = steps === null

  const handleRun = async () => {
    if (!companyName.trim()) return
    setError('')
    setSteps({
      dimensions_1: { status: 'loading', data: null, error: null },
      dimensions_2: { status: 'loading', data: null, error: null },
      financial:    { status: 'loading', data: null, error: null },
      synthesis:    { status: 'waiting', data: null, error: null },
    })

    // Save entry immediately so it persists regardless of outcome
    const entryId = Date.now()
    const baseEntry = {
      id: entryId, company: companyName.trim(), timestamp: new Date().toISOString(),
      dimensions_1: null, dimensions_2: null, financial_webscraper: null, synthesis: null, synthesis_summary: null,
    }
    setHistory(prev => { const updated = [baseEntry, ...prev].slice(0, MAX_HISTORY); saveHistory(updated); return updated })
    setActiveId(entryId)

    const updateHistory = (key, value) => {
      setHistory(prev => {
        const updated = prev.map(e => e.id === entryId ? { ...e, [key]: value } : e)
        saveHistory(updated)
        return updated
      })
    }

    try {
      // Single request: starts background job and streams results.
      // First event contains job_id for reload recovery.
      const res = await fetch('/api/run/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t.errGeneric)
      }

      const onJobId = (job_id) => {
        localStorage.setItem(JOB_KEY, JSON.stringify({ job_id, entry_id: entryId }))
      }
      await readJobStream(res, updateHistory, setSteps, onJobId)
      localStorage.removeItem(JOB_KEY)
    } catch (e) {
      setError(e.message || t.errGeneric)
    }
  }

  const updateActiveHistory = (key, value) => {
    if (!activeId) return
    setHistory(prev => {
      const updated = prev.map(e => e.id === activeId ? { ...e, [key]: value } : e)
      saveHistory(updated)
      return updated
    })
  }

  const selectHistory = (entry) => {
    setCompanyName(entry.company)
    setSteps(stepsFromEntry(entry))
    setActiveId(entry.id); setError('')
  }

  const deleteEntry = (id) => {
    const updated = history.filter((e) => e.id !== id)
    setHistory(updated); saveHistory(updated)
    if (id === activeId) { setSteps(null); setActiveId(null) }
  }

  const clearHistory = () => {
    setHistory([]); saveHistory([]); setSteps(null); setActiveId(null)
    localStorage.removeItem(JOB_KEY)
  }

  const handleNewAnalysis = () => {
    setSteps(null); setCompanyName(''); setActiveId(null); setError('')
    localStorage.removeItem(JOB_KEY)
  }

  return (
    <div className={`h-screen flex flex-col ${th.page}`}>
      <header className={`flex-shrink-0 px-8 py-4 flex items-center justify-between ${th.header}`}>
        <Logo th={th} />
        <div className="flex items-center gap-6">
          <HeaderControls theme={theme} onToggleTheme={onToggleTheme} lang={lang} onChangeLang={onChangeLang} th={th} t={t} />
          <button onClick={onOpenSettings}
            className={`text-xs font-medium transition-colors tracking-widest uppercase ${th.headerBtn}`}>
            {t.settingsBtn}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <HistorySidebar
          history={history} activeId={activeId}
          onSelect={selectHistory} onDelete={deleteEntry} onClear={clearHistory}
          onNewAnalysis={handleNewAnalysis}
          th={th} t={t} open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)}
        />

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">

            {/* Company name heading — shown once analysis started */}
            {!showInput && companyName && (
              <div className="mb-8">
                <p className={`text-[10px] uppercase tracking-[0.2em] font-semibold mb-1 opacity-50 ${th.cardText}`}>Client Analysis</p>
                <h1 className={`text-4xl font-bold tracking-tight ${th.cardTitle}`}>{companyName}</h1>
                <div className="mt-3 h-px w-16 bg-cap-blue rounded-full opacity-60" />
              </div>
            )}

            {/* Input card — only when no result and not loading */}
            {showInput && (
              <div className={`rounded-xl shadow-sm overflow-hidden mb-6 ${th.card}`}>
                <div className="h-1 bg-cap-sky" />
                <div className="p-6">
                  <label className={`block text-xs font-semibold mb-3 uppercase tracking-widest ${th.sectionLabel}`}>
                    {t.inputLabel}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text" value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                      placeholder={t.inputPlaceholder}
                      className={`flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${th.input}`}
                    />
                    <button onClick={handleRun} disabled={!companyName.trim()}
                      className="bg-cap-blue hover:bg-cap-navy disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap">
                      {t.runBtn}
                    </button>
                  </div>
                  {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
                </div>
              </div>
            )}

            {/* Workflow cards */}
            {steps && <WorkflowCards key={activeId} steps={steps} t={t} th={th}
              companyName={companyName}
              initialSummary={history.find(e => e.id === activeId)?.synthesis_summary ?? null}
              onSaveSummary={(s) => updateActiveHistory('synthesis_summary', s)} />}

            {/* Error (fetch-level failure) */}
            {!showInput && !steps && error && (
              <div className="py-16 text-center">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className={`flex-shrink-0 px-8 py-3 ${th.footer}`}>
        <p className={`text-xs text-center ${th.footerText}`}>{t.footer}</p>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function App() {
  const [status, setStatus] = useState(null)
  const [savedConfig, setSavedConfig] = useState({})
  const [hasConfig, setHasConfig] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('icat-theme') || 'dark')
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en')

  const th = THEMES[theme]
  const t = LANGS[lang]

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); localStorage.setItem('icat-theme', next)
  }

  const changeLang = (l) => { setLang(l); localStorage.setItem(LANG_KEY, l) }

  useEffect(() => {
    fetch('/api/config/status')
      .then((r) => r.json())
      .then((data) => {
        setSavedConfig({ provider: data.provider, endpoint: data.endpoint, api_version: data.api_version })
        setHasConfig(data.has_key)
        setStatus(data.has_key ? 'ready' : 'setup')
      })
      .catch(() => setStatus('setup'))
  }, [])

  if (status === null) {
    return <div className="min-h-screen bg-cap-navy flex items-center justify-center"><Logo th={THEMES.dark} /></div>
  }

  if (status === 'setup') {
    return (
      <SetupScreen
        onSaved={() => { setHasConfig(true); setStatus('ready') }}
        onCancel={hasConfig ? () => setStatus('ready') : undefined}
        initialConfig={savedConfig}
        th={th} theme={theme} onToggleTheme={toggleTheme} lang={lang} onChangeLang={changeLang} t={t} />
    )
  }

  return (
    <MainApp onOpenSettings={() => setStatus('setup')}
      th={th} theme={theme} onToggleTheme={toggleTheme} lang={lang} onChangeLang={changeLang} t={t} />
  )
}
