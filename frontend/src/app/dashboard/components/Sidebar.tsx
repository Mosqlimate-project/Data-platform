"use client"

import React from "react";

interface SidebarProps {
  onSelect: (tab: "overview" | "predictions" | "howto") => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelect }) => {
  return (
    <aside className="bg-[var(--color-bg)] p-4 h-full min-h-screen">
      <h2 className="text-xl font-bold mb-6">Menu</h2>
      <ul className="space-y-3">
        <li
          className="hover:bg-[var(--color-accent)] hover:text-white p-2 rounded cursor-pointer"
          onClick={() => onSelect("overview")}
        >
          Overview
        </li>
        <li
          className="hover:bg-[var(--color-accent)] hover:text-white p-2 rounded cursor-pointer"
          onClick={() => onSelect("predictions")}
        >
          Predictions
        </li>
        <li
          className="hover:bg-[var(--color-accent)] hover:text-white p-2 rounded cursor-pointer"
          onClick={() => onSelect("howto")}
        >
          How to Use
        </li>
      </ul>
    </aside>
  );
};
