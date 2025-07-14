import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:3001';

export default function Profile({ token, onClose, onUpdate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');

  useEffect(() => {
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setUsername(res.data.username);
        setAvatar(res.data.avatar || '');
        setBanner(res.data.banner || '');
      });
  }, [token]);

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const submit = async e => {
    e.preventDefault();
    const body = { username, password, avatar, banner };
    try {
      const res = await axios.put(`${API}/me`, body, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div className="centered">
      <form onSubmit={submit} className="form">
        <h2>Profil</h2>
        <input placeholder="Nom d'utilisateur" value={username} onChange={e=>setUsername(e.target.value)} />
        <input type="password" placeholder="Nouveau mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
        <div style={{ marginTop:8 }}>
          <input type="file" accept="image/*" onChange={async e=>setAvatar(await toBase64(e.target.files[0]))} />
          {avatar && <img src={avatar} alt="avatar" style={{ width:80, height:80, borderRadius:'50%', display:'block', marginTop:8 }} />}
        </div>
        <div style={{ marginTop:8 }}>
          <input type="file" accept="image/*" onChange={async e=>setBanner(await toBase64(e.target.files[0]))} />
          {banner && <img src={banner} alt="banner" style={{ width:'100%', height:60, objectFit:'cover', display:'block', marginTop:8 }} />}
        </div>
        <button type="submit">Enregistrer</button>
        <p className="link" onClick={onClose}>Annuler</p>
      </form>
    </div>
  );
}
