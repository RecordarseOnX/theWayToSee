import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TimeTableContainer from './components/TimeTableContainer';
import SecretPopup from './components/SecretPopup';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [savedEvents, setSavedEvents] = useState(() => { /* ... */ });
  const [secretOpen, setSecretOpen] = useState(false);

  // ✅ 创建两个 state，分别管理照片和票据
  const [photoUrls, setPhotoUrls] = useState([]);
  const [ticketUrls, setTicketUrls] = useState([]);

  // ✅ 新增：在应用启动时从数据库加载所有图片 URL
  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase
        .from('images')
        .select('url, type');

      if (error) {
        console.error("加载图片数据失败:", error);
        return;
      }

      const photos = [];
      const tickets = [];
      for (const image of data) {
        if (image.type === 'photo') {
          photos.push(image.url);
        } else if (image.type === 'ticket') {
          tickets.push(image.url);
        }
      }
      setPhotoUrls(photos);
      setTicketUrls(tickets);
      console.log(`加载完成: ${photos.length} 张照片, ${tickets.length} 张票据`);
    };

    fetchImages();
  }, []); // 空依赖数组，只在组件首次挂载时运行

  const handleClearCache = () => { /* ... */ };

  // ✅ 新增：处理上传完成后的回调
  const handleUploadComplete = (newUploads) => {
    for (const upload of newUploads) {
      if (upload.type === 'photo') {
        setPhotoUrls(prev => [...prev, upload.url]);
      } else if (upload.type === 'ticket') {
        setTicketUrls(prev => [...prev, upload.url]);
      }
    }
  };

  return (
    <div id="root">
      <div className="scroll-container">
        <div className="container">
          {/* ✅ 将正确的 URL 列表传递给 Header */}
          <Header
            onClearCache={handleClearCache}
            onSecretOpen={() => setSecretOpen(true)}
            photoUrls={photoUrls}
            ticketUrls={ticketUrls} // 传递票据 URL
          />
          <div className="timetable-wrapper">
            <TimeTableContainer savedEvents={savedEvents} setSavedEvents={setSavedEvents} />
          </div>
        </div>
      </div>
      {secretOpen && (
        <SecretPopup
          onClose={() => setSecretOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}

export default App;