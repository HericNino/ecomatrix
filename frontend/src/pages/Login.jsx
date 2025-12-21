import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    lozinka: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.lozinka);
      toast.success('Uspješno ste se prijavili!');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom prijave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="logo">⚡</div>
          <h1>EcoMetrix</h1>
          <p>Dobrodošli nazad</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email adresa</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="korisnik@primjer.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lozinka">Lozinka</label>
            <input
              type="password"
              id="lozinka"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              required
              placeholder="Unesite lozinku"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Prijava u tijeku...' : 'Prijavi se'}
          </button>

          <p className="auth-footer">
            Nemate račun? <Link to="/register">Kreirajte novi račun</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
