import Logo from './Logo';
import Profile from './Profile';
import '../index.css';
import { useLocation } from '@solidjs/router';

export default function Layout(props) {
  const location = useLocation();
  const showProfile = () => {
    return location.pathname !== '/profile';
  };
  return (
    <div class="layout-container">
      <div class="logo-area">
        <Logo />
      </div>
      <main class="content-area">
        {props.children}  
      </main>
      <aside class="profile-area">
        {showProfile() &&  <Profile />}
      </aside>
    </div>
  );
}