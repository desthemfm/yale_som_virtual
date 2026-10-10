import { useMemo } from 'react'
import * as THREE from 'three'
import Professor, { PROFESSORS } from './Professor.jsx'
import { DRUMS, LECTERNS } from './layout.js'

// which professor teaches in which classroom (matches the slide decks).
// 'zaman' (MGT 409, Evans 2200 per the course database) and 'schott' (MGT 407) are real professors
// you can chat with; App.jsx draws them, so Faculty only adds their name plaques.
export const ROOM_PROFESSOR = {
  2400: 'dumbledore', // MGT 402 Basics of Accounting
  2410: 'mcgonagall', // MGT 404 Basics of Economics
  2420: 'trelawney', // MGT 403 Probability Modeling & Statistics
  2430: 'slughorn', // MGT 887 Negotiations
  2200: 'zaman', // MGT 409 AI Foundations for Managers
  2210: 'schott', // MGT 407 Statistics (EMBA), drawn by Schott.jsx
  2220: 'moody', // MGT 800 Crisis Management in Tech
  2230: 'flitwick', // MGT 541 Corporate Finance
}

function plaqueTex(name) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#c9a44a'
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = '#2a1d0c'
  g.fillRect(8, 8, 496, 112)
  g.fillStyle = '#f3dfa8'
  g.font = 'bold 44px Georgia, serif'
  g.textAlign = 'center'
  g.fillText(`Prof. ${name.split(' ').slice(-1)[0]}`, 256, 80)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const NAMES = { zaman: 'Tauhid Zaman', schott: 'Peter Schott' }

// where the professor stands in a classroom: front of the room, facing the seats
export function professorSpot(roomId) {
  const { fc, back, t, half, rot } = DRUMS.find((d) => d.id === roomId).front
  return { pos: [fc[0] + back[0] * 1.15 - t[0] * half * 0.3, 0, fc[1] + back[1] * 1.15 - t[1] * half * 0.3], rot }
}

export default function Faculty() {
  const items = useMemo(
    () =>
      DRUMS.map((d, i) => {
        const who = ROOM_PROFESSOR[d.id]
        const { back, rot } = d.front
        const lec = LECTERNS[i]
        return {
          who,
          ...professorSpot(d.id),
          plaque: { p: [lec.x + back[0] * 0.26, 0.85, lec.z + back[1] * 0.26], rot, mat: new THREE.MeshBasicMaterial({ map: plaqueTex(NAMES[who] ?? PROFESSORS[who].name) }) },
        }
      }),
    [],
  )
  return (
    <>
      {items.map((it, i) => (
        <group key={i}>
          {PROFESSORS[it.who] && <Professor who={it.who} position={it.pos} rotation={it.rot} phase={i * 1.7} />}
          <mesh position={it.plaque.p} rotation={[0, it.plaque.rot, 0]} material={it.plaque.mat}>
            <planeGeometry args={[0.6, 0.15]} />
          </mesh>
        </group>
      ))}
      {/* Hagrid keeps an eye on the Labubus in the courtyard */}
      <Professor who="hagrid" position={[-10.5, -5, -2]} rotation={Math.PI / 2} />
    </>
  )
}
