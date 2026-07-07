import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import Home from "./pages/Home";
import SearchPage from "./pages/Search";
import EntryDetail from "./pages/EntryDetail";
import Contribute from "./pages/Contribute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column' }}>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            
            {/* The main area stretches to push the footer down if the page has low content */}
            <div style={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/entry/:id" element={<EntryDetail />} />
                <Route path="/contribute" element={<Contribute />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </div>

            {/* GLOBAL FOOTER: Now sits nicely at the bottom of all pages */}
            <footer style={{ 
              textAlign: 'center', 
              padding: '24px 16px', 
              fontFamily: '"Inter", sans-serif', 
              color: 'var(--evenda-muted, #777)', 
              fontSize: '13px', 
              borderTop: '1px solid var(--evenda-border, #eaeaea)',
              backgroundColor: 'var(--evenda-bg)'
            }}>
                <p>© 2026 Evenda — Ri vhulunga ifa la Vhavenda</p>
                <p style={{ fontSize: '11px', marginTop: '6px', color: 'rgba(119, 119, 119, 0.75)', letterSpacing: '0.03em' }}>
                    This website was made with assistance from Emergent AI
                </p>
            </footer>

          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
