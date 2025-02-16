import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Form, Dropdown } from "react-bootstrap";

const TextCorrectionInput = () => {
  const [text, setText] = useState("");
  const [corrections, setCorrections] = useState(new Map());
  const [selectedWord, setSelectedWord] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (text.trim()) {
      axios
        .post("http://localhost:8080/api/process1", { text })
        .then(response => {
          console.log("Backend Response:", response.data.doc);

          let paragraphs = response.data.doc.paragraphs;
          let input = "";
          let token_suggestion = new Map();

          paragraphs.forEach(paragraph => {
            paragraph.sentences.forEach(sentence => {
              sentence.tokens.forEach(token => {
                input += " " + token.source;

                if (token.suggestions) {
                  let suggestion_list = token.suggestions;
                  let newSuggestions = [];

                  for (let i = 0; i <= 8; i++) {
                    if (suggestion_list[`value${i}`]) {
                      newSuggestions.push(suggestion_list[`value${i}`]);
                    }
                  }

                  if (newSuggestions.length > 0) {
                    token_suggestion.set(token.source, newSuggestions);
                  }
                }
              });
            });
          });

          console.log("Token Suggestions:", token_suggestion);
          setCorrections(token_suggestion);
        })
        .catch(error => console.error("Error fetching corrections:", error));
    }
  }, [text]);

  const handleWordClick = (word) => {
    if (corrections.has(word)) {
      setSelectedWord(word);
      setSuggestions(corrections.get(word) || []);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const regex = new RegExp(`\\b${selectedWord}\\b`, "g");
    setText((prevText) => prevText.replace(regex, suggestion));
    setSelectedWord(null);
    setSuggestions([]);
  };

  return (
    <Container className="mt-4">
      <h3 className="text-primary">Spell Checker</h3>

      <Form.Control
        as="textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mb-3 border border-primary p-2"
        style={{ fontSize: "16px" }}
      />

      <p style={{ fontSize: "18px" }}>
        {text.split(/\s+/).map((word, index) => {
          const cleanedWord = word.replace(/[.,]/g, "");
          return (
            <span
              key={index}
              className={corrections.has(cleanedWord) ? "text-danger fw-bold" : ""}
              style={{ cursor: corrections.has(cleanedWord) ? "pointer" : "default", marginRight: "5px" }}
              onClick={() => handleWordClick(cleanedWord)}
            >
              {word}{" "}
            </span>
          );
        })}
      </p>

      {selectedWord && (
        <Dropdown show>
          <Dropdown.Toggle variant="warning" id="dropdown-basic">
            Suggestions for "{selectedWord}"
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {suggestions.map((suggestion, index) => (
              <Dropdown.Item key={index} onClick={() => handleSuggestionClick(suggestion)}>
                {suggestion}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      )}
    </Container>
  );
};

export default TextCorrectionInput;