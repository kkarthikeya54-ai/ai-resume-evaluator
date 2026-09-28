import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$@%";

export default function TextScramble({ text = "", className = "", triggerOnHover = true }) {
  const [displayText, setDisplayText] = useState(text);
  const isAnimating = useRef(false);

  const scramble = () => {
    if (isAnimating.current || !text) return;
    isAnimating.current = true;
    let iteration = 0;
    const maxIterations = text.length * 2;

    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration / 2) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
        isAnimating.current = false;
      }
      iteration += 1;
    }, 30);
  };

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return (
    <span
      className={`inline-block font-mono ${className}`}
      onMouseEnter={triggerOnHover ? scramble : undefined}
    >
      {displayText}
    </span>
  );
}
