"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type ParticleFieldProps = {
  count?: number;
  radius?: number;
  color?: string;
  speed?: number;
};

function ParticleField({
  count = 20000,
  radius = 30,
  color = "#00ff88",
  speed = 0.08,
}: ParticleFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particlePositions = useMemo(() => {
    const current = Array.from({ length: count }, () => new THREE.Vector3());

    const targets = Array.from({ length: count }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;

      return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    });

    return { current, targets };
  }, [count, radius]);

  const geometry = useMemo(
    () => new THREE.TetrahedronGeometry(0.12, 0),
    []
  );

  const glowGeometry = useMemo(
    () => new THREE.TetrahedronGeometry(0.26, 0),
    []
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const glow = glowRef.current;

    if (!mesh || !glow) return;

    const elapsed = state.clock.getElapsedTime();
    const rotation = elapsed * speed;

    mesh.rotation.y = rotation;
    mesh.rotation.x = Math.sin(elapsed * speed * 0.55) * 0.12;
    glow.rotation.copy(mesh.rotation);

    for (let i = 0; i < count; i += 1) {
      const current = particlePositions.current[i];
      const target = particlePositions.targets[i];

      current.lerp(target, Math.min(1, delta * 7));

      dummy.position.copy(current);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
      glow.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={glowRef} args={[glowGeometry, glowMaterial, count]} />
      <instancedMesh ref={meshRef} args={[geometry, material, count]} />
    </>
  );
}

export function CasberryParticleBackground({
  count = 20000,
  radius = 30,
  color = "#00ff88",
  speed = 0.08,
}: ParticleFieldProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-black pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 78], fov: 55, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#000000"]} />
        <ParticleField
          count={count}
          radius={radius}
          color={color}
          speed={speed}
        />
      </Canvas>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.10),transparent_42%)]"
      />
    </div>
  );
}
