import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Container, Form, Card, Row, Col, Badge, Button } from "react-bootstrap";

const TextCorrectionInput = () => {
  const [inputText, setInputText] = useState("");
  const [corrections, setCorrections] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wordRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const timeoutRef = useRef(null);

  // Debounced API Call
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (inputText.trim()) {
      timeoutRef.current = setTimeout(() => {
        axios
          .post("http://localhost:8000/review", { input_text: inputText })
          .then((response) => {
            let tokenSuggestions = {};
            response.data.doc.paragraphs.forEach((paragraph) => {
              paragraph.sentences.forEach((sentence) => {
                sentence.tokens.forEach((token) => {
                  if (token.suggestions && Object.keys(token.suggestions).length > 0) {
                    tokenSuggestions[token.source] = Object.values(token.suggestions);
                  }
                });
              });
            });
            setCorrections(tokenSuggestions);
          })
          .catch((error) => console.error("Error fetching corrections:", error));
      }, 500);
    }


  }, [inputText]);

  // Detect clicks outside suggestion box
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

  const handleWordClick = (word, event) => {
    if (corrections[word]) {
      setSelectedWord(word);
      setSuggestions(corrections[word]);
      setShowSuggestions(true);

      if (event.target) {
        wordRef.current = event.target;
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText((prevText) => {
      const words = prevText.split(/(\s+)/);
      const newWords = words.map((word) =>
        word.replace(/\W/g, "") === selectedWord ? suggestion : word
      );
      return newWords.join("");
    });

    setSelectedWord(null);
    setSuggestions([]);
    setShowSuggestions(false);
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
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="d-flex">
          <Card className="p-3 border-success shadow-sm flex-fill">
            <Card.Body>
              <Form.Label className="fw-bold">Corrected Text:</Form.Label>
              <div className="p-3 bg-light rounded" style={{ fontSize: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "300px", overflowY: "auto"}}>
                {inputText.split(/(\s+)/).map((word, index) => {
                  const cleanedWord = word.replace(/\W/g, "");

                  return corrections[cleanedWord] ? (
                    <span key={index} className="position-relative">
                      <Badge
                        bg="danger"
                        className="px-2 py-1 me-1"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => handleWordClick(cleanedWord, e)}
                        ref={selectedWord === cleanedWord ? wordRef : null}
                      >
                        {word}
                      </Badge>

                      {showSuggestions && selectedWord === cleanedWord && (
                        <div
                          ref={suggestionBoxRef}
                          className="position-absolute bg-white border shadow rounded p-2"
                          style={{
                            zIndex: 1000,
                            width: "auto",
                            minWidth: "max-content",
                            maxWidth: "200px", // Adjust this as needed
                            top: "100%",
                            left: 0,
                            whiteSpace: "nowrap", // Prevents line breaks
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {suggestions.map((suggestion, idx) => (
                            <Button
                              key={idx}
                              variant="light"
                              className="d-block w-100 text-start"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
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
