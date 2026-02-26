import { useNavigate } from 'react-router-dom';
import { AiOutlineUser } from 'react-icons/ai';

const Home = () => {
  const navigate = useNavigate();

  const renderLinks = () => {
    return [
      { label: 'Home', path: '/' },
      { label: 'Build Board', path: '/build' },
      // Add more links as needed
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
      <div className="navbar-profile">
        <a
          href="/Profile"
          onClick={(e) => {
            e.preventDefault();
            navigate("/Profile");
          }}
        >
          <AiOutlineUser className="navbar-profile-icon" />
        </a>
      </div>
    </nav>
  );
};

export default Home;
