import React, { useState, useEffect } from "react";
import axios from "axios";
import { BeatLoader } from "react-spinners";
import Select from "react-select";
import { db, collection, addDoc, query, where, getDocs, serverTimestamp } from "./firebase"; // Adjust import path as needed

const CompareTranslate = () => {
  const [selectedModels, setSelectedModels] = useState([]);
  const [error, setError] = useState("");
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storedComparisons, setStoredComparisons] = useState([]);
  const [formData, setFormData] = useState({
    selectedModels: [],
    temperatureValue: 0.3,
    sourceLanguage: "english",
    destinationLanguage: "french",
    message: "",
    evaluationResults: {},
    synthesize: false,
  });

  useEffect(() => {
    if (formData.message) {
      fetchStoredComparisons();
    }
  }, [formData.message]);

  const models = {
    "gpt-4o-mini": "gpt-4o-mini",
    "gemini-pro": "gemini-1.5-pro-latest",
    "gemini-flash": "gemini-1.5-flash-latest",
    deepl: "deepl",
  };

  const languageOptions = [
    { value: "arabic", label: "Arabic" },
    { value: "dutch", label: "Dutch" },
    { value: "english", label: "English" },
    { value: "farsi", label: "Farsi" },
    { value: "french", label: "French" },
    { value: "german", label: "German" },
    { value: "greek", label: "Greek" },
    { value: "hebrew", label: "Hebrew" },
    { value: "hindi", label: "Hindi" },
    { value: "italian", label: "Italian" },
    { value: "japanese", label: "Japanese" },
    { value: "korean", label: "Korean" },
    { value: "mandarin", label: "Mandarin" },
    { value: "polish", label: "Polish" },
    { value: "portuguese", label: "Portuguese" },
    { value: "russian", label: "Russian" },
    { value: "spanish", label: "Spanish" },
    { value: "swedish", label: "Swedish" },
    { value: "thai", label: "Thai" },
    { value: "turkish", label: "Turkish" },
    { value: "vietnamese", label: "Vietnamese" },
    { value: "yiddish", label: "Yiddish" },
  ];

  const customStyles = {
    singleValue: (provided) => ({
      ...provided,
      fontWeight: "bold",
      color: "#1E90FF",
    }),
  };

  const handleModelChange = (model, isChecked) => {
    const updatedModels = isChecked
      ? [...selectedModels, model]
      : selectedModels.filter((m) => m !== model);

    setSelectedModels(updatedModels);
    setFormData({
      ...formData,
      selectedModels: updatedModels,
    });
  };

  const handleInputChange = (e, { name } = {}) => {
    if (name) {
      setFormData({ ...formData, [name]: e.value });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
    setError("");
  };

  const processTranslations = (translationsData) => {
    const groups = translationsData.reduce((acc, item) => {
      const evaluation = JSON.parse(item.evaluation);
      const key = item.inputText;

      if (!acc[key]) {
        acc[key] = { models: {} };
      }

      if (!acc[key].models[item.inputModel]) {
        acc[key].models[item.inputModel] = { details: [] };
      }

      acc[key].models[item.inputModel].details.push({
        score: evaluation.score,
        comment: evaluation.comment,
        translation: item.outputText,
        modelName: item.inputModel,
        evaluatingModelName: item.model,
      });

      return acc;
    }, {});

    return Object.entries(groups)
      .map(([inputText, data]) => {
        const modelsRanked = Object.entries(data.models)
          .sort((a, b) => b[1].details.reduce((sum, detail) => sum + detail.score, 0) - a[1].details.reduce((sum, detail) => sum + detail.score, 0))
          .map(([modelName, modelData]) => ({
            modelName,
            average: modelData.details.reduce((sum, detail) => sum + detail.score, 0) / modelData.details.length,
            details: modelData.details,
          }));

        return { inputText, models: modelsRanked };
      })
      .sort((a, b) => b.models[0].average - a.models[0].average);
  };

  const compareTranslateResponses = async () => {
    try {
      const res = await axios.post("https://geminibackend.onrender.com/compareTranslate", formData);
      const translationsData = res.data.validatedTranslations;
      const processedData = processTranslations(translationsData);

      setEvaluationResults(processedData);

      await addDoc(collection(db, "comparisons"), {
        ...formData,
        comparison: processedData,
        timestamp: serverTimestamp(),
      });

      fetchStoredComparisons(); // Fetch stored comparisons again to update the list
    } catch (err) {
      console.error(err);
      setError("An error occurred while comparing translations.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStoredComparisons = async () => {
    try {
      const q = query(collection(db, "comparisons"), where("message", "==", formData.message));
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map((doc) => doc.data());
      setStoredComparisons(results);
    } catch (err) {
      console.error("Error fetching stored comparisons:", err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }

    const wordCount = formData.message.trim().split(/\s+/).length;
    if (wordCount > 40) {
      setError("The message must be less than 40 words.");
      return;
    }

    if (selectedModels.length === 0) {
      setError("Please select at least one model for comparison.");
      return;
    }

    setIsLoading(true);
    await compareTranslateResponses();
  };

  return (
    <div className="container">
      <h1>Compare Translations</h1>

      <form onSubmit={handleSubmit}>
        <div className="temperatureChoices">
          <input
            type="radio"
            id="serious"
            name="temperatureValue"
            value="0.3"
            defaultChecked={formData.temperatureValue === 0.3}
            onChange={handleInputChange}
          />
          <label htmlFor="serious">Serious</label>

          <input
            type="radio"
            id="mild"
            name="temperatureValue"
            value="0.9"
            onChange={handleInputChange}
          />
          <label htmlFor="mild">Mild</label>
        </div>

        <div className="translation-options">
          <div className="source-language">
            <label>From</label>
            <Select
              id="sourceLanguage"
              name="sourceLanguage"
              options={languageOptions}
              onChange={(selectedOption) => handleInputChange(selectedOption, { name: "sourceLanguage" })}
              defaultValue={languageOptions.find((option) => option.value === formData.sourceLanguage)}
              styles={customStyles}
            />
          </div>
          <div className="destination-language">
            <label>To</label>
            <Select
              id="destinationLanguage"
              name="destinationLanguage"
              options={languageOptions}
              onChange={(selectedOption) => handleInputChange(selectedOption, { name: "destinationLanguage" })}
              defaultValue={languageOptions.find((option) => option.value === formData.destinationLanguage)}
              styles={customStyles}
            />
          </div>
        </div>

        <textarea
          id="message"
          name="message"
          placeholder="Enter the message"
          onChange={handleInputChange}
          value={formData.message}
        />

        <h4>Select models:</h4>
        {Object.keys(models).map((model) => (
          <label key={model}>
            <input
              type="checkbox"
              checked={selectedModels.includes(models[model])}
              onChange={(e) => handleModelChange(models[model], e.target.checked)}
            />
            {model}
          </label>
        ))}

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? <BeatLoader size={8} color={"#123abc"} loading={isLoading} /> : "Compare Translations"}
        </button>
      </form>

      {evaluationResults.length > 0 && (
        <div className="evaluation-results">
          <h2>Evaluation Results</h2>
          {evaluationResults.map((result, index) => (
            <div key={index} className="evaluation-group">
              <h3>Input Text: {result.inputText}</h3>
              {result.models.map((model, modelIndex) => (
                <div key={modelIndex} className="model-evaluation">
                  <h4>Model: {model.modelName}</h4>
                  <p>Average Score: {model.average.toFixed(2)}</p>
                  <div className="details">
                    {model.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="evaluation-detail">
                        <p>Evaluating Model: {detail.evaluatingModelName}</p>
                        <p>Score: {detail.score}</p>
                        <p>Comment: {detail.comment}</p>
                        <p>Translation: {detail.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {storedComparisons.length > 0 && (
        <div className="stored-comparisons">
          <h2>Stored Comparisons</h2>
          {storedComparisons.map((comparison, index) => (
            <div key={index} className="comparison-group">
              <h3>Source: {comparison.sourceLanguage} → {comparison.destinationLanguage}</h3>
              <p>Message: {comparison.message}</p>
              <div className="comparison-results">
                {comparison.comparison.map((result, resultIndex) => (
                  <div key={resultIndex} className="stored-comparison">
                    <h4>Input Text: {result.inputText}</h4>
                    {result.models.map((model, modelIndex) => (
                      <div key={modelIndex} className="stored-model">
                        <h5>Model: {model.modelName}</h5>
                        <p>Average Score: {model.average.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompareTranslate;
