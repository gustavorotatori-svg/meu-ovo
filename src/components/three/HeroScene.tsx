import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const GOLD = '#FFC928';

function eggProfile(segments = 96, height = 2.35, radius = 1.52) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = t * Math.PI;
    const r = radius * Math.sin(theta) * (1 + 0.23 * Math.cos(theta));
    const y = -Math.cos(theta) * (height / 2);
    pts.push(new THREE.Vector2(Math.max(r, 0.0002), y));
  }
  return pts;
}

function Egg({ pointer, reduced }: { pointer: React.RefObject<{ x: number; y: number }>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const { viewport } = useThree();

  const wide = viewport.aspect > 1.15;
  const baseX = wide ? Math.min(viewport.width * 0.2, 2.6) : 0;
  const baseY = wide ? -0.1 : -0.25;
  const scale = wide ? 1 : 0.82;

  const geometry = useMemo(() => {
    const g = new THREE.LatheGeometry(eggProfile(), 128);
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (!reduced) {
      g.rotation.y += delta * 0.22;
      g.position.y = baseY + Math.sin(t * 0.75) * 0.13;
    }

    const px = pointer.current?.x ?? 0;
    const py = pointer.current?.y ?? 0;
    g.rotation.x += ((-py * 0.26) - g.rotation.x) * 0.045;
    g.rotation.z += ((px * 0.11) - g.rotation.z) * 0.045;

    if (material.current) {
      material.current.envMapIntensity = 1.35 + Math.sin(t * 0.9) * 0.12;
    }
  });

  return (
    <group ref={group} position={[baseX, baseY, 0]} scale={scale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={material}
          color={GOLD}
          metalness={0.86}
          roughness={0.19}
          clearcoat={1}
          clearcoatRoughness={0.13}
          sheen={0.35}
          sheenColor="#fff3c4"
          sheenRoughness={0.5}
          envMapIntensity={1.35}
        />
      </mesh>

      <mesh position={[0, -1.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.62, 1.78, 0.16, 96]} />
        <meshPhysicalMaterial color="#141414" metalness={0.35} roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.3} />
      </mesh>
    </group>
  );
}

function Particles({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        r: 2.6 + (i % 5) * 0.42,
        a: (i / 14) * Math.PI * 2,
        y: -1.1 + ((i * 37) % 100) / 100 * 2.6,
        s: 0.035 + ((i * 17) % 100) / 100 * 0.055,
        v: 0.12 + ((i * 23) % 100) / 100 * 0.22,
      })),
    []
  );

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = reduced ? 0 : state.clock.elapsedTime;
    seeds.forEach((p, i) => {
      const a = p.a + t * p.v * 0.35;
      dummy.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.6 + i) * 0.16, Math.sin(a) * p.r);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 14]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} emissive={GOLD} emissiveIntensity={0.18} />
    </instancedMesh>
  );
}

function Studio() {
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight position={[4.5, 6.5, 4]} intensity={2.4} color="#fff8e8" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5.5, 2.2, -3]} intensity={0.85} color="#cfe0ff" />
      <pointLight position={[0, 1.2, -4.5]} intensity={2.2} color={GOLD} distance={14} />

      <Environment resolution={256}>
        <Lightformer form="rect" intensity={5} position={[0, 4.5, 3.5]} scale={[7, 3.5, 1]} target={[0, 0, 0]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.4} position={[-5.5, 1, 2.5]} scale={[4.5, 6.5, 1]} target={[0, 0, 0]} color="#dbe6ff" />
        <Lightformer form="rect" intensity={3} position={[4.5, 2.5, -4]} scale={[5.5, 5.5, 1]} target={[0, 0, 0]} color="#ffe6ad" />
        <Lightformer form="circle" intensity={2} position={[0, -3.5, 0]} scale={7} target={[0, 0, 0]} color="#ffffff" />
        <Lightformer form="ring" intensity={1.6} position={[0, 0, -6]} scale={9} target={[0, 0, 0]} color="#1a1a1a" />
      </Environment>
    </>
  );
}

export default function HeroScene() {
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <Canvas
        className="!pointer-events-none"
        shadows
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.6, 6.6], fov: 38 }}
      >
        <Studio />
        <Egg pointer={pointer} reduced={reduced} />
        <Particles reduced={reduced} />
        <ContactShadows position={[0, -1.55, 0]} opacity={0.55} scale={11} blur={2.6} far={3.6} color="#000000" />
      </Canvas>
    </div>
  );
}
