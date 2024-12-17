import lightGallery from 'lightgallery';
import lgZoom from 'lightgallery/plugins/zoom';

import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';

const gallery = document.getElementById('gallery');
  
lightGallery(gallery, {
  speed: 500, 
  plugins: [lgZoom],
  adaptiveHeight: true,
  zoom: false,
  actualSize: true, // Ensures the image fits within the screen dimensions
  mobileSettings: {
    controls: true,
    showCloseIcon: true,
    zoom: false, // Disable zoom on mobile for better usability
  },
});