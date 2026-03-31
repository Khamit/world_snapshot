// world_snapshot/src/components/Background.tsx
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

export default function Background() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Создаем 50 случайных частиц
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <>
      {/* Основной градиентный фон - добавляем pointer-events-none */}
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-slate-900 via-slate-900 to-black pointer-events-none" />
      
      {/* Анимированная сетка - добавляем pointer-events-none */}
      <div 
        className="fixed inset-0 -z-19 opacity-30 animate-gridMove pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Радиальный градиент для глубины - добавляем pointer-events-none */}
      <div 
        className="fixed inset-0 -z-18 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
        }}
      />
      
      {/* Анимированные частицы - уже есть pointer-events-none */}
      <div className="fixed inset-0 -z-17 pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-cyan-400 animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDelay: `${particle.delay}s`,
              filter: 'blur(1px)',
              pointerEvents: 'none', // Явно запрещаем клики
            }}
          />
        ))}
      </div>
      
      {/* Шум/зернистость для текстуры - уже есть pointer-events-none */}
      <div 
        className="fixed inset-0 -z-16 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />
    </>
  );
}