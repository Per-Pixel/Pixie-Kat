import { useRef, useState, useCallback, useEffect, lazy, Suspense } from "react";

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";



import { AuthProvider } from "./contexts/AuthContext";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import ScrollToTop from "./components/common/ScrollToTop";

import Loading from "./components/common/Loading";

import NavBar from "./components/layout/Navbar";

import Footer from "./components/layout/Footer";

import BottomNav from "./components/layout/BottomNav";

import FloatingActions from "./components/layout/FloatingActions";



const HomePage = lazy(() => import("./pages/home"));

const Games = lazy(() => import("./pages/games"));

const Pricing = lazy(() => import("./pages/pricing"));

const FAQ = lazy(() => import("./pages/faq"));

const Support = lazy(() => import("./pages/support"));

const GetSupportPage = lazy(() => import("./pages/support/GetSupportPage"));

const ContactUsPage = lazy(() => import("./pages/support/ContactUsPage"));

const HowItWorks = lazy(() => import("./pages/how-it-works"));

const Auth = lazy(() => import("./pages/auth"));

const AddMoneyPage = lazy(() => import("./pages/wallet/AddMoneyPage"));

const AccountPage = lazy(() => import("./pages/account"));

const GameInfoPage = lazy(() => import("./pages/games/GamePage"));

const BatchOrderPage = lazy(() => import("./pages/batch-order"));

const JjkCheaperPage = lazy(() => import("./pages/events/jjk-cheaper"));

const LegalPage = lazy(() => import("./pages/legal/LegalPage"));



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

  const isAuthRoute = ["/login", "/register", "/auth"].includes(location.pathname);

  const isEventArchive = location.pathname.startsWith("/event/");



  return (

    <>

      {!isWalletRoute && !isEventArchive ? <NavBar /> : null}

      {children}

      {!isWalletRoute && !isHomePage && !isAuthRoute && !isEventArchive ? <Footer /> : null}

      {!isWalletRoute && !isEventArchive ? <BottomNav /> : null}

      {!isWalletRoute && !isEventArchive ? <FloatingActions /> : null}

    </>

  );

};



function MainFrame({ isLoading, mainContentRef, children }) {

  const location = useLocation();

  const isEventArchive = location.pathname.startsWith("/event/");



  return (

    <main

      className={`relative min-h-screen w-full${isEventArchive ? "" : " overflow-x-clip"}`}

      ref={mainContentRef}

      style={{ opacity: isLoading ? 0 : 1 }}

    >

      {children}

    </main>

  );

};



const LOADING_SESSION_KEY = "pixie_has_loaded";

function App() {

  const [isLoading, setIsLoading] = useState(() => {
    try {
      return sessionStorage.getItem(LOADING_SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });

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

    try {
      sessionStorage.setItem(LOADING_SESSION_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }

    setTimeout(() => {

      setIsLoading(false);

    }, 0);

  }, []);



  return (

    <AuthProvider>
      <AppearanceProvider>
      <Router>

        <>
          <ScrollToTop />

          {isLoading && (

            <Loading

              onComplete={handleLoadingComplete}

              heroContainerRef={mainContentRef}

              heroRef={mainContentRef}

            />

          )}



          <MainFrame isLoading={isLoading} mainContentRef={mainContentRef}>

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

                  <Route path="/support/get-support" element={<GetSupportPage />} />

                  <Route path="/support/contact-us" element={<ContactUsPage />} />

                  <Route path="/how-it-works" element={<HowItWorks />} />

                  <Route path="/auth" element={<Auth />} />

                  <Route path="/login" element={<Auth />} />

                  <Route path="/register" element={<Auth />} />

                  <Route path="/account/*" element={<AccountPage />} />

                  <Route path="/batch-order" element={<BatchOrderPage />} />

                  <Route path="/event/jjk-cheaper" element={<JjkCheaperPage />} />

                  <Route path="/terms" element={<LegalPage docKey="terms" />} />

                  <Route path="/privacy" element={<LegalPage docKey="privacy" />} />

                  <Route path="/refund-policy" element={<LegalPage docKey="refund" />} />

                </Routes>

              </Suspense>

            </AppShell>

          </MainFrame>

        </>

      </Router>
      </AppearanceProvider>
    </AuthProvider>

  );

}

export default App;

