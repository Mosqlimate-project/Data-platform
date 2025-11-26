import { lazy } from "react";

export const GoogleIcon = lazy(() =>
  import("react-icons/fc").then((m) => ({ default: m.FcGoogle }))
);

export const GithubIcon = lazy(() =>
  import("react-icons/fa").then((m) => ({
    default: m.FaGithub,
  }))
);

export const OrcidIcon = lazy(() =>
  import("react-icons/si").then((m) => ({ default: m.SiOrcid }))
);
