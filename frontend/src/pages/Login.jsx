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
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setError('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.lozinka);
      toast.success('Prijava uspješna!');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Greška pri prijavi. Provjerite email i lozinku.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-branding">
        <div className="brand-top">
          <div className="brand-logo-big">E</div>
          <h2 className="brand-headline">Pratite potrošnju energije pametno</h2>
          <p className="brand-sub">EcoMetrix vam omogućuje uvid u potrošnju svakog uređaja u vašem domu.</p>
        </div>
        <div className="brand-features">
          <div className="brand-feature"><span className="brand-feature-dot"></span>Praćenje u stvarnom vremenu</div>
          <div className="brand-feature"><span className="brand-feature-dot"></span>Analiza troškova i ušteda</div>
          <div className="brand-feature"><span className="brand-feature-dot"></span>Ciljevi i preporuke</div>
          <div className="brand-feature"><span className="brand-feature-dot"></span>Izvještaji i usporedbe</div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-brand">EcoMetrix</h1>
            <h2 className="auth-title">Prijava na račun</h2>
            <p className="auth-subtitle">Unesite vaše podatke za prijavu</p>
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email adresa</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="ime@domena.com"
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
            Nemate račun? <Link to="/register" className="auth-link">Registrirajte se</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
