import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    lozinka: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.lozinka);
      toast.success('Prijava uspješna!');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nešto nije uredu, probajte ponovo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-brand">EcoMetrix</h1>
          <h2 className="auth-title">Prijava na nalog</h2>
          <p className="auth-subtitle">Unesite email i lozinku</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="ime@firma.com"
              autoComplete="email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lozinka" className="form-label">Lozinka</label>
            <input
              type="password"
              id="lozinka"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              required
              placeholder="Unesite lozinku"
              autoComplete="current-password"
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Prijava u toku...' : 'Prijavi se'}
          </button>
        </form>

        <div className="auth-footer">
          Nemate nalog? <Link to="/register" className="auth-link">Registruj se</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
