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
  const [realWords, setRealWords] = useState([]);

  const wordRef = useRef(null);
  const suggestionBoxRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleSubmit = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (inputText.trim()) {
      setLoading(true);
      setError(null);

      timeoutRef.current = setTimeout(() => {
        axios
          .post("http://localhost:8000/review", { input_text: inputText })
          .then((response) => {
            let tokenSuggestions = {};
            let tokenRealWords = [];

            response.data.paragraphs.forEach((paragraph) => {
              paragraph.sentences.forEach((sentence) => {
                let newTokens = [];
                let prevToken = null;

                sentence.tokens.forEach((token) => {
                  if (prevToken && (token.word_type === 5 || token.word_type === 6)) {
                    let mergedWord = prevToken.source + "'" + token.source;
                    let newSuggestions = {};

                    Object.keys(prevToken.suggestions).forEach((key) => {
                      newSuggestions[key] = prevToken.suggestions[key] + "'" + token.source;
                    });

                    newTokens.pop(); // Remove previous token
                    newTokens.push({ source: mergedWord, suggestions: newSuggestions });
                    prevToken = null;
                  } else if(token.word_type === 3) {
                    let mergedWord = prevToken.source + token.source;
                    let mergedWordType = prevToken.word_type;
                    let newSuggestions = {};

                    Object.keys(prevToken.suggestions).forEach((key) => {
                      newSuggestions[key] = prevToken.suggestions[key] + token.source;
                    });

                    newTokens.pop(); // Remove previous token
                    newTokens.push({ source: mergedWord, word_type: mergedWordType, suggestions: newSuggestions });
                    prevToken = null;
                  } else {
                    newTokens.push(token);
                    prevToken = token;
                  }
                });

                newTokens.forEach((token) => {
                  if ((token.suggestions && Object.keys(token.suggestions).length > 0) || (token.word_type === 2) || (token.word_type === 7)) {
                    var firstChar = token.source.substring(0, 1);
                    if (firstChar === firstChar.toUpperCase()) {
                        Object.keys(token.suggestions).forEach((key) => {
                          token.suggestions[key] = token.suggestions[key].substring(0, 1).toUpperCase() + token.suggestions[key].substring(1, token.suggestions[key].length);
                        });
                    }

                    if (!tokenSuggestions[token.source]) {
                      tokenSuggestions[token.source] = [];
                    }

                    if (token.word_type === 7) {
                        tokenRealWords.push(token.source);
                    }

                    tokenSuggestions[token.source].push(Object.values(token.suggestions).flat());
                  }
                });
              });
            });

            setRealWords(tokenRealWords);
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
  };

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
      // Ensure suggestions is always an array
      const wordCorrections = corrections[word][index];
      setSuggestions(Array.isArray(wordCorrections) ? wordCorrections : []);
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
                disabled={loading}
              />
              <small className="text-muted">{inputText.length}/5000 characters</small>
              <Button
                variant="primary"
                onClick={handleSubmit}
                className="mt-2 w-100"
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Submit"}
              </Button>
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
                  const correction = corrections[cleanedWord] && corrections[cleanedWord][wordOccurrenceIndex];

                  const isRealWord = realWords.some(realWord => {
                    if (realWord === cleanedWord) {
                      return true;
                    }
                    return false;
                  });

                  console.log(isRealWord);

                  return corrections[cleanedWord] ? (
                    <span key={index} className="position-relative">
                      { isRealWord && correction.length > 0 ? (
                        <Badge bg="warning" className="px-2 py-1 me-1" style={{ cursor: "pointer" }} onClick={(e) => handleWordClick(cleanedWord, wordOccurrenceIndex, e)}>
                          {word}
                        </Badge>
                      ) : isRealWord ? (
                        <Badge bg="info" className="px-2 py-1 me-1" style={{ cursor: "pointer" }}>
                          {word}
                        </Badge>
                      ) : correction && correction.length > 0 ? (
                        <Badge bg="danger" className="px-2 py-1 me-1" style={{ cursor: "pointer" }} onClick={(e) => handleWordClick(cleanedWord, wordOccurrenceIndex, e)}>
                          {word}
                        </Badge>
                      ) : (
                        <Badge bg="danger" className="px-2 py-1 me-1" style={{ cursor: "pointer" }}>
                          {word}
                        </Badge>
                      )}

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