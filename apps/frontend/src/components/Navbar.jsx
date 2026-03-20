import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const renderLinks = () => {
    return [
      { label: 'Home', path: '/' },
      { label: 'Build Board', path: '/build' },
    ].map((link) => (
      <li key={link.path}>
        <a href={link.path} onClick={(e) => {
          e.preventDefault();
          navigate(link.path);
        }}>
          {link.label}
        </a>
      </li>
    ));
  };

  return (
    <nav className="navbar">
      <ul className="navbar-links">{renderLinks()}</ul>
    </nav>
  );
};

export default Home;
