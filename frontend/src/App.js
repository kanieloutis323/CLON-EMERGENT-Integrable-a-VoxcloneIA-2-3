import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Studio from "@/pages/Studio";
import Cleaner from "@/pages/Cleaner";
import Biometrics from "@/pages/Biometrics";
import ExportPage from "@/pages/Export";
import ApiPanel from "@/pages/ApiPanel";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/studio/:sessionId" element={<Studio />} />
                        <Route path="/cleaner" element={<Cleaner />} />
                        <Route
                            path="/biometrics/:sessionId"
                            element={<Biometrics />}
                        />
                        <Route path="/export/:sessionId" element={<ExportPage />} />
                        <Route path="/api-panel" element={<ApiPanel />} />
                    </Routes>
                </Layout>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        className:
                            "rounded-none border border-white/15 bg-[#141414] text-white font-mono text-xs",
                    }}
                />
            </BrowserRouter>
        </div>
    );
}

export default App;
