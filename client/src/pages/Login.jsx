import { createSignal } from 'solid-js';
import '../styles/Login.css';
import logo from '../assets/logo2.png';
import { useNavigate } from '@solidjs/router';
import { loginUser } from '../authStore';

function LoginPage() {
    const [username, setUsername] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [errorMessage, setErrorMessage] = createSignal('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const result = await loginUser(username(), password());
        
        if (result.success) {
            navigate('/timeline');
        } else {
            setErrorMessage(result.message || 'Login failed. Please check your credentials.');
        }
    };

    const handleUsernameInput = (e) => {
        setUsername(e.target.value);
    };

    const handlePasswordInput = (e) => {
        setPassword(e.target.value);
    };

    return (
        <div class="auth-container">
            <div class="auth-card">
                <div class="logo-section">
                    <div class="logo">
                        <img class="logo-img" src={logo} alt="Tuiter Logo" />
                    </div>
                </div>
                
                <h1 class="auth-title">
                    Log in to <span class="brand-name">Tuiter</span>
                </h1>

                {errorMessage() && (
                    <div style={{ color: 'red', "text-align": 'center', "margin-bottom": '15px' }}>
                        {errorMessage()}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} class="auth-form">
                    <div class="form-group">
                        <label for="username" class="form-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            class="form-input"
                            value={username()}
                            onInput={handleUsernameInput}
                            placeholder="input username"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            class="form-input"
                            value={password()}
                            onInput={handlePasswordInput}
                            placeholder="input password"
                            required
                        />
                    </div>
                    
                    <button type="submit" class="submit-btn">
                        Log In
                    </button>
                </form>
                
                <p class="auth-link">
                    Don't have an account? <a href="/register" class="link">Sign up</a>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;