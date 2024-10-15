import * as Sentry from "@sentry/browser";
import { createRoot } from "react-dom/client";

import App from "./App";

const root = createRoot(document.getElementById("react-app") as HTMLElement);
root.render(<App />);
