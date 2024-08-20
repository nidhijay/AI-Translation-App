import React, { useState } from "react";
import Select from "react-select";
import axios from "axios";
import { BeatLoader } from "react-spinners";
import { db, collection, addDoc, serverTimestamp } from "./firebase"; // Adjust the import path as necessary

const Translator = () => {
  const [formData, setFormData] = useState({
    modelChoice: "gemini-1.5-flash-latest",
    temperatureValue: 0.3,
    sourceLanguage: "english",
    destinationLanguage: "french",
    message: "",
    translationText: "",
    synthesize: false,
    moreFormal: false,
    lessFormal: false,
    simpler: false,
    shorter: false
  });

  const [error, setError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  const languageOptions = [
    { value: "english", label: "English" },
    { value: "french", label: "French" },
    // Add more language options as needed
  ];

  const handleInputChange = (selectedOption, { name } = {}) => {
    if (name) {
      setFormData({ ...formData, [name]: selectedOption.value });
    } else if (selectedOption.target) {
      const { type, name, checked, value } = selectedOption.target;
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
    setError("");
  };

  const translateBackend = async () => {
    try {
      const res = await axios.post("https://geminibackend.onrender.com/translate", formData);
      const translatedText = res.data.translate;
      setTranslation(translatedText);
      setShowCheckboxes(true);

      // Update formData with translation
      setFormData(prevFormData => ({
        ...prevFormData,
        translationText: translatedText,
        simpler: false,
        shorter: false,
        moreFormal: false,
        lessFormal: false
      }));

      // Store translation in Firebase
      await addDoc(collection(db, "translations"), {
        ...formData,
        translation: translatedText,
        timestamp: serverTimestamp()
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error during translation:", err);
      setError("An error occurred while translating.");
    }
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();
    setShowCheckboxes(false);
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    const wordCount = formData.message.trim().split(/\s+/).length;
    if (wordCount > 160) {
      setError("The message must be less than 160 words.");
      return;
    }
    setIsLoading(true);
    translateBackend();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translation)
      .then(() => displayNotification())
      .catch(err => console.error("Failed to copy:", err));
  };

  const displayNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  return (
    <div className="container">
      <h1>Translation</h1>
      <form onSubmit={handleOnSubmit}>
        <div className="form-group">
          <label htmlFor="sourceLanguage">Source Language</label>
          <Select
            id="sourceLanguage"
            name="sourceLanguage"
            options={languageOptions}
            value={languageOptions.find(option => option.value === formData.sourceLanguage)}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="destinationLanguage">Destination Language</label>
          <Select
            id="destinationLanguage"
            name="destinationLanguage"
            options={languageOptions}
            value={languageOptions.find(option => option.value === formData.destinationLanguage)}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            rows="5"
          />
        </div>
        <div className="form-group">
          <button type="submit">Translate</button>
        </div>
      </form>
      <div className="translation">
        <div className="copy-btn" onClick={handleCopy}>
          {/* Add your copy button SVG or icon here */}
        </div>
        {isLoading ? <BeatLoader size={12} color={"red"} /> : translation}
      </div>
      <div className={`notification ${showNotification ? "active" : ""}`}>
        Copied to clipboard!
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default Translator;
