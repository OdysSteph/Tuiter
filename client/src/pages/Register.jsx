import { createSignal } from 'solid-js';
import '../styles/Register.css';
import logo from '../assets/logo2.png';
import { useNavigate } from '@solidjs/router';

function RegisterPage() {
    const [name, setName] = createSignal('');
    const [username, setUsername] = createSignal('');
    const [password, setPassword] = createSignal('');
    const [confirmPassword, setConfirmPassword] = createSignal('');
    const [errorMessage, setErrorMessage] = createSignal('');
    const [successMessage, setSuccessMessage] = createSignal('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (password() !== confirmPassword()) {
            setErrorMessage('Passwords do not match');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3001/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: name(),
                    username: username(),
                    password: password(),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(data.message || 'Registration successful! Please log in.');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setErrorMessage(data.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Network or server error during registration:', error);
            setErrorMessage('Could not connect to the server for registration. Please try again later.');
        }
    };

    const handleNameInput = (e) => {
        setName(e.target.value);
    };

    const handleUsernameInput = (e) => {
        setUsername(e.target.value);
    };

    const handlePasswordInput = (e) => {
        setPassword(e.target.value);
    };

    const handleConfirmPasswordInput = (e) => {
        setConfirmPassword(e.target.value);
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
                    Register To <span class="brand-name">Tuiter</span>
                </h1>

                {errorMessage() && (
                    <div style={{ color: 'red', "text-align": 'center', "margin-bottom": '15px' }}>
                        {errorMessage()}
                    </div>
                )}
                {successMessage() && (
                    <div style={{ color: 'green', "text-align": 'center', "margin-bottom": '15px' }}>
                        {successMessage()}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} class="auth-form">
                    <div class="form-group">
                        <label for="name" class="form-label">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            class="form-input"
                            value={name()}
                            onInput={handleNameInput}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="username" class="form-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            class="form-input"
                            value={username()}
                            onInput={handleUsernameInput}
                            placeholder="Choose a username"
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
                            placeholder="Create a password"
                            required
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword" class="form-label">Retype Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            class="form-input"
                            value={confirmPassword()}
                            onInput={handleConfirmPasswordInput}
                            placeholder="Confirm your password"
                            required
                        />
                    </div>
                    
                    <button type="submit" class="submit-btn">
                        Register
                    </button>
                </form>
                
                <p class="auth-link">
                    Have an account? <a href="/login" class="link">Log in</a>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;