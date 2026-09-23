import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';

export const Login = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password, show2FA ? totpCode : undefined);
      if (res?.requires2FA) {
        setShow2FA(true);
        setError('Introduce el código de 6 dígitos de tu app de autenticación (2FA).');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión.');
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
            <span className="font-scoreboard text-led text-sm tracking-widest uppercase">Matchday Access</span>
          </div>
          <h1 className="text-2xl font-scoreboard tracking-wide uppercase text-main">Football Hub</h1>
          <p className="text-xs font-mono text-muted uppercase mt-1 tracking-wider">Centro de Inteligencia y Pronósticos</p>
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
              Contraseña
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

          {show2FA && (
            <div className="p-3 border border-led/40 bg-pitch/70">
              <label className="block text-xs font-mono uppercase text-led tracking-wider mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Código 2FA (6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-pitch border border-led px-3 py-2 text-led font-scoreboard tracking-[0.3em] text-center text-lg focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-led hover:bg-yellow-400 text-pitch font-scoreboard tracking-wider uppercase py-3 text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verificando Credenciales...' : show2FA ? 'Confirmar Acceso 2FA' : 'Ingresar al Estadio'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-hairline text-center text-xs font-mono text-muted">
          <span>¿No tienes credenciales? </span>
          <button
            onClick={onSwitchToRegister}
            className="text-led hover:underline uppercase tracking-wider font-semibold cursor-pointer"
          >
            Registrarse aquí
          </button>
        </div>
      </div>
    </div>
  );
};