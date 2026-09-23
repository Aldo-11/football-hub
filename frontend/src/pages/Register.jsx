import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Error al crear cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pitch px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full border border-hairline bg-surface p-8 relative">
        {/* Top scoreboard branding */}
        <div className="text-center mb-8 border-b border-hairline pb-6">
          <div className="inline-block border border-led/50 px-3 py-1 bg-pitch mb-3">
            <span className="font-scoreboard text-led text-sm tracking-widest uppercase">Registro de Aficionado</span>
          </div>
          <h1 className="text-2xl font-scoreboard tracking-wide uppercase text-main">Crear Cuenta</h1>
          <p className="text-xs font-mono text-muted uppercase mt-1 tracking-wider">Acceso a la Liga y Modelos de Inteligencia</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-loss/15 border border-loss text-xs font-mono text-main flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-loss flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-pitch border border-hairline px-3.5 py-2.5 text-main font-mono text-sm focus:border-led focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-muted tracking-wider mb-1.5">
              Contraseña (mínimo 8 caracteres)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-pitch border border-hairline px-3.5 py-2.5 text-main font-mono text-sm focus:border-led focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-muted tracking-wider mb-1.5">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-pitch border border-hairline px-3.5 py-2.5 text-main font-mono text-sm focus:border-led focus:outline-none transition-colors"
            />
          </div>

          <div className="py-2 text-[11px] font-mono text-muted flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-win" />
            <span>Hash bcrypt (cost factor 12) + Sesión con cookies seguras</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-led hover:bg-yellow-400 text-pitch font-scoreboard tracking-wider uppercase py-3 text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creando Perfil...' : 'Confirmar Registro'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-hairline text-center text-xs font-mono text-muted">
          <span>¿Ya tienes credenciales? </span>
          <button
            onClick={onSwitchToLogin}
            className="text-led hover:underline uppercase tracking-wider font-semibold cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};