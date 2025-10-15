import { Composio } from '@composio/core';

export const getComposio = () => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not set');
  }
  return new Composio({ apiKey });
};
