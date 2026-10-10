import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import Zaman from './Zaman.jsx'
import Schott from './Schott.jsx'
import Chat from './Chat.jsx'
import { professorSpot } from './Faculty.jsx'
import { EYE, SPAWN } from './layout.js'

// professors you can walk up to and chat with; id matches the backend (backend/app/db.py slugify)
const CHAT_PROFS = [
  { id: 'tauhid-zaman', name: 'Prof. Tauhid Zaman', short: 'Prof. Zaman', course: 'MGT 409 · Evans 2200', Body: Zaman, ...professorSpot('2200') },
  { id: 'peter-schott', name: 'Prof. Peter Schott', short: 'Prof. Schott', course: 'MGT 407 Statistics · Evans 2210', Body: Schott, ...professorSpot('2210') },
]

// stable per-professor callbacks so each figure's click listener isn't rebuilt every render
function ChatProf({ prof, chatWith, talkUntil, setAimed, openChat }) {
  const { Body, id } = prof
  const onAim = useCallback((on) => setAimed((cur) => (on ? id : cur === id ? null : cur)), [id, setAimed])
  const onTalk = useCallback(() => openChat(id), [id, openChat])
  return <Body position={prof.pos} rotation={prof.rot} chatting={chatWith === id} talkUntil={talkUntil} onAim={onAim} onTalk={onTalk} />
}

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn
  // chatting with a professor: aim the crosshair at them and click (or tap Talk)
  const [aimed, setAimed] = useState(null) // professor id under the crosshair
  const [chatWith, setChatWith] = useState(null) // professor id whose chat is open
  const chatOpen = chatWith !== null
  const [convos, setConvos] = useState({}) // id -> { sessionId, messages }
  const talkUntil = useRef(0)
  const openChat = useCallback((id) => {
    document.exitPointerLock?.()
    talkUntil.current = 0
    setChatWith(id)
  }, [])
  const closeChat = useCallback((relock) => {
    setChatWith(null)
    if (relock && !touchRef.current.active) lockRef.current?.() // needs a click; Esc just shows the walk-in card
  }, [])
  const onReply = useCallback((reply) => {
    talkUntil.current = performance.now() + Math.min(9000, 1200 + reply.length * 45) // mouth moves for about as long as reading it takes
  }, [])
  useEffect(() => {
    if (touchOn) document.body.dataset.touch = '1'
    else delete document.body.dataset.touch
  }, [touchOn])
  useEffect(() => {
    const k = (e) => e.code === 'KeyM' && !e.target.closest?.('input, textarea') && setShowMap((v) => !v)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const aimedProf = CHAT_PROFS.find((p) => p.id === aimed)
  const chatProf = CHAT_PROFS.find((p) => p.id === chatWith)

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World />
        {CHAT_PROFS.map((p) => (
          <ChatProf key={p.id} prof={p} chatWith={chatWith} talkUntil={talkUntil} setAimed={setAimed} openChat={openChat} />
        ))}
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
      </Canvas>

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      <div className={showMap ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      {playing && !chatOpen && <div className={aimedProf ? 'crosshair on' : 'crosshair'} />}
      {playing && !chatOpen && aimedProf && (
        <div className="talkhint">
          {touchOn ? (
            <button className="go" onClick={() => openChat(aimedProf.id)}>
              Talk to {aimedProf.short}
            </button>
          ) : (
            <span>
              <b>Click</b> to talk to {aimedProf.short}
            </span>
          )}
        </div>
      )}
      {touchOn && !chatOpen && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}
      {chatProf && (
        <Chat
          key={chatProf.id}
          professor={chatProf}
          convo={convos[chatProf.id] ?? { sessionId: null, messages: [] }}
          setConvo={(f) => setConvos((all) => ({ ...all, [chatProf.id]: f(all[chatProf.id] ?? { sessionId: null, messages: [] }) }))}
          onReply={onReply}
          onClose={closeChat}
        />
      )}

      {!playing && !chatOpen && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Floor 2</h1>
            <p className="sub">Classroom drums, the cloister, Ross Library, the Beinecke Terrace Room, and the courtyard.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
