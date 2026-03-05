import React, { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastCtx = createContext({ success: () => {}, error: () => {}, info: () => {} });

export function ToastProvider({ children }){
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ severity: 'info', message: '' });

  const show = useCallback((severity, message) => {
    setState({ severity, message });
    setOpen(true);
  }, []);

  const value = {
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m)
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Snackbar open={open} autoHideDuration={3000} onClose={()=>setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={()=>setOpen(false)} severity={state.severity} variant="filled" sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </ToastCtx.Provider>
  );
}


export const useToast = () => useContext(ToastCtx);