import { createElement, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Shared pieces for professors you can chat with (Zaman.jsx, Schott.jsx).
// useTalkingProf handles the behavior: idle scanning, turning to face you while the chat is open,
// mouth + hand motion while a reply "plays", and crosshair aiming / click-to-talk.

const mats = new Map()
export const m = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}
export const SPH = new THREE.SphereGeometry(1, 24, 16)
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 20)
export const BOX = new THREE.BoxGeometry(1, 1, 1)
export const CONE = new THREE.ConeGeometry(1, 1, 20)
export const TORUS = new THREE.TorusGeometry(1, 0.14, 8, 24)
export const CAP = new THREE.CapsuleGeometry(1, 1, 6, 12)
export const TORSO = new THREE.CylinderGeometry(0.215, 0.2, 0.66, 24)

export const B = ({ g = SPH, c, p, s, r = [0, 0, 0], o }) => createElement('mesh', { geometry: g, material: m(c, o), position: p, scale: s, rotation: r })

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k
const TALK_RANGE = 9 // meters: how close you need to be to start a chat
const CENTER = new THREE.Vector2(0, 0)

// Returns refs to attach: root (whole figure), head, mouth (a group; scaled in y to open), armL, armR.
export function useTalkingProf({ position, rotation, chatting, talkUntil, onAim, onTalk, extra }) {
  const { camera } = useThree()
  const refs = { root: useRef(), head: useRef(), mouth: useRef(), armL: useRef(), armR: useRef() }
  const aimed = useRef(false)
  const ray = useMemo(() => new THREE.Raycaster(), [])

  // with the pointer locked, a click goes to the crosshair: talk if it's on this professor
  useEffect(() => {
    const down = (e) => {
      if (e.button === 0 && document.pointerLockElement && aimed.current) onTalk()
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [onTalk])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const r = refs.root.current
    const k = Math.min(1, dt * 5)

    // face the student while chatting, otherwise scan the room
    let yaw = rotation + Math.sin(t * 0.35) * 0.4
    if (chatting) yaw = Math.atan2(camera.position.x - position[0], camera.position.z - position[2])
    r.rotation.y = lerpAngle(r.rotation.y, yaw, k)
    const dy = camera.position.y - (position[1] + 1.7)
    const dist = Math.hypot(camera.position.x - position[0], camera.position.z - position[2])
    refs.head.current.rotation.x = THREE.MathUtils.lerp(refs.head.current.rotation.x, chatting ? -Math.atan2(dy, dist) * 0.8 : 0, k)

    const talking = chatting && performance.now() < (talkUntil.current ?? 0)
    refs.mouth.current.scale.y = talking ? 0.8 + Math.abs(Math.sin(t * 14)) * 2.6 : 1
    refs.armR.current.rotation.x = talking ? -0.5 - Math.max(0, Math.sin(t * 3)) * 0.6 : -0.15 + Math.sin(t * 1.1) * 0.05
    refs.armL.current.rotation.x = talking ? -0.3 - Math.max(0, Math.sin(t * 2.3 + 1)) * 0.4 : -0.1
    extra?.(t, talking)

    // is the crosshair on this professor, and close enough to talk?
    if (!chatting && (document.pointerLockElement || document.body.dataset.touch)) {
      ray.setFromCamera(CENTER, camera)
      const hit = ray.intersectObject(r, true)[0]
      const on = !!hit && hit.distance < TALK_RANGE
      if (on !== aimed.current) {
        aimed.current = on
        onAim(on)
      }
    } else if (aimed.current) {
      aimed.current = false
      onAim(false)
    }
  })
  return refs
}
