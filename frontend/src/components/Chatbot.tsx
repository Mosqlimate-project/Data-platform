"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight } from "prism-react-renderer";

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
      const res = await apiFetch("/session_key/");
      const sessionKey = res.session_key;
      const backend_url = process.env.NODE_ENV === "production" ? "api.mosqlimate.org" : "localhost:8042";
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${backend_url}/ws/chat/${sessionKey}/`);
      socketRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text?.msg && data.text?.source === "bot") {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg hover:bg-blue-700 transition"
      >
        <Image
          src="/mosquito.svg"
          alt="Chatbot"
          width={24}
          height={24}
          className="invert"
        />
      </button>

      {open && (
        <div
          className={`fixed bottom-20 right-4 bg-[var(--color-bg)] border rounded-xl shadow-lg flex flex-col transition-all ${expanded ? "w-[28rem] h-[36rem]" : "w-80 h-96"
            }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-[var(--color-bg)] rounded-t-xl">
            <span className="font-medium text-[var(--color-text)] text-sm">
              Mosqlimate Assistant
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--color-text)] hover:opacity-80 transition"
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
                className="text-[var(--color-text)] hover:opacity-80 transition"
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

          <div className="flex-1 p-2 overflow-y-auto text-sm flex flex-col gap-1">
            {messages.map((m, i) => {
              const isUser = m.source === "user";
              const isBot = m.source === "bot";
              const isSystem = m.source === "system";
              const isWaiting = m.source === "waiting";

              return (
                <div
                  key={i}
                  className={`inline-block max-w-[90%] px-3 py-2 rounded-lg break-words ${isUser
                    ? "bg-[var(--color-accent)] text-[var(--color-text)] ml-auto text-right"
                    : isBot
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-text)] mr-auto text-left"
                      : isWaiting
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-500 italic mx-auto text-center"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 italic mx-auto text-center"
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

          <div className="p-2 flex gap-2 border-t dark:border-gray-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border rounded px-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              onKeyUp={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 text-white px-3 rounded text-sm hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
