import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * Carga datos de un endpoint GET con estados de carga/error y cancelación
 * al cambiar de club o desmontar el componente (evita mostrar datos del
 * club anterior). `url` null → no se hace la petición.
 */
export const useApi = (url, params) => {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });
  const [reloadKey, setReloadKey] = useState(0);
  const paramsKey = JSON.stringify(params || {});
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    api.get(url, { params: paramsRef.current, signal: controller.signal })
      .then((res) => setState({ data: res.data, error: null, loading: false }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [url, paramsKey, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
};
