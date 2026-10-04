import { A, useLocation } from "@solidjs/router";
import "../styles/Navbar.css";

export default function Navbar() {
  const location = useLocation();

  return (
    <div class="navbar-wrapper">
      <nav class="navbar-container">
        <A
          href="/timeline" 
          class="nav-item"
          activeClass="active"
          end={true}
        >
          Timeline
        </A>
        <A
          href="/post"
          class="nav-item"
          activeClass="active"
          end={true}
        >
          Posts
        </A>
        <A
          href="/people"
          class="nav-item"
          activeClass="active"
          end={true}
        >
          People
        </A>
      </nav>
    </div>
  );
}