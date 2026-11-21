import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getMotionProfile } from "./motionBudget";

let configured = false;

export function configureMotionBudget() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  gsap.registerPlugin(ScrollTrigger);

  const { constrained, lowEnd } = getMotionProfile();

  // Touch devices already ignore small URL-bar resizes. Keep that on so a
  // future default change cannot bring the pin refresh hitch back.
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (constrained) {
    // Give up on catch-up after a short stall so one slow frame does not
    // turn into a stutter while GSAP tries to replay the missed time.
    gsap.ticker.lagSmoothing(250, 16);
    document.documentElement.classList.add("motion-constrained");
  }

  if (lowEnd) {
    gsap.ticker.fps(30);
  }
}
