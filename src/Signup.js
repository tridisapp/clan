// src/Signup.js
import React, { useState } from 'react';
import axios from 'axios';

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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: '#2f3136', color: '#fff'
    }}>
      <form onSubmit={handleSignup} style={{
        display: 'flex', flexDirection: 'column', width: '300px',
        padding: '20px', backgroundColor: '#36393f', borderRadius: '8px'
      }}>
        <h2 style={{ textAlign: 'center' }}>Inscription</h2>
        <input
          type="text"
          placeholder="Utilisateur"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ marginBottom: '10px', padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ marginBottom: '10px', padding: '8px' }}
        />
        <button type="submit" style={{
          padding: '10px', backgroundColor: '#7289da',
          color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
        }}>
          S’inscrire
        </button>
      </form>
    </div>
  );
}

