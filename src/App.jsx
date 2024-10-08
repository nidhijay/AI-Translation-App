import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import CompareTranslate from "./compartranslate";
import Translator from "./translator";
import "./App.css"; // Ensure CSS is imported

const App = () => {
  return (
    <Router>
      <div>
        <nav className="navbar">
          <ul>
            <li>
              <Link to="/" style={{ color: 'black', textDecoration: 'none' }}>Home</Link>
            </li>
            <li>
              <Link to="/compare-translate" style={{ color: 'black', textDecoration: 'none' }}>Compare Translate</Link>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/compare-translate" element={<CompareTranslate />} />
          <Route path="/" element={<Translator />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
