// world_snapshot/src/components/TypingText.tsx
import { useEffect, useState } from 'react';

interface TypingTextProps {
  texts: string[];
  typingSpeed?: number;
  pauseDuration?: number;
}

export default function TypingText({ 
  texts, 
  typingSpeed = 100, 
  pauseDuration = 2000 
}: TypingTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentFullText = texts[currentTextIndex];
    
    if (isTyping) {
      if (displayText.length < currentFullText.length) {
        const timeout = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        const timeout = setTimeout(() => {
          setDisplayText('');
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          setIsTyping(true);
        }, pauseDuration);
        return () => clearTimeout(timeout);
      }
    }
  }, [displayText, isTyping, currentTextIndex, texts, typingSpeed, pauseDuration]);

  return (
    <div className="relative">
      <h1 className="text-2xl md:text-3xl font-mono font-bold">
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          {displayText}
        </span>
        <span className="inline-block w-0.5 h-6 md:h-8 bg-cyan-400 ml-1 animate-blink" />
      </h1>
    </div>
  );
}