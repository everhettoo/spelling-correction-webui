import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Form, Card, Row, Col, Badge, Button } from "react-bootstrap";

const TextCorrectionInput = () => {
  const [inputText, setInputText] = useState("");
  const [corrections, setCorrections] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (inputText.trim()) {
      axios
        .post("http://localhost:8000/review", { input_text: inputText })
        .then(response => {
          let tokenSuggestions = {};
          response.data.doc.paragraphs.forEach(paragraph => {
            paragraph.sentences.forEach(sentence => {
              sentence.tokens.forEach(token => {
                if (token.suggestions && Object.keys(token.suggestions).length > 0) {
                  tokenSuggestions[token.source] = Object.values(token.suggestions);
                }
              });
            });
          });
          setCorrections(tokenSuggestions);
        })
        .catch(error => console.error("Error fetching corrections:", error));
    }
  }, [inputText]);

  const handleWordClick = (word) => {
    if (corrections[word]) {
      setSelectedWord(word);
      setSuggestions(corrections[word]);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText((prevText) => {
      const regex = new RegExp(`\\b${selectedWord}\\b`, "g");
      return prevText.replace(regex, suggestion);
    });
    setSelectedWord(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <Container className="mt-4">
      <h3 className="text-primary text-center">Spell Checker (NLTK)</h3>
      <Row className="d-flex align-items-stretch">
        <Col md={6} className="d-flex">
          <Card className="p-3 border-primary shadow-sm flex-fill">
            <Card.Body>
              <Form.Label className="fw-bold">Enter Text:</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={inputText}
                onChange={(e) => {
                  if (e.target.value.length <= 5000) {
                    setInputText(e.target.value);
                  }
                }}
                className="mb-3 border border-primary p-2"
                style={{ fontSize: "16px" }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
              <small className="text-muted">{inputText.length}/5000 characters</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="d-flex">
          <Card className="p-3 border-success shadow-sm flex-fill">
            <Card.Body>
              <Form.Label className="fw-bold">Corrected Text:</Form.Label>
              <div className="p-3 bg-light rounded" style={{ fontSize: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {inputText.split(/(\s+)/).map((word, index) => {
                  const cleanedWord = word.replace(/[^a-zA-Z]/g, "");
                  return corrections[cleanedWord] ? (
                    <span key={index} className="position-relative">
                      <Badge
                        bg="danger"
                        className="px-2 py-1 me-1"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleWordClick(cleanedWord)}
                      >
                        {word}
                      </Badge>
                      {showSuggestions && selectedWord === cleanedWord && (
                        <div className="position-absolute bg-white border shadow rounded p-2" style={{ zIndex: 1000 }}>
                          {suggestions.map((suggestion, idx) => (
                            <Button key={idx} variant="light" className="d-block w-100 text-start" onClick={() => handleSuggestionClick(suggestion)}>
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </span>
                  ) : (
                    <span key={index}>{word}</span>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TextCorrectionInput;
