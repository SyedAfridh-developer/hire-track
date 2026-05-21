import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "../../../lib/api-client-react/src/custom-fetch";

setBaseUrl("https://hire-track-1.onrender.com");

createRoot(document.getElementById("root")!).render(<App />);