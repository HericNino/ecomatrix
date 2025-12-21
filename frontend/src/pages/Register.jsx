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

    // Validacija lozinki
    if (formData.lozinka !== formData.ponovi_lozinku) {
      toast.error('Lozinke se ne podudaraju');
      return;
    }

    if (formData.lozinka.length < 6) {
      toast.error('Lozinka mora imati najmanje 6 znakova');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      toast.success('Račun uspješno kreiran! Dobrodošli.');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Greška prilikom registracije');
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
          <p>Kreirajte svoj račun</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ime">Ime</label>
              <input
                type="text"
                id="ime"
                name="ime"
                value={formData.ime}
                onChange={handleChange}
                required
                placeholder="Ime"
                autoComplete="given-name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prezime">Prezime</label>
              <input
                type="text"
                id="prezime"
                name="prezime"
                value={formData.prezime}
                onChange={handleChange}
                required
                placeholder="Prezime"
                autoComplete="family-name"
              />
            </div>
          </div>

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
              placeholder="Minimum 6 znakova"
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ponovi_lozinku">Potvrdite lozinku</label>
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
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Kreiranje računa...' : 'Kreiraj račun'}
          </button>

          <p className="auth-footer">
            Već imate račun? <Link to="/login">Prijavite se</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
