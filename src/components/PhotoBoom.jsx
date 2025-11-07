import React from 'react';
import BoomComponent from './BoomComponent';

const PhotoBoom = ({ photoUrls }) => {
  return (
    <BoomComponent
      imageUrls={photoUrls}
      buttonText="CP"
      buttonClassName="cp-btn"
      cardClassName="photo-card"
    />
  );
};

export default PhotoBoom;