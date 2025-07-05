import gsap from "gsap";

export const use3DHoverEffect = (elementRef, contentRef) => {
  const handleMouseMove = ({ clientX, clientY, currentTarget }) => {
    const rect = currentTarget.getBoundingClientRect();
    const xOffset = clientX - (rect.left + rect.width / 2);
    const yOffset = clientY - (rect.top + rect.height / 2);

    gsap.to(elementRef.current, {
      x: xOffset,
      y: yOffset,
      rotationY: xOffset / 2,
      rotationX: -yOffset / 2,
      transformPerspective: 500,
      duration: 1,
      ease: "power1.out",
    });

    gsap.to(contentRef.current, {
      x: -xOffset,
      y: -yOffset,
      duration: 1,
      ease: "power1.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(elementRef.current, {
      x: 0,
      y: 0,
      rotationY: 0,
      rotationX: 0,
      duration: 1,
      ease: "power1.out",
    });

    gsap.to(contentRef.current, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "power1.out",
    });
  };

  return { handleMouseMove, handleMouseLeave };
};