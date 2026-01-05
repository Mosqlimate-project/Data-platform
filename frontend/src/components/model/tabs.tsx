"use client";

import { usePathname } from "next/navigation";
import { TabNav, TabLink } from "@/components/ui/tabs";

export function ModelTabs({ owner, repository }: { owner: string; repository: string }) {
  const pathname = usePathname();
  const baseUrl = `/${owner}/${repository}`;

  return (
    <TabNav>
      <TabLink href={baseUrl} isActive={pathname === baseUrl}>
        Readme
      </TabLink>
      <TabLink href={`${baseUrl}/predictions`} isActive={pathname.includes("/predictions")}>
        Predictions
      </TabLink>
    </TabNav>
  );
}

{/* <TabLink href={`${baseUrl}/community`} isActive={pathname.includes("/community")}> */ }
{/*   Community */ }
{/* </TabLink> */ }
