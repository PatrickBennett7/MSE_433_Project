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

  return null;
}

export default App;