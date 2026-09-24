import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Check, X } from 'lucide-react';
import { checkPassword, isStrongPassword } from '../utils/passwordPolicy';
import { errorMessage } from '../utils/errors';

export const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const rules = checkPassword(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(password)) {
      setError('La contraseña no cumple todos los requisitos.');
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
      setError(errorMessage(err, 'No se pudo crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-pitch border border-hairline px-3.5 py-2.5 text-main font-mono text-sm focus:border-led focus:outline-none';

  return (
    <div className="min-h-screen flex items-center justify-center bg-pitch px-4 py-8">
      <div className="max-w-md w-full border border-hairline bg-surface p-6 sm:p-8">
        <div className="text-center mb-6 border-b border-hairline pb-5">
          <h1 className="text-2xl font-scoreboard tracking-wide uppercase text-main">Crear cuenta</h1>
          <p className="text-xs text-muted mt-1">Football Hub · análisis de tu club</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-loss/15 border border-loss text-xs font-mono text-main flex items-start gap-2" role="alert">
            <ShieldAlert className="w-4 h-4 text-loss flex-shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reg-email" className="block text-xs font-mono uppercase text-muted mb-1.5">Correo electrónico</label>
            <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-xs font-mono uppercase text-muted mb-1.5">Contraseña</label>
            <input id="reg-password" type="password" required autoComplete="new-password" maxLength={72} value={password}
              onChange={(e) => setPassword(e.target.value)} aria-describedby="password-rules" className={inputCls} />
            <ul id="password-rules" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono">
              {rules.map((r) => (
                <li key={r.id} className={`flex items-center gap-1.5 ${r.ok ? 'text-win' : 'text-muted'}`}>
                  {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {r.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <label htmlFor="reg-confirm" className="block text-xs font-mono uppercase text-muted mb-1.5">Confirmar contraseña</label>
            <input id="reg-confirm" type="password" required autoComplete="new-password" maxLength={72} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
            {confirmPassword && confirmPassword !== password && <p className="text-[11px] text-loss font-mono mt-1">No coincide.</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-led hover:bg-yellow-400 text-pitch font-scoreboard uppercase py-3 text-sm tracking-wider disabled:opacity-50">
            {loading ? 'Creando cuenta…' : 'Registrarme'}
          </button>
        </form>

        <p className="mt-6 pt-5 border-t border-hairline text-center text-xs text-muted">
          ¿Ya tienes cuenta?{' '}
          <button onClick={onSwitchToLogin} className="text-led hover:underline font-semibold">Inicia sesión</button>
        </p>
      </div>
    </div>
  );
};
