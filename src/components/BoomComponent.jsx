import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

// 样式可以复用，或者为它创建一个通用的 Boom.css
import './PhotoBoom.css'; 
import './TicketBoom.css';

const getCardDimensions = (imgWidth, imgHeight) => {
  let baseWidth = 240; // Default for Desktop
  if (window.innerWidth <= 768) baseWidth = 200; // Tablet
  if (window.innerWidth <= 480) baseWidth = 120; // Mobile
  const ratio = imgWidth / imgHeight;
  const ratio16x9 = 16 / 9;
  const ratio4x3 = 4 / 3;
  const ratio1x1 = 1;
  const diff16x9 = Math.abs(ratio - ratio16x9);
  const diff4x3 = Math.abs(ratio - ratio4x3);
  const diff1x1 = Math.abs(ratio - ratio1x1);
  if (diff16x9 < diff4x3 && diff16x9 < diff1x1) return { w: baseWidth, h: baseWidth / ratio16x9 };
  if (diff4x3 < diff1x1) return { w: baseWidth * 0.9, h: (baseWidth * 0.9) / ratio4x3 };
  return { w: baseWidth * 0.8, h: baseWidth * 0.8 };
};
function generateSpreadPositions(cardInfos) {
  const n = cardInfos.length;
  const VIEW_MARGIN = 18;
  const MIN_RADIAL_RATIO = 0.55;
  const MAX_RADIAL_PAD = 0.97;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const positions = [];
  const placedBoxes = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < n; i++) {
    const { w, h } = cardInfos[i];
    let chosen = null;
    let attempt = 0;
    while (attempt < 12 && !chosen) {
      attempt++;
      const angle = (i * Math.PI * 2) / goldenRatio + (Math.random() - 0.5) * 0.15;
      const maxR = maxRadiusForAngle(angle, w, h);
      const minR = Math.max(30, maxR * MIN_RADIAL_RATIO);
      const r = minR + Math.pow(Math.random(), 1.6) * (maxR * MAX_RADIAL_PAD - minR);
      let tx = cx + r * Math.cos(angle);
      let ty = cy + r * Math.sin(angle);
      tx = Math.max(VIEW_MARGIN + w / 2, Math.min(window.innerWidth - VIEW_MARGIN - w / 2, tx));
      ty = Math.max(VIEW_MARGIN + h / 2, Math.min(window.innerHeight - VIEW_MARGIN - h / 2, ty));
      let tooClose = false;
      for (const p of placedBoxes) {
        const d = Math.hypot(p.x - tx, p.y - ty);
        const minAllowed = estimateAvoidDist({ w, h }, p.size);
        if (d < minAllowed) {
          tooClose = true;
          const push = (minAllowed - d) * (0.7 + Math.random() * 0.6);
          tx += Math.cos(angle) * push;
          ty += Math.sin(angle) * push;
          tx = Math.max(VIEW_MARGIN + w / 2, Math.min(window.innerWidth - VIEW_MARGIN - w / 2, tx));
          ty = Math.max(VIEW_MARGIN + h / 2, Math.min(window.innerHeight - VIEW_MARGIN - h / 2, ty));
        }
      }
      let coll = false;
      for (const p of placedBoxes) {
        const d = Math.hypot(p.x - tx, p.y - ty);
        if (d < estimateAvoidDist({ w, h }, p.size) * 0.85) {
          coll = true;
          break;
        }
      }
      if (!coll) {
        chosen = [tx, ty];
        placedBoxes.push({ x: tx, y: ty, size: { w, h } });
        positions.push(chosen);
        break;
      }
    }
    if (!chosen) {
      const tx = cx + (Math.random() - 0.5) * 300;
      const ty = cy + (Math.random() - 0.5) * 300;
      positions.push([tx, ty]);
      placedBoxes.push({ x: tx, y: ty, size: {w, h}});
    }
  }
  relaxPositions(positions, cardInfos);
  return positions;
}
function relaxPositions(positions, cardInfos) {
  const RELAX_ITERATIONS = 8;
  const REPULSION_STRENGTH = 0.8;
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    const forces = positions.map(() => ({ fx: 0, fy: 0 }));
    for (let i = 0; i < positions.length; i++) {
      const [x1, y1] = positions[i];
      for (let j = i + 1; j < positions.length; j++) {
        const [x2, y2] = positions[j];
        const d = Math.hypot(x1 - x2, y1 - y2);
        const minD = estimateAvoidDist(cardInfos[i], cardInfos[j]);
        if (d < minD && d > 0) {
          const repel = ((minD - d) * REPULSION_STRENGTH) / d;
          forces[i].fx += (x1 - x2) * repel;
          forces[i].fy += (y1 - y2) * repel;
          forces[j].fx -= (x1 - x2) * repel;
          forces[j].fy -= (y1 - y2) * repel;
        }
      }
    }
    for (let i = 0; i < positions.length; i++) {
      const { w, h } = cardInfos[i];
      positions[i][0] += forces[i].fx;
      positions[i][1] += forces[i].fy;
      positions[i][0] = Math.max(18 + w/2, Math.min(window.innerWidth - 18 - w/2, positions[i][0]));
      positions[i][1] = Math.max(18 + h/2, Math.min(window.innerHeight - 18 - h/2, positions[i][1]));
    }
  }
}
function maxRadiusForAngle(angle, w, h) {
  const VIEW_MARGIN = 18;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const leftBound = VIEW_MARGIN + w / 2;
  const rightBound = window.innerWidth - VIEW_MARGIN - w / 2;
  const topBound = VIEW_MARGIN + h / 2;
  const bottomBound = window.innerHeight - VIEW_MARGIN - h / 2;
  const ts = [];
  if (Math.abs(dx) > 1e-6) {
    if ((leftBound - cx) / dx > 0) ts.push((leftBound - cx) / dx);
    if ((rightBound - cx) / dx > 0) ts.push((rightBound - cx) / dx);
  }
  if (Math.abs(dy) > 1e-6) {
    if ((topBound - cy) / dy > 0) ts.push((topBound - cy) / dy);
    if ((bottomBound - cy) / dy > 0) ts.push((bottomBound - cy) / dy);
  }
  return ts.length > 0 ? Math.min(...ts) : 0;
}
function estimateAvoidDist(a, b) {
  const da = Math.hypot(a.w, a.h) * 0.55;
  const db = Math.hypot(b.w, b.h) * 0.55;
  return (da + db) * 0.9;
}

const BoomComponent = ({ imageUrls, buttonText, buttonClassName, cardClassName }) => {
  const [isExploding, setIsExploding] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [cards, setCards] = useState([]);
  const explodingRef = useRef(isExploding);

  useEffect(() => {
    explodingRef.current = isExploding;
  }, [isExploding]);

  useEffect(() => {
    const loadPhotosFromUrls = async () => {
      if (!imageUrls || imageUrls.length === 0) {
        setPhotos([]);
        return;
      }
      const photoPromises = imageUrls.map(url => new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve({ src: img.src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        img.onerror = reject;
      }));
      try {
        const loadedPhotos = await Promise.all(photoPromises);
        setPhotos(loadedPhotos);
      } catch (error) {
        console.error("加载图片资源时出错", error);
      }
    };
    loadPhotosFromUrls();
  }, [imageUrls]);

const absorbBack = useCallback(() => {
    if (!explodingRef.current) return;

    setCards(currentCards =>
      currentCards.map((card, idx) => ({
        ...card,
        // Create a clean style object to avoid conflicts
        style: {
          width: card.initialStyle.width,
          height: card.initialStyle.height,
          transitionDuration: `${600 + Math.random() * 220}ms`,
          transitionDelay: `${idx * 12}ms`,
          transform: `translate(-50%, -50%) scale(0.18) rotate(0deg)`,
          opacity: 0,
        },
      }))
    );

    const maxDelay = (photos.length - 1) * 12;
    const maxDuration = 600 + 220;
    setTimeout(() => {
      setCards([]);
      setIsExploding(false);
    }, maxDelay + maxDuration + 200);
  }, [photos.length]);

  const explode = () => {
    if (isExploding || photos.length === 0) return;
    setIsExploding(true);

    const sizedPhotos = photos.map(p => ({
      ...p,
      ...getCardDimensions(p.naturalWidth, p.naturalHeight)
    }));
    const positions = generateSpreadPositions(sizedPhotos);

    const newCards = sizedPhotos.map((photo, idx) => {
      const [tx, ty] = positions[idx];
      const rot = Math.random() * 80 - 40;
      return {
        id: idx,
        src: photo.src,
        // ✅ FIX: Add a one-time flag
        isInitial: true, 
        finalStyle: {
          opacity: 1,
          transform: `translate(${tx - window.innerWidth / 2}px, ${ty - window.innerHeight / 2}px) translate(-50%, -50%) rotate(${rot}deg) scale(${0.9 + Math.random() * 0.2})`,
          transitionDuration: `${1200 + Math.random() * 800}ms`,
          transitionDelay: `${Math.random() * 160}ms`,
        },
        initialStyle: {
          width: `${photo.w}px`,
          height: `${photo.h}px`,
          transform: `translate(-50%, -50%) scale(0.28) rotate(${rot * 0.15}deg)`,
          opacity: 0,
        },
      };
    });

    setCards(newCards.map(c => ({...c, style: c.initialStyle})));
    setTimeout(absorbBack, 4000);
  };

  useEffect(() => {
    // ✅ FIX: Only run if there are cards AND it's their initial setup
    if (cards.length === 0 || !cards[0]?.isInitial) {
      return;
    }

    const animationTimeout = setTimeout(() => {
      setCards(currentCards =>
        currentCards.map(c => ({
          ...c,
          // Remove the flag so this doesn't run again
          isInitial: false, 
          style: { ...c.style, ...c.finalStyle },
        }))
      );
    }, 10);
    return () => clearTimeout(animationTimeout);
  }, [cards]);

  useEffect(() => {
    const handleResize = () => {
      if (explodingRef.current) {
        absorbBack();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [absorbBack]);


  return (
    <>
      <button onClick={explode} disabled={isExploding || photos.length === 0} className={buttonClassName}>
        {buttonText}
      </button>
      {cards.length > 0 &&
        ReactDOM.createPortal(
          <div className="card-stage">
            {cards.map(card => (
              <div
                key={card.id}
                className={cardClassName} // ✅ 使用 prop
                style={{
                  ...card.style,
                  backgroundImage: `url(${card.src})`,
                }}
              />
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default BoomComponent;