"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ImmersiveExamScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      mount.classList.add("immersive-scene-fallback");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x91b8ff, 1.7));
    const keyLight = new THREE.PointLight(0x54d8ff, 32, 20);
    keyLight.position.set(3, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x7761ff, 26, 20);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const coreGeometry = new THREE.IcosahedronGeometry(1.12, 5);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3f8cff,
      metalness: 0.52,
      roughness: 0.19,
      transmission: 0.16,
      thickness: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: 0x071e56,
      emissiveIntensity: 0.55,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    coreGroup.add(core);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 2),
      new THREE.MeshBasicMaterial({ color: 0x9beaff, wireframe: true, transparent: true, opacity: 0.24 })
    );
    coreGroup.add(wire);

    const ringMaterial = (color: number) => new THREE.MeshStandardMaterial({
      color,
      metalness: 0.72,
      roughness: 0.24,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    const ringOne = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.018, 12, 180), ringMaterial(0x62d9ff));
    ringOne.rotation.set(0.78, 0.2, 0.3);
    coreGroup.add(ringOne);
    const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.012, 10, 180), ringMaterial(0x8772ff));
    ringTwo.rotation.set(1.15, 0.65, -0.48);
    coreGroup.add(ringTwo);

    const satellites: THREE.Mesh[] = [];
    const satelliteGeometry = new THREE.OctahedronGeometry(0.12, 1);
    for (let i = 0; i < 7; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x72e7ff : 0xa99bff,
        metalness: 0.55,
        roughness: 0.2,
        emissive: i % 2 === 0 ? 0x123b60 : 0x281b62,
        emissiveIntensity: 0.7,
      });
      const satellite = new THREE.Mesh(satelliteGeometry, material);
      const angle = (i / 7) * Math.PI * 2;
      satellite.position.set(Math.cos(angle) * 2.05, Math.sin(angle * 1.7) * 1.15, Math.sin(angle) * 0.8);
      satellite.userData.phase = angle;
      satellites.push(satellite);
      coreGroup.add(satellite);
    }

    const particleCount = 380;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 9;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0x8acfff, size: 0.018, transparent: true, opacity: 0.7, sizeAttenuation: true })
    );
    scene.add(particles);

    let frame = 0;
    let animationId = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onPointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.45;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.35;
    };
    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);
    mount.addEventListener("pointermove", onPointerMove);

    const animate = () => {
      if (!reduceMotion) animationId = window.requestAnimationFrame(animate);
      frame += 0.008;
      targetX += (pointerY - targetX) * 0.025;
      targetY += (pointerX - targetY) * 0.025;
      if (!reduceMotion) {
        core.rotation.y = frame * 0.34 + targetY;
        core.rotation.x = Math.sin(frame * 0.55) * 0.12 + targetX;
        wire.rotation.y = -frame * 0.19;
        wire.rotation.x = frame * 0.11;
        ringOne.rotation.z += 0.0018;
        ringTwo.rotation.y -= 0.0012;
        particles.rotation.y = frame * 0.018;
        satellites.forEach((satellite, index) => {
          const phase = satellite.userData.phase as number;
          satellite.position.y = Math.sin(frame * 0.8 + phase) * 1.25;
          satellite.rotation.x += 0.006 + index * 0.0003;
          satellite.rotation.y -= 0.008;
        });
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      wire.geometry.dispose();
      (wire.material as THREE.Material).dispose();
      ringOne.geometry.dispose();
      (ringOne.material as THREE.Material).dispose();
      ringTwo.geometry.dispose();
      (ringTwo.material as THREE.Material).dispose();
      satelliteGeometry.dispose();
      satellites.forEach((satellite) => (satellite.material as THREE.Material).dispose());
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="immersive-scene-shell">
      <div className="immersive-scene-glow" aria-hidden="true" />
      <div ref={mountRef} className="immersive-scene-canvas" aria-label="Animated 3D exam preparation visualization" role="img" />
      <div className="scene-orbit-label scene-label-top">
        <span className="scene-label-dot" />
        INTERACTIVE LEARNING ENGINE
      </div>
      <div className="scene-stat-card scene-stat-left">
        <span className="scene-stat-kicker">YOUR NEXT MILESTONE</span>
        <strong>One session closer.</strong>
        <span className="scene-stat-caption">Practice · Review · Improve</span>
      </div>
      <div className="scene-stat-card scene-stat-right">
        <span className="scene-mini-bars"><i /><i /><i /><i /><i /><i /></span>
        <span className="scene-stat-kicker">PREPARATION MODE</span>
        <strong>Built around you</strong>
        <span className="scene-stat-caption">Focused practice, clear insights</span>
      </div>
      <div className="scene-orbit-label scene-label-bottom">
        <span>01</span><span className="scene-label-line" /><span>PREPARE WITH PURPOSE</span>
      </div>
    </div>
  );
}
