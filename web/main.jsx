import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './v5/App.jsx';
import {ErrorBoundary} from './v5/ErrorBoundary.jsx';
import './v5/style.css';
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
