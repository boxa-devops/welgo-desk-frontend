import { render } from 'preact';
import './index.css';
import App from './App.jsx';
import posthog from 'posthog-js';
import { PostHogCtx } from './lib/posthog.jsx';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
});

render(
  <PostHogCtx.Provider value={posthog}>
    <App />
  </PostHogCtx.Provider>,
  document.getElementById('app')
);
