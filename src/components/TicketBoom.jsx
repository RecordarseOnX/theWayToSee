import React from 'react';
import BoomComponent from './BoomComponent';

const TicketBoom = ({ ticketUrls }) => {
  return (
    <BoomComponent
      imageUrls={ticketUrls}
      buttonText="TK"
      buttonClassName="tk-btn"
      cardClassName="ticket-card"
    />
  );
};

export default TicketBoom;