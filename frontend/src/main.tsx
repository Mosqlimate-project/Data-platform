import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  hydrateRoot(rootElement,
    <StrictMode>
      <App />
    </StrictMode>
  );
}
