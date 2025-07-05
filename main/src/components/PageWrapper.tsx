import React from 'react';
import { useRef, useState } from "react";

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper = ({ children }: PageWrapperProps) => {
  return (
    <div className="min-h-screen pt-16">
      {children}
    </div>
  );
};

export default PageWrapper;