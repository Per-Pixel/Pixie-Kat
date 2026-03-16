import { useRef, useState, useCallback, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import Loading from "./components/common/Loading";
import NavBar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import BottomNav from "./components/layout/BottomNav";

import HomePage from "./pages/home";
import Games from "./pages/games";
import Pricing from "./pages/pricing";
import FAQ from "./pages/faq";
import Support from "./pages/support";
import HowItWorks from "./pages/how-it-works";
import Auth from "./pages/auth";
import AddMoneyPage from "./pages/wallet/AddMoneyPage";

const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = img.onabort = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

const AppShell = ({ children }) => {
  const location = useLocation();
  const isWalletRoute = /^\/games\/[^/]+\/add-money$/.test(location.pathname);

  return (
    <>
      {!isWalletRoute ? <NavBar /> : null}
      {children}
      {!isWalletRoute ? <Footer /> : null}
      <BottomNav />
    </>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const mainContentRef = useRef(null);

  const criticalImageSources = [];

  useEffect(() => {
    const loadCriticalAssets = async () => {
      if (criticalImageSources.length === 0) return;

      try {
        await Promise.all(criticalImageSources.map((src) => preloadImage(src)));
      } catch (error) {
        console.error("APP_DEBUG: Error preloading one or more critical assets:", error);
      }
    };

    loadCriticalAssets();
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 0);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <>
          {isLoading && (
            <Loading
              onComplete={handleLoadingComplete}
              heroContainerRef={mainContentRef}
              heroRef={mainContentRef}
            />
          )}

          <main
            className="relative min-h-screen w-screen overflow-x-hidden bg-dark-900"
            ref={mainContentRef}
            style={{ opacity: isLoading ? 0 : 1 }}
          >
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/games" element={<Games />} />
                <Route path="/games/:gameId/add-money" element={<AddMoneyPage />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/register" element={<Auth />} />
              </Routes>
            </AppShell>
          </main>
        </>
      </Router>
    </AuthProvider>
  );
}
export default App;
