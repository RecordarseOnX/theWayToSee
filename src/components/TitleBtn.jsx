import React from 'react';
import styled from 'styled-components';

const TitleBtn = () => {
  return (
    <StyledWrapper>
      <button style={{ "--i": "#a955ff", "--j": "#ea51ff" }}>
        <span className="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            fill="currentColor"
            className="bi bi-heart"
            viewBox="0 0 16 16"
          >
            <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z" />
          </svg>
        </span>
        <span className="title">You And Me</span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  button {
    background-color: #fff;
    position: relative;
    list-style: none;
    width: 60px;
    height: 60px;
    border-radius: 60px;
    cursor: pointer;
    box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.5s;
    border: none;

    /* CSS 变量定义在这里会被继承 */
    --i: #a955ff;
    --j: #ea51ff;
  }

  button:active {
    scale: 1.2;
  }

  button:hover {
    width: 180px;
    box-shadow: 0px 10px 25px rgba(0, 0, 0, 0);
  }

  button::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 60px;
    background: linear-gradient(45deg, var(--i), var(--j));
    opacity: 0;
    transition: 0.5s;
  }

  button:hover::before {
    opacity: 1;
  }

  button::after {
    content: '';
    position: absolute;
    top: 10px;
    width: 100%;
    height: 100%;
    border-radius: 60px;
    background: linear-gradient(45deg, var(--i), var(--j));
    filter: blur(15px);
    transition: 0.5s;
    z-index: -1;
    opacity: 0;
  }

  button:hover::after {
    opacity: 0.5;
  }

  button svg {
    color: #777;
    width: auto;
    height: 30px;
    transition: 0.5s;
    transition-delay: 0.25s;
  }

  button:hover svg {
    transform: scale(0);
    color: #fff;
    transition-delay: 0s;
  }

  button span {
    position: absolute;
  }

  button .title {
    color: #fff;
    font-size: 1.3em;
    letter-spacing: 0.1em;
    transform: scale(0);
    transition: 0.5s;
    transition-delay: 0s;
    font-weight: 600;
  }

  button:hover .title {
    transform: scale(1);
    transition-delay: 0.25s;
  }
  
  /* Mobile-specific styles for the title button */
  @media (max-width: 768px) {
    button {
      width: 34px;
      height: 34px;
      border-radius: 34px;
    }
    
    button:hover {
      width: 140px; /* Make the hover effect less wide on mobile */
    }

    button::before {
      border-radius: 34px;
    }

    button::after {
      border-radius: 34px;
    }

    button svg {
      height: 18px; /* Scale down the icon to fit the smaller button */
    }
      
    button .title {
      font-size: 1.1em;
      font-weight: 500;
      letter-spacing: 0.05em;
    }
  }
`;

export default TitleBtn;