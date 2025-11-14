'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import * as THREE from 'three'

interface Page {
  pageNumber: number
  content: string
  imageUrl?: string
}

interface BookViewer3DProps {
  pages: Page[]
  title: string
}

function BookPage({
  texture,
  position,
  rotation,
  scale = [4, 5, 0.1]
}: {
  texture?: THREE.Texture
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

function Book3D({ currentPage, pages }: { currentPage: number, pages: Page[] }) {
  // For now, we'll show placeholder pages
  // In production, you'd load actual page textures

  const leftPageRotation: [number, number, number] = [0, Math.PI * 0.1, 0]
  const rightPageRotation: [number, number, number] = [0, -Math.PI * 0.1, 0]

  return (
    <group>
      {/* Book cover/spine */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[0.3, 5, 0.2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* Left page */}
      <BookPage
        position={[-2, 0, 0]}
        rotation={leftPageRotation}
      />

      {/* Right page */}
      <BookPage
        position={[2, 0, 0]}
        rotation={rightPageRotation}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
    </group>
  )
}

export default function BookViewer3D({ pages, title }: BookViewer3DProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const nextPage = () => {
    if (currentPage < pages.length - 2 && !isAnimating) {
      setIsAnimating(true)
      setCurrentPage(prev => prev + 2)
      setTimeout(() => setIsAnimating(false), 600)
    }
  }

  const prevPage = () => {
    if (currentPage > 0 && !isAnimating) {
      setIsAnimating(true)
      setCurrentPage(prev => prev - 2)
      setTimeout(() => setIsAnimating(false), 600)
    }
  }

  const leftPage = pages[currentPage]
  const rightPage = pages[currentPage + 1]

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* 3D Canvas */}
      <Canvas shadows className="w-full h-full">
        <PerspectiveCamera makeDefault position={[0, 0, 12]} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={8}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 4}
        />

        <Book3D currentPage={currentPage} pages={pages} />
      </Canvas>

      {/* Page content overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="container mx-auto h-full flex items-center justify-center">
          <div className="grid grid-cols-2 gap-8 max-w-6xl w-full">
            {/* Left page */}
            <motion.div
              key={`left-${currentPage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              {leftPage && (
                <>
                  <p className="text-lg text-white/90 leading-relaxed">
                    {leftPage.content}
                  </p>
                  <div className="mt-4 text-white/60 text-sm">
                    Page {leftPage.pageNumber}
                  </div>
                </>
              )}
            </motion.div>

            {/* Right page */}
            <motion.div
              key={`right-${currentPage + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              {rightPage && (
                <>
                  <p className="text-lg text-white/90 leading-relaxed">
                    {rightPage.content}
                  </p>
                  <div className="mt-4 text-white/60 text-sm">
                    Page {rightPage.pageNumber}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
        <Button
          onClick={prevPage}
          disabled={currentPage === 0 || isAnimating}
          variant="secondary"
          size="icon"
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white">
          {currentPage + 1}-{Math.min(currentPage + 2, pages.length)} / {pages.length}
        </div>

        <Button
          onClick={nextPage}
          disabled={currentPage >= pages.length - 2 || isAnimating}
          variant="secondary"
          size="icon"
          className="rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Book title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none">
        <h1 className="text-3xl font-bold text-white text-center">
          {title}
        </h1>
      </div>
    </div>
  )
}
