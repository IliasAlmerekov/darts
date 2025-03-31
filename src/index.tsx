import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './css/index.css'
import { UserProvider } from './provider/UserProvider';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <UserProvider>
    <App />
    </UserProvider>
  </React.StrictMode>
);

