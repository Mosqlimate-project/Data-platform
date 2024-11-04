import * as Sentry from "@sentry/react";
// import cookie from "cookie";

import Home from "./main/Home";

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <Home />
    </Sentry.ErrorBoundary>
  )
};

export default App;
