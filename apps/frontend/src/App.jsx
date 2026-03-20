import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function App() {
  const [status, setStatus] = useState('checking...');
  const navigate = useNavigate();

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
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Catan Settlement Analyzer</h1>
          <p>AI-Powered Settlement Placement Recommendations</p>
          <p className="hero-subtitle">Using optimization algorithms and historical game data to find the best settlement locations</p>
          <button className="hero-btn" onClick={() => navigate('/build')}>
            Start Building Your Board
          </button>
        </div>
        <div className="hero-background"></div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="section-container">
          <h2>How It Works</h2>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Build Your Board</h3>
              <p>Create a Catan board by placing tiles with resources (Wood, Brick, Wheat, Sheep, Ore, Desert) and assigning dice numbers (2-12) to each tile.</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Choose Your Model</h3>
              <p>Select between two recommendation engines: <strong>Optimization (Value-Based)</strong> for theoretical best locations, or <strong>Historical (ML-Based)</strong> for patterns from winning games.</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Analyze Board</h3>
              <p>The AI analyzes all possible settlement locations and ranks them by strategic value, considering resources, dice numbers, and adjacency rules.</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Place Settlements</h3>
              <p>Select from the top 5 recommended locations for each player's turn. The system enforces Catan rules, ensuring settlements are at least 2 spaces apart.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Catan Rules Section */}
      <section className="catan-rules">
        <div className="section-container">
          <h2>Catan Settlement Rules</h2>
          
          <div className="rules-grid">
            <div className="rule-card">
              <h3>🎲 Resource Production</h3>
              <p>When a dice roll matches a tile's number, that tile produces resources. Players collect these resources from all settlements touching that tile.</p>
            </div>

            <div className="rule-card">
              <h3>📍 Settlement Placement</h3>
              <p>Settlements can only be built at corners where three tiles meet. No two settlements can be on the same vertex (corner). Settlements must be at least one edge (2 vertices) apart from any other settlement.</p>
            </div>

            <div className="rule-card">
              <h3>💰 Resource Values</h3>
              <p>Not all resources are equally valuable. In Catan, settlements touching Wheat and Ore are typically more desirable because these resources are essential for building.</p>
            </div>

            <div className="rule-card">
              <h3>🎯 Dice Distribution</h3>
              <p>The numbers 6 and 8 appear most frequently (5/36 probability each). Numbers like 2 and 12 are rare (1/36 each). Higher probability dice numbers generate resources more often.</p>
            </div>

            <div className="rule-card">
              <h3>🌍 Resource Diversity</h3>
              <p>Settlements touching multiple different resource types are valuable because they provide production flexibility. Diverse settlements are less vulnerable to dice rolls.</p>
            </div>

            <div className="rule-card">
              <h3>⚠️ The Desert</h3>
              <p>Desert tiles don't produce resources and have no dice number. While they break up board patterns, settlements touching deserts are generally less valuable than other locations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Two Models Explained */}
      <section className="models-section">
        <div className="section-container">
          <h2>Recommendation Models</h2>
          
          <div className="models-grid">
            <div className="model-card optimization">
              <h3>Optimization Model (Value-Based)</h3>
              <p>Uses mathematical scoring to evaluate settlements based on:</p>
              <ul>
                <li>Resource value (Wheat/Ore weighted higher)</li>
                <li>Dice number probability</li>
                <li>Resource diversity score</li>
                <li>Number of touching tiles</li>
              </ul>
              <p className="model-desc">Best for: Theoretical optimal play and pure value optimization.</p>
            </div>

            <div className="model-card historical">
              <h3>Historical Model (ML-Based)</h3>
              <p>Uses machine learning to identify patterns from 44,000+ historical games:</p>
              <ul>
                <li>K-means clustering on winning settlements</li>
                <li>Learns resource combinations that actually won</li>
                <li>Matches your board to historical patterns</li>
                <li>Provides confidence scores</li>
              </ul>
              <p className="model-desc">Best for: Learning from real game patterns and practical strategy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-container">
          <h2>Key Features</h2>
          
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <h4>Intelligent Analysis</h4>
              <p>Analyzes all 54 possible settlement locations on a Catan board instantly</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🤖</span>
              <h4>Machine Learning</h4>
              <p>Trained on thousands of real Catan games to predict winning patterns</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <h4>Dual Models</h4>
              <p>Compare optimization and historical recommendations for better insights</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h4>Real-Time Scoring</h4>
              <p>See detailed scores and confidence metrics for each recommendation</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <h4>Rule Enforcement</h4>
              <p>Automatically enforces Catan settlement placement rules</p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <h4>Multi-Player Support</h4>
              <p>Track recommendations for all 4 players in turn order</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <h2>Ready to Master Catan?</h2>
          <p>Build your first board and discover the best settlement placements with AI-powered analysis.</p>
          <button className="cta-btn" onClick={() => navigate('/build')}>
            Launch Board Builder
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>Catan Settlement Analyzer • AI-Powered Strategy Tool</p>
        <p className="status">API Status: <span className={`status-${status}`}>{status}</span></p>
      </footer>
    </div>
  );
}

export default App;