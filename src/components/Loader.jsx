import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Loader = ({ words = ["暂无数据"], interval = 3000, width = 400 }) => {
  const [idx, setIdx] = useState(0);
  const list = words.length ? words : ["暂無數據"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % list.length);
    }, interval);
    return () => clearInterval(timer);
  }, [list.length, interval]);

  return (
    <StyledWrapper $width={width}>
      <div className="card">
        <div className="loader">
          <p className="loader-prefix">要知道</p>
          <div className="viewport">
            <span key={idx} className="word">
              {list[idx]}
            </span>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* --- PC 默认样式 --- */
  .card {
    background-color: transparent;
    padding-left: 0;
    padding-right: 0;
    border-radius: 8px;
    display: inline-block;
    text-align: right; /* ✅ PC右对齐 */
  }

  .loader {
    font-family: "JetBrains Mono", monospace;
    font-weight: bold;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: flex-end; /* ✅ PC右对齐 */
    color: #4a5568;
  }

  .loader-prefix {
    display: none;
  }

  .viewport {
    position: relative;
    width: ${(props) => props.$width}px;
    height: 20px;
    overflow: hidden;
    display: flex;
    justify-content: flex-end; /* ✅ PC右对齐 */
  }

  .word {
    display: inline-block;
    line-height: 20px;
    color: #8a5cf6;
    animation: loaderFade 3s linear forwards;
    will-change: opacity, transform;
    transform-origin: center;
    white-space: nowrap;
  }

  @keyframes loaderFade {
    0% {
      opacity: 0;
      transform: translateY(6px) scale(0.99);
    }
    12% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    88% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-6px) scale(0.99);
    }
  }

  /* --- 移动端样式 --- */
  @media (max-width: 768px) {
    .card {
      display: block;
      width: 100%;
      text-align: left; /* ✅ 左对齐 */
      margin-top: 10px;
    }

    .loader {
      font-size: 13px;
      justify-content: flex-start; /* ✅ 左对齐 */
    }
    
    .loader-prefix {
      display: block;
      margin: 0;
      margin-right: 0.5em;
      white-space: nowrap;
    }

    .viewport {
      width: 100%;
      height: 22px;
      justify-content: flex-start; /* ✅ 左对齐 */
    }

    .word {
      line-height: 22px;
      font-size: 12px;
    }
  }
`;

export default Loader;
