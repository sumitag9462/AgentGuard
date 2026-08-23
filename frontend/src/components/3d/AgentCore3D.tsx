import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line, Preload } from '@react-three/drei';
import * as THREE from 'three';

function OrbitingNodes({ count = 15, radius = 4, color = "#6366f1" }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2,
        (Math.random() - 0.5) * radius * 2
      ).normalize().multiplyScalar(radius * (0.8 + Math.random() * 0.4)),
      speed: 0.1 + Math.random() * 0.5
    }));
  }, [count, radius]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <group key={i}>
          <Sphere position={node.position} args={[0.08, 16, 16]}>
            <meshBasicMaterial color={color} toneMapped={false} />
          </Sphere>
          <Line
            points={[new THREE.Vector3(0, 0, 0), node.position]}
            color={color}
            opacity={0.15}
            transparent
            lineWidth={1}
          />
        </group>
      ))}
    </group>
  );
}

function CoreSphere({ status = 'healthy' }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  
  const colors = {
    healthy: "#6366f1", // Accent
    warning: "#fbbf24",
    critical: "#f87171"
  };

  const color = colors[status as keyof typeof colors] || colors.healthy;

  useFrame((state) => {
    if (sphereRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      sphereRef.current.scale.setScalar(scale);
    }
  });

  return (
    <Sphere ref={sphereRef} args={[1.2, 64, 64]}>
      <meshPhysicalMaterial 
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
        transmission={0.9}
        thickness={1}
        clearcoat={1}
      />
    </Sphere>
  );
}

export function AgentCore3D({ status = 'healthy' }: { status?: 'healthy' | 'warning' | 'critical' }) {
  const orbitColors = {
    healthy: "#818cf8",
    warning: "#fcd34d",
    critical: "#fca5a5"
  };

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={orbitColors[status]} />
        
        <CoreSphere status={status} />
        <OrbitingNodes count={20} radius={3.5} color={orbitColors[status]} />
        <OrbitingNodes count={10} radius={5} color="#3f3f46" />
        
        <Preload all />
      </Canvas>
      {/* Fallback gradient for when 3D is loading/fails or on mobile */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_50%)]" />
    </div>
  );
}
