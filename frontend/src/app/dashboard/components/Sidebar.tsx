"use client"

import React from "react";

interface SidebarProps {
  onSelect: (tab: "overview" | "predictions_state" | "predictions_municipal" | "howto") => void;

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

        <li className="rounded">
          <div className="p-1 pb-0 font-semibold text-xs text-gray-500">
            Predictions
          </div>

          <ul className="ml-4 mt-1 space-y-1">
            <li
              className="hover:bg-[var(--color-accent)] hover:text-white p-2 rounded cursor-pointer"
              onClick={() => onSelect("predictions_state")}
            >
              State
            </li>
            <li
              className="hover:bg-[var(--color-accent)] hover:text-white p-2 rounded cursor-pointer"
              onClick={() => onSelect("predictions_municipal")}
            >
              Municipal
            </li>
          </ul>
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
