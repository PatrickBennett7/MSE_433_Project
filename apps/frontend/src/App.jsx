import { useEffect, useState } from 'react';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function App() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    const endpoint = `${apiBaseUrl}/health`;

    void fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        return response.json();
      })
      .then((data) => {
        setStatus(data.status);
      })
      .catch(() => {
        setStatus('unreachable');
      });
  }, []);

  return (
    <main>
      <h1>MSE 433 Monorepo</h1>
      <p>Frontend + Backend are connected.</p>
      <p>Backend status: {status}</p>
    </main>
  );
}

export default App;