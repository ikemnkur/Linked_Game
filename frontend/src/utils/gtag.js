// src/utils/gtag.js
export const GA_TRACKING_ID = 'G-9H48T60E39';

export const pageview = (url) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
    });
  }
};

export const event = ({ action, category, label, value }) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};