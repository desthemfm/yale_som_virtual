import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Labubu from './Labubu.jsx'
import { B, BOX, CAP, CYL, SPH, TORSO, TORUS, canvasTex, m, useTalkingProf } from './talkingProf.js'

// Professor Tauhid Zaman (MGT 409): black BLACKPINK hoodie, jeans, white sneakers, nerd glasses,
// and a pink Labubu keychain swinging from his belt loop. Built from primitives like Professor.jsx.
// Figure faces +z; his own right hand is at -x.
// Behavior (turning to face you, talking, click-to-chat) comes from useTalkingProf.

const SKIN = '#c58c62' // light brown
const HAIR = '#121014'
const HOODIE = '#141417'
const PINK = '#ff4fa3'
const JEANS = '#2d4566'

function printTex() {
  return canvasTex(512, 128, (g) => {
    g.fillStyle = PINK
    g.font = '900 86px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('BLACKPINK', 256, 68)
  })
}

export default function Zaman({ position, rotation = 0, chatting = false, talkUntil, onAim, onTalk }) {
  const charm = useRef()
  const print = useMemo(() => new THREE.MeshBasicMaterial({ map: printTex(), transparent: true }), [])
  const { root, head, mouth, armL, armR } = useTalkingProf({
    position,
    rotation,
    chatting,
    talkUntil,
    onAim,
    onTalk,
    extra: (t) => {
      charm.current.rotation.z = Math.sin(t * 2.2) * 0.25
      charm.current.rotation.x = Math.sin(t * 1.7 + 0.5) * 0.15
    },
  })

  const skin = m(SKIN)
  const sleeve = m(HOODIE)
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      {/* white sneakers with pink soles */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={BOX} c="#f4f4f6" p={[0.1 * sx, 0.06, 0.04]} s={[0.12, 0.1, 0.28]} />
          <B g={BOX} c={PINK} p={[0.1 * sx, 0.012, 0.04]} s={[0.125, 0.025, 0.285]} />
        </group>
      ))}
      {/* jeans */}
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={JEANS} p={[0.1 * sx, 0.5, 0]} s={[0.082, 0.82, 0.085]} />
      ))}
      <B g={CYL} c={JEANS} p={[0, 0.86, 0]} s={[0.19, 0.12, 0.15]} />

      {/* hoodie: body, ribbed hem, pocket, BLACKPINK print, hood, pink drawstrings */}
      <mesh geometry={TORSO} material={sleeve} position={[0, 1.18, 0]} scale={[1, 1, 0.8]} />
      <B g={CYL} c="#0d0d10" p={[0, 0.86, 0]} s={[0.205, 0.06, 0.165]} />
      <B c={HOODIE} p={[0, 1.48, 0]} s={[0.27, 0.1, 0.17]} />
      <B g={BOX} c="#1d1d22" p={[0, 1.0, 0.163]} s={[0.25, 0.12, 0.012]} />
      <mesh material={print} position={[0, 1.3, 0.172]}>
        <planeGeometry args={[0.3, 0.075]} />
      </mesh>
      <B c={HOODIE} p={[0, 1.56, -0.1]} s={[0.17, 0.13, 0.11]} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={CYL} c={PINK} p={[0.05 * sx, 1.42, 0.17]} s={[0.006, 0.17, 0.006]} />
          <B g={CYL} c="#f4f4f6" p={[0.05 * sx, 1.33, 0.17]} s={[0.009, 0.025, 0.009]} />
        </group>
      ))}
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />

      {/* arms: hoodie sleeves, hands gesture while he talks */}
      <group ref={armL} position={[0.26, 1.46, 0]} rotation={[0, 0, 0.16]}>
        <mesh geometry={CAP} material={sleeve} position={[0, -0.24, 0]} scale={[0.068, 0.2, 0.068]} />
        <B g={CYL} c="#0d0d10" p={[0, -0.47, 0]} s={[0.06, 0.04, 0.06]} />
        <mesh geometry={SPH} material={skin} position={[0, -0.52, 0.02]} scale={[0.045, 0.055, 0.04]} />
      </group>
      <group ref={armR} position={[-0.26, 1.46, 0]} rotation={[0, 0, -0.16]}>
        <mesh geometry={CAP} material={sleeve} position={[0, -0.24, 0]} scale={[0.068, 0.2, 0.068]} />
        <B g={CYL} c="#0d0d10" p={[0, -0.47, 0]} s={[0.06, 0.04, 0.06]} />
        <mesh geometry={SPH} material={skin} position={[0, -0.52, 0.02]} scale={[0.045, 0.055, 0.04]} />
      </group>

      {/* head: short black hair, nerd glasses, friendly smile */}
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.7, 0]} s={[0.115, 0.135, 0.125]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.117 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
          ))}
          <B c={HAIR} p={[0, 1.775, -0.012]} s={[0.123, 0.085, 0.13]} />
          <B c={HAIR} p={[0.02, 1.805, 0.07]} r={[0.3, 0, -0.2]} s={[0.1, 0.04, 0.06]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={HAIR} p={[0.112 * sx, 1.74, -0.01]} s={[0.018, 0.05, 0.08]} />
          ))}
          {/* eyes + brows */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.044 * sx, 1.715, 0.108]} s={[0.02, 0.016, 0.012]} />
              <B c="#1d1410" p={[0.044 * sx, 1.715, 0.118]} s={[0.01, 0.011, 0.008]} />
              <B g={BOX} c={HAIR} p={[0.045 * sx, 1.752, 0.112]} r={[0, 0, -0.12 * sx]} s={[0.045, 0.011, 0.01]} />
            </group>
          ))}
          {/* glasses */}
          {[-1, 1].map((sx) => (
            <B key={sx} g={TORUS} c="#0b0b0d" p={[0.045 * sx, 1.715, 0.124]} s={[0.032, 0.026, 0.032]} />
          ))}
          <B g={BOX} c="#0b0b0d" p={[0, 1.718, 0.126]} s={[0.026, 0.006, 0.006]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c="#0b0b0d" p={[0.08 * sx, 1.72, 0.07]} s={[0.005, 0.006, 0.11]} />
          ))}
          <B c={SKIN} p={[0, 1.685, 0.125]} s={[0.02, 0.028, 0.022]} />
          <group ref={mouth} position={[0, 1.643, 0.116]}>
            <B g={BOX} c="#5a2420" p={[0, 0, 0]} s={[0.05, 0.008, 0.008]} />
          </group>
          <B g={BOX} c="#5a2420" p={[0.028, 1.648, 0.114]} r={[0, 0, 0.5]} s={[0.014, 0.006, 0.006]} />
          <B g={BOX} c="#5a2420" p={[-0.028, 1.648, 0.114]} r={[0, 0, -0.5]} s={[0.014, 0.006, 0.006]} />
        </group>
      </group>

      {/* Labubu keychain on the belt loop, swinging */}
      <group position={[0.17, 0.9, 0.11]}>
        <B g={TORUS} c="#c9ccd2" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, 0, 0]} r={[0, Math.PI / 2, 0]} s={[0.014, 0.014, 0.014]} />
        <group ref={charm}>
          <B g={CYL} c="#c9ccd2" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, -0.04, 0]} s={[0.003, 0.07, 0.003]} />
          <Labubu fur="#ff8fc4" expression="mischief" height={0.14} position={[0, -0.215, 0]} />
        </group>
      </group>
    </group>
  )
}
