import React from "react";
import "./SecretPopup.css";
import { supabase } from "../supabaseClient";

// ✅ 接收一个新的 onUploadComplete prop
export default function SecretPopup({ onClose, onUploadComplete }) {
  // ✅ handleFileSelect 现在需要知道上传的类型
  const handleFileSelect = async (e, imageType) => {
    const files = e.target.files;
    if (!files.length) return;

    // 阻止弹窗关闭，直到上传完成
    e.stopPropagation(); 

    console.log(`开始上传 ${imageType} 类型的图片...`);
    const newUploads = [];

    for (const file of files) {
      // ✅ 在存储路径中也加入类型，便于管理
      const filePath = `${imageType}s/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("photos") // 你的 bucket 名字
        .upload(filePath, file);

      if (uploadError) {
        console.error("❌ 上传到 Storage 失败:", uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("photos")
        .getPublicUrl(filePath);
      
      const newUrl = publicUrlData.publicUrl;

      // ✅ 关键步骤：将新文件的信息插入数据库
      const { error: insertError } = await supabase
        .from('images') // 我们创建的表名
        .insert([
          { url: newUrl, type: imageType },
        ]);

      if (insertError) {
        console.error("❌ 插入数据库失败:", insertError);
        // (可选) 在这里可以添加逻辑删除刚刚上传的文件，以保持数据一致性
      } else {
        newUploads.push({ url: newUrl, type: imageType });
      }
    }

    // ✅ 上传完成，通知 App 组件有新的图片
    if (onUploadComplete && newUploads.length > 0) {
      onUploadComplete(newUploads);
    }
    
    // 所有操作完成后关闭弹窗
    onClose();
  };

  // ✅ 为不同按钮触发同一个 input，但传递不同类型
  const triggerFileInput = (imageType) => {
    const fileInput = document.getElementById("fileInput");
    // 动态添加一个一次性的 change listener
    fileInput.onchange = (e) => handleFileSelect(e, imageType);
    fileInput.click();
  };

  return (
    <div className="secret-overlay" onClick={onClose}>
      <div className="secret-container" onClick={(e) => e.stopPropagation()}>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
        />

        {/* ✅ 点击时传入 'photo' 类型 */}
        <button className="secret-btn" onClick={() => triggerFileInput('photo')}>
          The Moment
        </button>
        {/* ✅ 点击时传入 'ticket' 类型 */}
        <button className="secret-btn" onClick={() => triggerFileInput('ticket')}>
          On The Way
        </button>
      </div>
    </div>
  );
}