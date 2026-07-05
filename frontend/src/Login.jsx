import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === '/signup';

  return (
    <div className="auth-wrapper">
      {/* Ambient Background */}
      <div className="auth-bg">
        <div className="auth-glow-1"></div>
        <div className="auth-glow-2"></div>
      </div>

      {/* The Centered Card */}
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/" className="auth-logo">Adaptive Minds</Link>
        
        <h1 className="auth-heading">
          {isSignup ? 'Begin your journey.' : 'Welcome back.'}
        </h1>
        <p className="auth-subheading">
          {isSignup 
            ? 'Create an account to enter the sanctuary.' 
            : 'Continue your deep learning session.'}
        </p>

        <form 
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            // Both login and signup lead to dashboard in this mockup
            navigate('/dashboard');
          }}
        >
          {isSignup && (
            <div className="auth-input-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your name" required />
            </div>
          )}
          
          <div className="auth-input-group">
            <label>Email Address</label>
            <input type="email" placeholder="Enter your email" required />
          </div>
          
          <div className="auth-input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" required />
          </div>
          
          <motion.button 
            type="submit" 
            className="auth-submit-btn"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {isSignup ? 'Sign Up' : 'Log In'}
          </motion.button>
        </form>
        
        <p className="auth-footer">
          {isSignup ? 'Already have an account? ' : 'Don\'t have an account? '}
          {isSignup 
            ? <Link to="/login">Log in</Link>
            : <Link to="/signup">Sign up</Link>
          }
        </p>
      </motion.div>
    </div>
  );
}
