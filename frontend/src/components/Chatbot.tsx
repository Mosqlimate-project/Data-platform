"use client";

import { useState, useEffect, useRef } from "react";
import { PUBLIC_BACKEND_URL } from "@/lib/env";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight } from "prism-react-renderer";
import ChatbotIcon from "@/components/chatbot/Icon";

interface Message {
  msg: string;
  source: "user" | "bot" | "system" | "waiting";
}

const theme = {
  plain: {
    backgroundColor: "transparent",
    color: "#d6deeb",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "rgb(99, 119, 119)", fontStyle: "italic" },
    },
    {
      types: ["punctuation"],
      style: { color: "rgb(199, 146, 234)" },
    },
    {
      types: ["property", "tag", "boolean", "number", "constant", "symbol"],
      style: { color: "rgb(128, 203, 196)" },
    },
    {
      types: ["attr-name", "string", "char", "builtin", "inserted"],
      style: { color: "rgb(173, 219, 103)" },
    },
    {
      types: ["function", "operator", "keyword"],
      style: { color: "rgb(130, 170, 255)" },
    },
  ],
};

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const response = await fetch(`/session-key`);

      if (!response.ok) {
        console.error("Failed to get session key");
        return;
      }

      const data = await response.json();
      const sessionKey = data.session_key;
      const backend_url = new URL(PUBLIC_BACKEND_URL).host;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${backend_url}/ws/chat/${sessionKey}/`);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text?.msg) {
          setMessages((prev) => {
            const cleaned = prev.filter((m) => m.source !== "waiting");
            return [...cleaned, data.text];
          });
        }
      };

      ws.onclose = () => {
        setMessages((prev) => [
          ...prev,
          { msg: "Disconnected. Reload to reconnect.", source: "system" },
        ]);
      };

      ws.onerror = () => {
        setMessages((prev) => [
          ...prev,
          { msg: "An error occurred. Reload the page.", source: "system" },
        ]);
      };
    }

    init();
    return () => socketRef.current?.close();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-scroll when opening the chat
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [open]);

  const sendMessage = () => {
    if (socketRef.current && input.trim() !== "") {
      setMessages((prev) => [
        ...prev,
        { msg: input, source: "user" },
        { msg: "waiting", source: "waiting" },
      ]);

      socketRef.current.send(JSON.stringify({ text: input }));
      setInput("");
    }
  };

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <Highlight
          theme={theme as any}
          code={String(children).replace(/\n$/, "")}
          language={match[1]}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} !bg-[var(--color-accent)]/20 overflow-x-auto`}
              style={style}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="z-50 fixed bottom-6 right-6 w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-105"
        >
          <ChatbotIcon />
        </button>
      )}

      {open && (
        <div
          className={`fixed z-50 bottom-6 right-6 bg-[var(--color-bg)] border rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${expanded ? "w-[45rem] h-[36rem]" : "w-80 h-96"
            }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[var(--color-bg)] rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-medium text-[var(--color-text)] text-sm">
                Mosqlimate Assistant
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--color-text)] hover:bg-[var(--color-accent)]/10 p-1 rounded transition"
                title={expanded ? "Shrink" : "Expand"}
              >
                {expanded ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 9h4V5H5v4zm6 6h4v-4h-4v4zM5 15h4v-4H5v4zm6-6h4V5h-4v4z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M3 3h6v2H5v4H3V3zm14 0v6h-2V5h-4V3h6zm-6 14v-2h4v-4h2v6h-6zm-8-6h2v4h4v2H3v-6z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-text)] hover:bg-[var(--color-accent)]/10 p-1 rounded transition"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 
                    011.414 1.414L11.414 10l4.293 4.293a1 1 0 
                    01-1.414 1.414L10 11.414l-4.293 
                    4.293a1 1 0 01-1.414-1.414L8.586 
                    10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto text-sm flex flex-col gap-2">
            {messages.map((m, i) => {
              const isUser = m.source === "user";
              const isBot = m.source === "bot";
              const isWaiting = m.source === "waiting";

              return (
                <div
                  key={i}
                  className={`inline-block max-w-[85%] px-4 py-2.5 rounded-2xl break-words shadow-sm ${isUser
                    ? "bg-blue-600 text-white ml-auto text-right rounded-br-none"
                    : isBot
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-text)] mr-auto text-left rounded-bl-none border border-[var(--color-border)]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 italic mx-auto text-center py-1.5 px-3 rounded-full text-xs"
                    }`}
                >
                  {isBot ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={components}
                    >
                      {m.msg}
                    </ReactMarkdown>
                  ) : (
                    m.msg
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t bg-[var(--color-bg)] dark:border-gray-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              onKeyUp={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !socketRef.current}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 translate-x-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
