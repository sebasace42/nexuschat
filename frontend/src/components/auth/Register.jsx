import { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const Register = ({ onSwitch }) => {
  const { login } = useAuth();
  const [form, setForm]     = useState({ username: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres'); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error de conexión');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-white mb-1">
        Crear cuenta
      </h2>
      <p className="text-text-secondary text-sm mb-6">Únete a NexusChat hoy</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Nombre de usuario', name: 'username', type: 'text',     placeholder: 'tunombre' },
          { label: 'Email',             name: 'email',    type: 'email',    placeholder: 'tu@email.com' },
          { label: 'Contraseña',        name: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
        ].map(({ label, name, type, placeholder }) => (
          <div key={name}>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              {label}
            </label>
            <input type={type} name={name} value={form[name]}
              onChange={handleChange} placeholder={placeholder} required
              className="w-full bg-input border border-white/5 rounded-xl px-4 py-3 text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        ))}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading}
          className="w-full bg-accent hover:bg-accent-bright text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-text-muted text-sm mt-6">
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitch} className="text-accent hover:text-accent-bright font-medium transition-colors">
          Inicia sesión
        </button>
      </p>
    </div>
  );
};
export default Register;