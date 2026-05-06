import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    ime: '',
    prezime: '',
    email: '',
    lozinka: '',
    ponovi_lozinku: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.lozinka !== formData.ponovi_lozinku) {
      toast.error('Lozinke nisu iste');
      return;
    }

    if (formData.lozinka.length < 6) {
      toast.error('Lozinka treba biti duza od 6 znakova');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Dobrodošli u EcoMetrix!');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Nešto je pošlo po zlu');
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
            <h2 className="auth-title">Kreiraj račun</h2>
            <p className="auth-subtitle">Besplatno, bez kreditne kartice</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ime" className="form-label">Ime</label>
                <input
                  type="text"
                  id="ime"
                  name="ime"
                  value={formData.ime}
                  onChange={handleChange}
                  required
                  placeholder="Ime"
                  autoComplete="given-name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prezime" className="form-label">Prezime</label>
                <input
                  type="text"
                  id="prezime"
                  name="prezime"
                  value={formData.prezime}
                  onChange={handleChange}
                  required
                  placeholder="Prezime"
                  autoComplete="family-name"
                  className="form-input"
                />
              </div>
            </div>

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
                placeholder="Minimum 6 znakova"
                minLength={6}
                autoComplete="new-password"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="ponovi_lozinku" className="form-label">Potvrdi lozinku</label>
              <input
                type="password"
                id="ponovi_lozinku"
                name="ponovi_lozinku"
                value={formData.ponovi_lozinku}
                onChange={handleChange}
                required
                placeholder="Ponovite lozinku"
                minLength={6}
                autoComplete="new-password"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Kreiranje računa...' : 'Kreiraj račun'}
            </button>
          </form>

          <div className="auth-footer">
            Već imate račun? <Link to="/login" className="auth-link">Prijavite se</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
