# GSAP Animation Components

A collection of reusable animation components built with GSAP for React projects.

## Installation

1. Make sure you have the required dependencies:

```bash
npm install gsap @gsap/react
```

2. Import the CSS styles in your main CSS file:

```css
@import './animations/styles/animations.css';
```

## Available Components

### AnimatedTitle

A text reveal animation that triggers on scroll.

```jsx
import { AnimatedTitle } from './animations';

<AnimatedTitle 
  title="Your <b>Title</b> Here <br /> Second Line" 
  containerClass="custom-class" 
/>
```

### ClipPathExpand

An expanding clip path animation that reveals content.

```jsx
import { ClipPathExpand } from './animations';

<ClipPathExpand 
  id="custom-id" 
  options={{ 
    start: "top center",
    end: "+=600 center",
    scrub: 0.3 
  }}
>
  <YourContent />
</ClipPathExpand>
```

### VideoFrame

A video frame with clip path animation.

```jsx
import { VideoFrame } from './animations';

<VideoFrame 
  id="custom-video" 
  videoSrc="/path/to/video.mp4" 
  options={{ 
    start: "top center",
    end: "bottom top" 
  }}
/>
```

### HoverEffect3D

A 3D hover effect for interactive elements.

```jsx
import { HoverEffect3D } from './animations';

<HoverEffect3D 
  className="custom-container-class"
  contentClassName="custom-content-class"
>
  <YourContent />
</HoverEffect3D>
```

### VideoTransition

A smooth transition between videos.

```jsx
import { VideoTransition } from './animations';

<VideoTransition 
  videos={[
    "/videos/video1.mp4",
    "/videos/video2.mp4",
    "/videos/video3.mp4"
  ]}
  className="custom-class"
/>
```

### AnimationShowcase

A showcase of all available animations.

```jsx