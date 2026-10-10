import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { B, BOX, CAP, CONE, CYL, SPH, TORSO, canvasTex, m, useTalkingProf } from './talkingProf.js'

// Professor Peter Schott (MGT 407 Statistics, EMBA), matched to his photo: light-blue button-down with
// an open collar, wavy brown hair, gray-blue eyes, light stubble, relaxed smile. Upbeat SoCal touches:
// chinos, checkerboard slip-ons, and a Totoro riding on his shoulder.
// Figure faces +z; his own right hand is at -x. Behavior comes from useTalkingProf.

const SKIN = '#e8bb98' // light, a little sun
const HAIR = '#5b3f2a' // medium brown
const SHIRT = '#bdd1ee' // light-blue oxford
const SHIRT_DARK = '#a7bfe3'
const CHINOS = '#c9b38a'
const TOTORO = '#7f8188'
const BELLY = '#efe6cf'

const SMILE = new THREE.TorusGeometry(1, 0.16, 6, 16, Math.PI)

function checkerTex() {
  const t = canvasTex(64, 64, (g) => {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'
      g.fillRect(i * 8, j * 8, 8, 8)
    }
  })
  t.magFilter = THREE.NearestFilter
  return t
}

// Totoro from primitives, about 0.3 m tall, facing +z
function Totoro() {
  return (
    <group>
      <B c={TOTORO} p={[0, 0.13, 0]} s={[0.12, 0.14, 0.11]} />
      <B c={BELLY} p={[0, 0.11, 0.05]} s={[0.09, 0.1, 0.07]} />
      {[-0.03, 0, 0.03].map((x, i) => (
        <B key={i} g={CONE} c={TOTORO} p={[x, 0.17, 0.118]} r={[Math.PI / 2 + 0.2, 0, 0]} s={[0.012, 0.012, 0.006]} />
      ))}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B g={CONE} c={TOTORO} p={[0.05 * sx, 0.3, 0]} r={[0, 0, -0.15 * sx]} s={[0.022, 0.07, 0.02]} />
          <B c="#ffffff" p={[0.045 * sx, 0.22, 0.09]} s={[0.022, 0.022, 0.012]} />
          <B c="#111111" p={[0.045 * sx, 0.22, 0.1]} s={[0.011, 0.011, 0.008]} />
          {[-1, 0, 1].map((k) => (
            <B key={k} g={BOX} c="#222" p={[0.08 * sx, 0.2 + k * 0.012, 0.085]} r={[0, 0, k * 0.15 * sx]} s={[0.05, 0.002, 0.002]} />
          ))}
          <B c={TOTORO} p={[0.11 * sx, 0.11, 0.02]} s={[0.03, 0.06, 0.03]} />
          <B c={TOTORO} p={[0.05 * sx, 0.01, 0.03]} s={[0.04, 0.02, 0.05]} />
        </group>
      ))}
      <B c="#111111" p={[0, 0.205, 0.105]} s={[0.015, 0.008, 0.008]} />
      <B g={BOX} c="#3a2a22" p={[0, 0.185, 0.103]} s={[0.04, 0.004, 0.004]} />
    </group>
  )
}

export default function Schott({ position, rotation = 0, chatting = false, talkUntil, onAim, onTalk }) {
  const totoro = useRef()
  const shirt = m(SHIRT)
  const shoe = useMemo(() => new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.9 }), [])
  const { root, head, mouth, armL, armR } = useTalkingProf({
    position,
    rotation,
    chatting,
    talkUntil,
    onAim,
    onTalk,
    extra: (t, talking) => {
      // Totoro bounces along, a little more when Peter is talking
      totoro.current.position.y = 1.5 + Math.abs(Math.sin(t * (talking ? 6 : 2))) * (talking ? 0.03 : 0.012)
      totoro.current.rotation.z = Math.sin(t * 1.3) * 0.08
    },
  })
  const skin = m(SKIN)
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]}>
      {/* checkerboard slip-ons */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh geometry={BOX} material={shoe} position={[0.1 * sx, 0.06, 0.04]} scale={[0.12, 0.1, 0.28]} />
          <B g={BOX} c="#f4f4f6" p={[0.1 * sx, 0.012, 0.04]} s={[0.125, 0.025, 0.285]} />
        </group>
      ))}
      {/* chinos + brown belt */}
      {[-1, 1].map((sx) => (
        <B key={sx} g={CYL} c={CHINOS} p={[0.1 * sx, 0.5, 0]} s={[0.082, 0.82, 0.085]} />
      ))}
      <B g={CYL} c={CHINOS} p={[0, 0.86, 0]} s={[0.19, 0.12, 0.15]} />
      <B g={CYL} c="#5a3b24" p={[0, 0.9, 0]} s={[0.195, 0.035, 0.155]} />

      {/* light-blue button-down, tucked in, open collar (top buttons undone), chest pocket */}
      <mesh geometry={TORSO} material={shirt} position={[0, 1.2, 0]} scale={[1, 1, 0.78]} />
      <mesh geometry={SPH} material={shirt} position={[0, 1.48, 0]} scale={[0.27, 0.1, 0.17]} />
      {/* open collar: two points spread over the chest, an open V of skin, collar band around the neck */}
      <B g={CYL} c={SHIRT} p={[0, 1.56, -0.01]} s={[0.065, 0.04, 0.065]} />
      <B g={CONE} c={SKIN} p={[0, 1.475, 0.168]} r={[Math.PI + 0.25, 0, 0]} s={[0.05, 0.14, 0.012]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={CONE} c={SHIRT_DARK} p={[0.055 * sx, 1.5, 0.17]} r={[0.25, 0, Math.PI - 0.35 * sx]} s={[0.04, 0.1, 0.008]} />
      ))}
      <B g={BOX} c={SHIRT_DARK} p={[0, 1.15, 0.166]} s={[0.012, 0.42, 0.004]} />
      {[1.3, 1.18, 1.06, 0.95].map((y) => (
        <B key={y} c="#f4f6fa" p={[0, y, 0.17]} s={[0.008, 0.008, 0.004]} />
      ))}
      <B g={BOX} c={SHIRT_DARK} p={[-0.1, 1.3, 0.162]} s={[0.07, 0.075, 0.006]} />
      <B g={CYL} c={SKIN} p={[0, 1.57, 0]} s={[0.05, 0.08, 0.05]} />

      {/* arms: short sleeves, then forearms */}
      {[
        [armL, 1],
        [armR, -1],
      ].map(([ref, sx]) => (
        <group key={sx} ref={ref} position={[0.26 * sx, 1.46, 0]} rotation={[0, 0, 0.16 * sx]}>
          <mesh geometry={CAP} material={shirt} position={[0, -0.24, 0]} scale={[0.066, 0.2, 0.066]} />
          <B g={CYL} c={SHIRT_DARK} p={[0, -0.46, 0]} s={[0.055, 0.04, 0.055]} />
          <mesh geometry={SPH} material={skin} position={[0, -0.52, 0.02]} scale={[0.045, 0.055, 0.04]} />
        </group>
      ))}

      {/* head: wavy brown hair swept up and back, gray-blue eyes, light stubble, relaxed smile */}
      <group ref={head} position={[0, 1.6, 0]}>
        <group position={[0, -1.6, 0]}>
          <B c={SKIN} p={[0, 1.705, 0]} s={[0.11, 0.142, 0.122]} />
          <B c={SKIN} p={[0, 1.625, 0.03]} s={[0.088, 0.05, 0.085]} />
          <B c="#9c8070" o={{ transparent: true, opacity: 0.35 }} p={[0, 1.628, 0.032]} s={[0.09, 0.052, 0.087]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.112 * sx, 1.7, 0]} s={[0.02, 0.035, 0.02]} />
          ))}
          {/* hair: full on top with loose waves, short on the sides */}
          <B c={HAIR} p={[0, 1.795, -0.015]} s={[0.122, 0.08, 0.13]} />
          <B c={HAIR} p={[0, 1.83, 0.005]} r={[0.25, 0, 0]} s={[0.11, 0.05, 0.12]} />
          <B c={HAIR} p={[0.012, 1.835, 0.07]} r={[-0.35, 0, -0.1]} s={[0.095, 0.042, 0.055]} />
          <B c={HAIR} p={[-0.05, 1.835, 0.03]} r={[0, 0, 0.3]} s={[0.055, 0.035, 0.07]} />
          <B c={HAIR} p={[0.055, 1.83, 0.02]} r={[0, 0, -0.3]} s={[0.055, 0.035, 0.075]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={HAIR} p={[0.108 * sx, 1.755, -0.02]} s={[0.022, 0.055, 0.085]} />
          ))}
          <B c={HAIR} p={[0, 1.75, -0.095]} s={[0.105, 0.085, 0.045]} />
          {/* eyes, brows, nose */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.042 * sx, 1.718, 0.104]} s={[0.019, 0.011, 0.012]} />
              <B c="#6f8796" p={[0.042 * sx, 1.718, 0.113]} s={[0.009, 0.009, 0.007]} />
              <B c="#111111" p={[0.042 * sx, 1.718, 0.117]} s={[0.004, 0.004, 0.004]} />
              <B g={BOX} c={HAIR} p={[0.044 * sx, 1.745, 0.11]} r={[0, 0, -0.08 * sx]} s={[0.045, 0.01, 0.01]} />
            </group>
          ))}
          <B c={SKIN} p={[0, 1.69, 0.12]} s={[0.018, 0.034, 0.024]} />
          {/* closed-lip smile; the mouth group opens while he talks */}
          <mesh geometry={SMILE} material={m('#8a4a40')} position={[0, 1.66, 0.112]} rotation={[0, 0, Math.PI]} scale={[0.03, 0.012, 0.012]} />
          <group ref={mouth} position={[0, 1.652, 0.113]}>
            <B c="#4a1a18" p={[0, 0, 0]} s={[0.02, 0.004, 0.006]} />
          </group>
        </group>
      </group>

      {/* Totoro riding on his left shoulder */}
      <group ref={totoro} position={[0.22, 1.5, -0.02]} rotation={[0, 0.2, 0]}>
        <Totoro />
      </group>
    </group>
  )
}
