import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Container, Form, Card, Row, Col, Badge, Button, Spinner, Alert } from "react-bootstrap";

const TextCorrectionInput = () => {
  const [inputText, setInputText] = useState("");
  const [corrections, setCorrections] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const wordRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (inputText.trim()) {
      setLoading(true);
      setError(null);

      timeoutRef.current = setTimeout(() => {
        axios
          .post("http://localhost:8000/review", { input_text: inputText })
          .then((response) => {
            let tokenSuggestions = {};

            response.data.doc.paragraphs.forEach((paragraph) => {
              paragraph.sentences.forEach((sentence) => {
                sentence.tokens.forEach((token) => {
                  if (token.suggestions && Object.keys(token.suggestions).length > 0) {
                    if (!tokenSuggestions[token.source]) {
                      tokenSuggestions[token.source] = [];
                    }
                    tokenSuggestions[token.source].push(Object.values(token.suggestions).flat());
                  }
                });
              });
            });

            setCorrections(tokenSuggestions);
            setLoading(false);
          })
          .catch((error) => {
            setError("Failed to fetch corrections. Please try again.");
            setLoading(false);
            console.error("Error fetching corrections:", error);
          });
      }, 500);
    }
  }, [inputText]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target) &&
        wordRef.current !== event.target
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion) => {
    setInputText((prevText) => {
      const words = prevText.split(/(\s+)/);
      let occurrenceCount = 0;

      const updatedWords = words.map((word, index) => {
        if (word.trim() === selectedWord) {
          if (occurrenceCount === selectedWordIndex) {
            occurrenceCount++;
            return suggestion;
          }
          occurrenceCount++;
        }
        return word;
      });

      return updatedWords.join("");
    });

    setSelectedWord(null);
    setShowSuggestions(false);
  };

  const handleWordClick = (word, index, event) => {
    if (corrections[word]) {
      setSelectedWord(word);
      setSelectedWordIndex(index);
      setSuggestions(corrections[word][index] || []);
      setShowSuggestions(true);
      wordRef.current = event.target;
    }
  };

  return (
    <Container className="mt-4">
      <h3 className="text-primary text-center">Spell Checker</h3>
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
              {loading && (
                <div className="mt-3 text-center">
                  <Spinner animation="border" variant="primary" />
                  <p className="text-muted">Checking text...</p>
                </div>
              )}
              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="d-flex">
          <Card className="p-3 border-success shadow-sm flex-fill">
            <Card.Body>
              <Form.Label className="fw-bold">Corrected Text:</Form.Label>
              <div className="p-3 bg-light rounded" style={{ fontSize: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word", minHeight: "300px", maxHeight: "300px", overflowY: "auto" }}>
                {inputText.split(/(\s+)/).map((word, index) => {
                  const cleanedWord = word.trim();
                  const wordOccurrenceIndex = inputText.split(/(\s+)/).slice(0, index).filter(w => w.trim() === cleanedWord).length;

                  return corrections[cleanedWord] ? (
                    <span key={index} className="position-relative">
                      <Badge bg="danger" className="px-2 py-1 me-1" style={{ cursor: "pointer" }} onClick={(e) => handleWordClick(cleanedWord, wordOccurrenceIndex, e)}>
                        {word}
                      </Badge>
                      {showSuggestions && selectedWord === cleanedWord && selectedWordIndex === wordOccurrenceIndex && (
                        <div ref={suggestionBoxRef} className="position-absolute bg-white border shadow rounded p-2" style={{ zIndex: 1000, width: "auto", minWidth: "max-content", maxWidth: "200px", maxHeight: "120px", overflowY: "auto", top: "100%", left: 0 }}>
                          {suggestions.length > 0 ? suggestions.map((suggestion, idx) => (
                            <Button key={idx} variant="light" className="d-block w-100 text-start" onClick={() => handleSuggestionClick(suggestion)}>
                              {suggestion}
                            </Button>
                          )) : <p className="text-muted p-2">No suggestions</p>}
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