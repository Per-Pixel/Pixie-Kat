import React from 'react';
import UsageExample from './UsageExample';
import { AnimationShowcase } from '../index';

const App = () => {
  return (
    <div>
      {/* Option 1: Use the individual components as shown in the usage example */}
      <UsageExample />
      
      {/* Option 2: Use the showcase component that demonstrates all animations */}
      {/* <AnimationShowcase /> */}
    </div>
  );
};

export default App;