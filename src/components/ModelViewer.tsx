"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Html, useProgress, useGLTF } from "@react-three/drei";
import type { Group } from "three";

// ═══════════════════════════════════════════════════════════
// LOADER
// ═══════════════════════════════════════════════════════════
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        <p className="text-xs text-gray-400">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
}

// ═══════════════════════════════════════════════════════════
// GLTF MODEL
// ═══════════════════════════════════════════════════════════
function GLTFModel({ url }: { url: string }) {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF(url);
  return <primitive ref={ref} object={scene} scale={1} position={[0, 0, 0]} />;
}

// ═══════════════════════════════════════════════════════════
// R3F SCENE
// ═══════════════════════════════════════════════════════════
function R3FScene({ url }: { url: string }) {
  return (
    <>
      <color attach="background" args={["#111827"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      <Suspense fallback={<Loader />}>
        <GLTFModel url={url} />
      </Suspense>

      <ContactShadows position={[0, -1.5, 0]} opacity={0.3} scale={8} blur={2} far={4} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={12}
        autoRotate={true}
        autoRotateSpeed={2}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════
export default function ModelViewer({
  modelUrl,
  fallbackImage,
}: {
  modelUrl?: string;
  fallbackImage?: string;
}) {
  const [renderKey, setRenderKey] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when URL changes
  useEffect(() => {
    setShowFallback(false);
    setRenderKey((k) => k + 1);
  }, [modelUrl]);

  // 20-second timeout — if model hasn't loaded by then, show fallback
  useEffect(() => {
    if (!modelUrl || showFallback) return;
    timeoutRef.current = setTimeout(() => {
      setShowFallback(true);
    }, 20000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [modelUrl, showFallback, renderKey]);

  // ── No model URL ──
  if (!modelUrl) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-2">🧊</div>
          <p className="text-sm text-gray-500">No 3D model</p>
        </div>
      </div>
    );
  }

  // ── Fallback (timeout or error) ──
  if (showFallback) {
    if (fallbackImage) {
      return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 relative flex items-center justify-center">
          <img
            src={fallbackImage}
            alt="Cover"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-xs text-gray-300 px-2.5 py-1 rounded-full">
            3D unavailable
          </div>
          <button
            onClick={() => {
              setShowFallback(false);
              setRenderKey((k) => k + 1);
            }}
            className="absolute bottom-3 left-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      );
    }
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🧊</p>
          <p className="text-sm text-red-400">Failed to load 3D model</p>
          <button
            onClick={() => {
              setShowFallback(false);
              setRenderKey((k) => k + 1);
            }}
            className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render Canvas ──
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 relative">
      <div className="absolute bottom-4 left-4 z-10 text-xs text-gray-500 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
        🖱 Drag to rotate · Scroll to zoom
      </div>

      <Canvas
        key={renderKey}
        shadows={false}
        camera={{ position: [4, 3, 5] as [number, number, number], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <R3FScene url={modelUrl} />
      </Canvas>
    </div>
  );
}

/**
 * Preload a GLB model into drei's cache.
 * Call this at the page level to start loading models early.
 */
export function preloadModel(url: string) {
  if (url) useGLTF.preload(url);
}
