import React, { useState, useRef } from "react";
import "./Header.css";
import ToSeeStats from "./ToSeeStats";
import Loader from "./Loader";
import TitleBtn from "./TitleBtn";
import PhotoBoom from "./PhotoBoom";
import TicketBoom from "./TicketBoom";
import {
  Plane,
  TrainFront,
  TramFront,
  CarTaxiFront,
  Wallet,
  Clock,
} from "lucide-react";

// ✅ 接收 App 传来的所有 props，包括新增的 ticketUrls
function Header({ onSecretOpen, photoUrls, ticketUrls, onClearCache }) {
  const [summary, setSummary] = useState(null);
  const clickCount = useRef(0);
  const timer = useRef(null);

  // ✅ 三连击检测逻辑 (无需改动)
  const handleTripleClick = () => {
    clickCount.current += 1;

    if (clickCount.current === 1) {
      timer.current = setTimeout(() => {
        clickCount.current = 0; // 超时重置
      }, 800);
    }

    if (clickCount.current === 3) {
      clearTimeout(timer.current);
      clickCount.current = 0;
      onSecretOpen(); // 调用从 App 传来的 onSecretOpen 函数
    }
  };

  const fmt = (m) => `${Math.floor(m / 60)}时${m % 60}分`;

  const getWords = () => {
    if (!summary) return ["暂无数据"];
    const { plane, train, highspeed, taxi, totalCost, totalMin } = summary;

    const iconSpanStyle = {
      display: 'inline-flex', // 使用 inline-flex
      alignItems: 'center',   // 垂直居中
      // gap: '0.5em',           // 图标和文字之间的间距
    };

    return [
      <span style={iconSpanStyle}>
        <Plane size={16} strokeWidth={1.8} />
        <span>巨大的噪声代表着分与别{fmt(plane.minutes)}｜{plane.cost}</span>
      </span>,
      <span style={iconSpanStyle}>
        <TramFront size={16} strokeWidth={1.8} />
        <span>最后那几分钟总是很漫长{fmt(highspeed.minutes)}｜{highspeed.cost}</span>
      </span>,
      <span style={iconSpanStyle}>
        <TrainFront size={16} strokeWidth={1.8} />
        <span>摇晃的路上能睡着该多好{fmt(train.minutes)}｜{train.cost}</span>
      </span>,
      <span style={iconSpanStyle}>
        <CarTaxiFront size={16} strokeWidth={1.8} />
        <span>穿梭在彼此生活的街头 | {taxi}</span>
      </span>,
      <span style={iconSpanStyle}>
        <Wallet size={16} strokeWidth={1.8} />
        <span>这一路不一定足够贵 | {totalCost}</span>
      </span>,
      <span style={iconSpanStyle}>
        <Clock size={16} strokeWidth={1.8} />
        <span>但这一路一定足够长 | {fmt(totalMin)}</span>
      </span>,
    ];
  };


  return (
    <header className="header">
      <div className="header-content">
        {/* 左侧：统计与两个爆炸按钮 */}
        <div className="header-left">
          <ToSeeStats onSummaryChange={setSummary} />
          <div className="header-left-right">
            {/* 将照片 URL 传递给 PhotoBoom */}
            <PhotoBoom photoUrls={photoUrls} />
            {/* ✅ 关键改动：将票据 URL 传递给 TicketBoom */}
            <TicketBoom ticketUrls={ticketUrls} />
          </div>
        </div>

        {/* 中间：标题按钮 */}
        <div className="header-center" onClick={handleTripleClick}>
          <TitleBtn />
        </div>

        {/* 右侧：动态统计文字 */}
        <div className="header-right">
          <Loader words={getWords()} />
        </div>
      </div>
    </header>
  );
}

export default Header;