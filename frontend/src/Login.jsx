import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      {/* Left Side: Focus Zone */}
      <div className="login-left">
        <motion.div 
          className="login-form-wrapper"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Link to="/" className="login-logo">ADAPTIVE MINDS</Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <h1 className="login-heading">Welcome back.</h1>
            <p className="login-subheading">Continue your journey into deep learning.</p>
          </motion.div>

          <motion.form 
            className="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            onSubmit={(e) => {
              e.preventDefault();
              navigate('/dashboard');
            }}
          >
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your email" />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input type="password" placeholder="Enter your password" />
            </div>
            
            <div className="form-actions">
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>
            
            <motion.button 
              type="submit" 
              className="login-submit-btn"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              Log In
            </motion.button>
          </motion.form>
          
          <motion.p 
            className="login-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Don't have an account? <Link to="/signup">Sign up</Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Right Side: The Immersion */}
      <div className="login-right">
        <motion.img 
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop" 
          alt="Misty deep-pine forest at dawn" 
          className="login-bg-image"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
        />
        <div className="login-bg-overlay"></div>
        <motion.div 
          className="login-quote"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
        >
          "Mastery is a journey of a thousand focused moments."
        </motion.div>
      </div>
    </div>
  );
}
