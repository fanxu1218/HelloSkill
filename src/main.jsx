import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { PrivateVault } from "./PrivateVault.jsx";
import { parsePrivateRoute } from "./vault-crypto.js";
import "./styles.css";

function Root() {
  const [hash, setHash] = React.useState(window.location.hash);
  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return hash.startsWith("#/just-me") ? <PrivateVault key={hash} route={parsePrivateRoute(hash)} /> : <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
