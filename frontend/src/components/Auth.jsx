import React, { useState } from 'react';
import { signup, login } from '../services/api';
import { User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const data = await login(email, password);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onAuthSuccess();
      } else {
        await signup(email, password);
        setIsLogin(true); // Switch to login after signup
        alert("Account created! Please login.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <User size={32} color="#3b82f6" />
          </div>
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>{isLogin ? "Enter your credentials to access DesignIQ" : "Join the multi-industry CAD platform"}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-with-icon">
              <Mail size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="input-with-icon">
              <Lock size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" className="primary-btn auth-btn" disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={18} /> : (isLogin ? "Login" : "Sign Up")}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => setIsLogin(!isLogin)} className="text-btn">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
