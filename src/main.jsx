// TauriViteReact/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // Import Redux Provider
import { store } from './app/store';    // Import your configured store
import App from './App';
import './App.css'; // Import main CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap the entire App component with the Redux Provider */}
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);