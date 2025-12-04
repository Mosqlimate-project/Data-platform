import React from "react";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="profile-container">
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
