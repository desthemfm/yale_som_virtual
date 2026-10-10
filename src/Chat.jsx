import { useEffect, useRef, useState } from 'react'

// Chat window for talking to a professor agent on the FastAPI backend (backend/).
// In dev, Vite proxies /api to localhost:8000; a deployed build sets VITE_API_URL.
const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const STARTERS = ['What room do you teach in?', 'Explain the central limit theorem', 'Who teaches the core stats class?']

export default function Chat({ professor, convo, setConvo, onReply, onClose }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef()
  const log = useRef()

  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [convo.messages, busy])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function send(message) {
    const msg = message.trim()
    if (!msg || busy) return
    setText('')
    setError('')
    setBusy(true)
    setConvo((c) => ({ ...c, messages: [...c.messages, { role: 'user', text: msg }] }))
    try {
      const res = await fetch(`${API}/api/professors/${professor.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: convo.sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `The server answered ${res.status}.`)
      setConvo((c) => ({ sessionId: data.session_id, messages: [...c.messages, { role: 'prof', text: data.reply }] }))
      onReply(data.reply)
    } catch (e) {
      setError(e instanceof TypeError ? "Can't reach the professor server. Is the backend running on port 8000?" : e.message)
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  return (
    <aside className="chat" role="dialog" aria-label={`Chat with ${professor.name}`}>
      <header className="chat-head">
        <div>
          <div className="kicker">{professor.course}</div>
          <h2>{professor.name}</h2>
        </div>
        <button className="chat-close" onClick={() => onClose(true)} aria-label="Close chat and keep walking">
          ✕
        </button>
      </header>

      <div className="chat-log" ref={log} aria-live="polite">
        {convo.messages.length === 0 && (
          <div className="chat-empty">
            <p>Ask about the course, stats, regression, or any class at SOM.</p>
            <div className="chips">
              {STARTERS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {convo.messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="bubble prof typing" aria-label={`${professor.name} is typing`}>
            <span />
            <span />
            <span />
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {professor.name}
        </label>
        <input
          id="chat-input"
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${professor.name.split(' ')[0]}…`}
          maxLength={2000}
          autoComplete="off"
        />
        <button className="go" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
      <div className="chat-foot">Esc or ✕ to keep walking</div>
    </aside>
  )
}
