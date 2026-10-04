import logoImage from '../assets/logo2.png';
import { useNavigate } from '@solidjs/router';

export default function Logo() {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/timeline');
  };

  return (
    <>
      <style>
        {`  
          .logo-image {
            width: 100%;
            height: auto;
            object-fit: contain;
            cursor: pointer;
            transition: opacity 0.2s ease;
          }
          
          .logo-image:hover {
            opacity: 0.8;
          }
        `}
      </style>
      <div class="img-container" onClick={handleLogoClick}>
        <img src={logoImage} alt="Logo" class="logo-image" />
      </div>
    </>
  );
}