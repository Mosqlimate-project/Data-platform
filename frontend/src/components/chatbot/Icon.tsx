"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

export default function ChatbotIcon() {
  const [showBalloon, setShowBalloon] = useState(false);

  useEffect(() => {
    const toggle = () => setShowBalloon((prev) => !prev);

    const initialTimer = setTimeout(() => {
      setShowBalloon(true);
      const interval = setInterval(toggle, 6000);
      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(initialTimer);
  }, []);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <div className={`absolute -top-8 -left-8 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md transition-all duration-500 transform origin-bottom-right ${showBalloon ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`}>
        Need help?
        <div className="absolute bg-transparent -bottom-1.5 right-1 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-accent"></div>
      </div>

      <div className="animate-float relative z-10 p-3 bg-transparent rounded-full">
        <Bot className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}
