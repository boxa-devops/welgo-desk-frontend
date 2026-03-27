import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export const PostHogCtx = createContext(null);

export function usePostHog() {
  return useContext(PostHogCtx);
}
