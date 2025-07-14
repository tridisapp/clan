// src/Signup.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://127.0.0.1:3001';

export default function Signup({ onSignedUp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/signup`, { username, password });
      alert(res.data.message || 'Inscription réussie !');
      onSignedUp(username);
    } catch (err) {
      const msg = err.response?.data?.error
        || 'Impossible de joindre le serveur.';
      alert(`Inscription impossible : ${msg}`);
    }
  };

  return (
    <div className="centered" style={{ color:'#fff' }}>
      <form onSubmit={handleSignup} className="form" style={{ width:'300px' }}>
        <h2>Inscription</h2>
        <input
          type="text"
          placeholder="Utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">S’inscrire</button>
      </form>
    </div>
  );
}

