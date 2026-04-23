import { useRef, useState, useCallback, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import Loading from "./components/common/Loading";
import NavBar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import BottomNav from "./components/layout/BottomNav";

const HomePage = lazy(() => import("./pages/home"));
const Games = lazy(() => import("./pages/games"));
const Pricing = lazy(() => import("./pages/pricing"));
const FAQ = lazy(() => import("./pages/faq"));
const Support = lazy(() => import("./pages/support"));
const HowItWorks = lazy(() => import("./pages/how-it-works"));
const Auth = lazy(() => import("./pages/auth"));
const AddMoneyPage = lazy(() => import("./pages/wallet/AddMoneyPage"));
const AccountPage = lazy(() => import("./pages/account"));
const GameInfoPage = lazy(() => import("./pages/games/GameInfoPage"));

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
  const isHomePage = location.pathname === "/";

  return (
    <>
      {!isWalletRoute ? <NavBar /> : null}
      {children}
      {!isWalletRoute && !isHomePage ? <Footer /> : null}
      {!isWalletRoute ? <BottomNav /> : null}
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
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/games" element={<Games />} />
                  <Route path="/games/:gameId" element={<GameInfoPage />} />
                  <Route path="/games/:gameId/add-money" element={<AddMoneyPage />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/register" element={<Auth />} />
                  <Route path="/account/*" element={<AccountPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </main>
        </>
      </Router>
    </AuthProvider>
  );
}
export default App;
